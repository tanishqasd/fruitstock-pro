# FruitStock Wholesale

React/Vite frontend and Express/Prisma/PostgreSQL backend in one npm workspace. In production, Express serves `client/dist` and `/api` on the same public domain.

## Local development

Use Node.js 22 and npm 10. From the repository root:

```powershell
Copy-Item server/.env.example server/.env
# Set DATABASE_URL and JWT_SECRET in server/.env.
npm ci
npm run db:generate
npm run db:migrate
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to http://localhost:4000.

The app includes JWT owner authentication, inventory and stock ledgers, purchases and sales, customer/dealer balances, payments, expenses, and reports. Purchase and sale writes use serializable transactions; stock changes create audit entries.

The backend is checked in as ordinary source files, replacing the unresolved Git submodule pointer. The current frontend's transaction history and customer/dealer detail/edit routes are supported by the backend. Public registration is disabled for this single-business service; administrators provision owner accounts with `npm run db:owner`. Browser-local demo records are no longer used as a fallback for failed API requests.

For a disposable development database only, `npm run db:seed` **deletes all existing records** and creates sample data plus `owner@fruitstock.in` / `demo123`. Demo seeding is disabled when `NODE_ENV=production`.

## Build and run

```powershell
npm run build
npm run typecheck
npm run test:deployment
npm run db:deploy
npm start
```

`npm run build` generates Prisma, compiles only `server/src/**/*.ts` for the backend, and builds React separately with Vite. For local `npm start`, export DATABASE_URL/JWT_SECRET into the process or use a root `.env`; the root command does not load `server/.env`. `npm start --workspace=server` loads `server/.env` instead. Railway injects variables automatically.

The deployment smoke checks use a deliberately unreachable local database, so they never touch live data. They verify startup validation, built pages/assets, JSON API errors, and HTTP 503 when the database is unavailable. Database-backed login and transaction checks still need a reachable PostgreSQL instance. Production sign-in fields are empty; demo credentials are displayed only by the development server.

## Railway deployment

Deploy **the entire repository** as one application service, alongside PostgreSQL:

1. Upload/push these files to the repository connected to the existing Railway application service, or use `railway up` from this directory after linking the intended project/service.
2. Set the application service **Root Directory to `/` (repository root)**, not `/server`. Both client and server are required in the Docker build context.
3. Use the root `Dockerfile` (builder: Dockerfile). Clear any old build command using Corepack/pnpm. The Dockerfile uses `npm ci` with `package-lock.json`, builds both apps, and retains Prisma CLI for migrations.
4. The root `railway.json` defines these settings. If the service does not apply this file, enter them in its settings:
   - Pre-deploy command: `npm run db:deploy`
   - Start command: `node server/dist/index.js`
   - Healthcheck path: `/api/health`, timeout: 120 seconds
5. Set application variables:
   - `DATABASE_URL`: the PostgreSQL service's full connection URL. For PostgreSQL in the same Railway environment, use `${{Postgres.DATABASE_URL}}` (replace `Postgres` with the actual service name). The external proxy hostname alone is insufficient; the URL also needs credentials, database name, and the assigned proxy port.
   - `JWT_SECRET`: a long random secret.
   - `NODE_ENV=production` (also set by the Dockerfile).
   - Optional `CLIENT_URL`: full public origin(s), comma-separated, if restricting CORS.
   - Leave `VITE_API_URL` unset for this combined deployment; requests use `/api` on the current domain.
6. Deploy, then go to Settings → Networking → Generate Domain. Use Railway's assigned `PORT` for the domain target. The server listens on `0.0.0.0` and reads `PORT`; 4000 is only its local fallback.
7. Verify `/`, `/dealers` (including a direct refresh), and `/api/health`. Health returns HTTP 200 only when the frontend entrypoint exists and a Prisma query against the User table succeeds. A database outage or missing schema returns HTTP 503.

The build never connects to or resets PostgreSQL. Only the pre-deploy migration command changes the schema, using committed migrations. It does not seed or delete business records.

### First owner on a clean database

After migrations, set temporary Railway variables `OWNER_NAME`, `OWNER_EMAIL`, `OWNER_PASSWORD` (at least 12 characters), and optional `BUSINESS_NAME`. In the **running service's Railway SSH shell**, run:

```bash
npm run db:owner
```

This creates one owner without touching products, transactions, or existing accounts. Running it again with an existing email preserves that account and password. Remove the temporary owner variables after setup and sign in with your chosen credentials.

### Existing database created with `prisma db push`

If migration deployment reports **P3005** (non-empty database without migration history), verify that the live schema matches the initial migration before baselining it with `prisma migrate resolve --applied 20260828000000_init` from `server`. Do not mark migrations applied if the schemas differ. A database reset needs a separate, explicit decision because it deletes all records.

## Troubleshooting

- Build logs should say Railway detected the Dockerfile. Corepack/pnpm or backend-only builds indicate the service still has the wrong root/build settings or old source files.
- Missing `DATABASE_URL` or `JWT_SECRET` fails production startup with the variable's name; secrets are not logged.
- Prisma connection/authentication errors: verify URL, credentials, port, database name, and reachability from the Railway service.
- Missing JavaScript/CSS receives HTTP 404, rather than HTML masquerading as an asset. Check that the deployed image contains `client/dist`.
- Unknown API routes return JSON errors, rather than the React entrypoint. API network failures, non-JSON responses, and loading errors display a retry message in the UI.
- If the frontend was built elsewhere with a localhost `VITE_API_URL`, rebuild it without that override.

Official Railway references: [Dockerfiles](https://docs.railway.com/builds/dockerfiles), [pre-deploy commands](https://docs.railway.com/deployments/pre-deploy-command), and [configuration reference](https://docs.railway.com/config-as-code/reference).
