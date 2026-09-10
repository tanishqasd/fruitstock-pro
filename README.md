# FruitStock Wholesale

A transaction-first fruit wholesale management system built with React, Node.js, Prisma, and PostgreSQL. Purchases increase inventory and dealer payables; sales decrease inventory and increase customer receivables; every stock and cash movement remains auditable.

## Included

- JWT owner authentication
- Dashboard with sales, purchases, profit, receivables, payables, and stock value
- Fruit master, live inventory, low-stock alerts, and weighted-average costing
- Multi-line purchases and sales with atomic stock updates
- Customer and dealer accounts with outstanding balances
- Separate payment ledger for receipts and dealer payments
- Damage, wastage, and correction ledger
- Expense tracking and business reports
- Responsive desktop and mobile UI
- PostgreSQL migration, seed data, health check, and Railway configuration

## Run locally

Requirements: Node.js 20+, pnpm, and PostgreSQL.

```bash
cp server/.env.example server/.env
# Update DATABASE_URL and JWT_SECRET in server/.env
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open `http://localhost:5173` and sign in with:

- Email: `owner@fruitstock.in`
- Password: `demo123`

The API runs on `http://localhost:4000`. The development web server proxies `/api` automatically.

## Production build

```bash
pnpm typecheck
pnpm build
pnpm start
```

The Express server serves the built React app and API from one process.

## Deploy to Railway

1. Push this repository to GitHub and create a Railway project from the repository.
2. Add a PostgreSQL service to the Railway project.
3. Add these variables to the application service:
   - `DATABASE_URL=${{Postgres.DATABASE_URL}}`
   - `JWT_SECRET=` a long random value
   - `CLIENT_URL=` your Railway public domain, such as `https://fruitstock.up.railway.app`
4. Deploy. `railway.json` installs dependencies, generates Prisma, builds both apps, runs migrations, and starts the server.
5. Run `pnpm db:seed` once from the Railway service shell if you want the demo account and sample records. For a real deployment, replace the demo account immediately.

Railway health checks use `/api/health`.

## Data integrity notes

Purchase and sale creation use serializable database transactions. Sale creation refuses insufficient stock. Product stock is cached for fast dashboards but every change also creates a `StockTransaction`, providing the audit trail needed to reconcile the displayed balance.
