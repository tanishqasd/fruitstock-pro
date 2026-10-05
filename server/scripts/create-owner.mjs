import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const prisma = new PrismaClient();
try {
  const input = z.object({
    name: z.string().trim().min(2),
    email: z.string().trim().email().transform(value => value.toLowerCase()),
    password: z.string().min(10),
    businessName: z.string().trim().min(2)
  }).parse({
    name: process.env.OWNER_NAME,
    email: process.env.OWNER_EMAIL,
    password: process.env.OWNER_PASSWORD,
    businessName: process.env.BUSINESS_NAME || 'FruitStock Wholesale'
  });
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    console.log('Owner already exists; account and password were left unchanged.');
  } else {
    const { password, ...data } = input;
    await prisma.user.create({ data: { ...data, passwordHash: await bcrypt.hash(password, 12) } });
    console.log('Owner created. Sign in with the OWNER_EMAIL and OWNER_PASSWORD you supplied.');
  }
} catch (error) {
  console.error(error instanceof z.ZodError
    ? 'Set OWNER_NAME, a valid OWNER_EMAIL, and OWNER_PASSWORD (at least 10 characters).'
    : 'Owner setup failed. Check database connectivity and apply migrations first.');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
