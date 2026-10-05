// One-time recovery for the verified legacy deployment: User exists, business tables do not.
// Refuse other database states; never drop tables or overwrite account credentials.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const prisma = new PrismaClient();
const migration = '20260828000000_init';
try {
  const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`;
  const columns = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'User'`;
  const enums = await prisma.$queryRaw`SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_type.oid = pg_enum.enumtypid JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace WHERE nspname = 'public'`;
  const failed = await prisma.$queryRaw`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL`;
  const expectedColumns = ['id', 'name', 'email', 'password', 'createdAt', 'updatedAt'].sort();
  if (JSON.stringify(tables.map(r => r.table_name).sort()) !== JSON.stringify(['User', '_prisma_migrations'].sort())
      || JSON.stringify(columns.map(r => r.column_name).sort()) !== JSON.stringify(expectedColumns)
      || enums.length || failed.length !== 1 || failed[0].migration_name !== migration) {
    throw new Error('Database differs from the verified legacy state; inspect it before recovery.');
  }
  const sql = (await readFile(new URL(`../prisma/migrations/${migration}/migration.sql`, import.meta.url), 'utf8'))
    .replace(/CREATE TABLE "User" \([\s\S]*?\);/, '')
    .replace(/CREATE UNIQUE INDEX "User_email_key"[^;]*;/, '');
  await prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe('ALTER TABLE "User" RENAME COLUMN "password" TO "passwordHash"');
    await tx.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN "businessName" TEXT NOT NULL DEFAULT \'FruitStock Wholesale\'');
    for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) {
      await tx.$executeRawUnsafe(statement);
    }
  }, { timeout: 60000 });
  execFileSync(process.execPath, [fileURLToPath(new URL('../../node_modules/prisma/build/index.js', import.meta.url)),
    'migrate', 'resolve', '--applied', migration, '--schema', fileURLToPath(new URL('../prisma/schema.prisma', import.meta.url))], { stdio: 'inherit' });
  console.log('Legacy migration recovered; account rows preserved. Run npm run db:deploy next.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
