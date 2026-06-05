# Supabase + Prisma Setup

This guide gets a teammate from a fresh clone to a working local
backend connected to our shared Supabase Postgres database.

Our current setup:

- Supabase hosts Postgres and Auth.
- Prisma owns the app schema in `prisma/schema.prisma`.
- Prisma migrations live in `prisma/migrations`.
- The Next backend talks to Supabase through Prisma.
- The React frontend calls backend `/api/...` routes. It should
  not use the database password.

Last checked against current docs: May 11, 2026.

## 1. Prerequisites

Install these before starting:

- Node.js 20.19 or newer
- npm
- Git
- Supabase project invite accepted
- Supabase CLI, recommended for project linking and database
  advisors

Install the Supabase CLI:

```bash
brew install supabase/tap/supabase
```

Or with npm:

```bash
npm install -g supabase
```

Verify:

```bash
supabase --version
```

## 2. Pull The Repo

Start from the project root.

```bash
git switch main
git pull origin main
```

Install dependencies:

```bash
npm ci
npm ci --prefix packages/backend
npm ci --prefix packages/react-frontend
```

## 3. Get Supabase Access

1. Create or sign in to your Supabase account.
2. Accept the invite to our project.
3. Get these values from the project owner or the Supabase
   Dashboard:

- Project ref
- Database password
- Supavisor session pooler connection string

In Supabase, click **Connect** in the project dashboard and look
for the pooler connection string. For local development with
Prisma, use the **session pooler** string that ends in port
`5432`.

Do not use the transaction pooler on port `6543` for this local
setup unless we deliberately switch to that deployment mode
later.

## 4. Create `.env.local`

Create a file named `.env.local` in the repo root. Never commit
it.

Template:

```env
DATABASE_URL="postgresql://postgres.<project-ref>:<url-encoded-password>@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres.<project-ref>:<url-encoded-password>@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
```

Use the exact host/region from your Supabase dashboard. The
example above uses `aws-1-us-east-1`, but your dashboard string
is the source of truth.

If your password contains symbols such as `@`, `#`, `/`, `?`,
`:`, `%`, `&`, or `+`, URL-encode it before putting it in the
connection string.

Interactive encoder:

```bash
node -e 'const readline=require("readline");const rl=readline.createInterface({input:process.stdin,output:process.stdout});rl.question("DB password: ",p=>{console.log(encodeURIComponent(p));rl.close();})'
```

Example:

```txt
raw password:     my@pass/word#123
encoded password: my%40pass%2Fword%23123
```

Security rules:

- Do not put `DATABASE_URL`, `DIRECT_URL`, the database
  password, or a service role key in frontend env vars.
- Do not use `NEXT_PUBLIC_` or `VITE_` for secrets.
- Do not paste secrets into committed docs, issues, screenshots,
  or PR descriptions.

## 5. Validate Prisma

From the repo root:

```bash
npx prisma validate
```

Generate the backend Prisma client:

```bash
npm run prisma:generate --prefix packages/backend
```

Check migration status:

```bash
npx prisma migrate status
```

If the database is already up to date, you are good. If Prisma
reports pending migrations, coordinate in the group chat before
applying them to the shared Supabase database.

Apply pending migrations only when the team agrees:

```bash
npx prisma migrate dev
```

## 6. Link The Supabase CLI

The app can run with just `.env.local`, but linking the CLI is
useful for database advisors and project commands.

```bash
supabase login
supabase link --project-ref <project-ref>
```

The CLI creates local files under `supabase/.temp/`; those are
intentionally ignored by Git.

Run database advisors after migrations:

```bash
supabase db advisors --linked --level warn
```

The expected result after our current migrations is:

```txt
No issues found
```

## 7. Run The App

Start the backend first. The frontend Vite config proxies `/api`
to `http://127.0.0.1:3000`, so keep the backend on port `3000`
unless you also update the proxy.

```bash
npm run dev --prefix packages/backend
```

In another terminal:

```bash
npm run dev --prefix packages/react-frontend
```

Run verification:

```bash
npm test --prefix packages/backend
npm run build --prefix packages/backend
npm test --prefix packages/react-frontend
npm run build --prefix packages/react-frontend
```

## 8. How Schema Changes Work

Do not create or edit app tables directly in the Supabase
Dashboard table editor. Dashboard-only changes are easy to lose
because they are not in Git.

Use this workflow instead:

```bash
git switch main
git pull origin main
```

Edit:

```txt
prisma/schema.prisma
```

Create a reviewable migration:

```bash
npx prisma migrate dev --create-only --name describe_the_change
```

Review the generated SQL in
`prisma/migrations/.../migration.sql`.

Apply it when ready:

```bash
npx prisma migrate dev
```

Then verify:

```bash
npx prisma validate
npm test --prefix packages/backend
npm run build --prefix packages/backend
supabase db advisors --linked --level warn
```

Commit both files:

```txt
prisma/schema.prisma
prisma/migrations/<timestamp>_<name>/migration.sql
```

## 9. RLS And Data API Rules

All current app tables are in `public` and have Row Level
Security enabled.

Right now we intentionally do not rely on direct frontend table
access through `supabase-js`. The frontend should call backend
API routes, and the backend should use Prisma.

If we later expose tables through Supabase's Data API, we must
update migrations with all three pieces together:

```sql
grant select, insert, update, delete on public.your_table to authenticated;
alter table public.your_table enable row level security;
create policy "policy name"
on public.your_table
for select
to authenticated
using (auth.uid() = user_id);
```

This matters because Supabase is changing default table exposure
behavior in 2026. New public tables may not be reachable through
the Data API unless explicit grants exist. RLS still controls
rows, but grants control whether a role can access the table at
all.

## 10. Current Backend API Slice

Protected routes use a Supabase bearer token:

```txt
Authorization: Bearer <access-token>
```

The main deployed backend routes are:

```txt
POST   /api/auth/password/signup
POST   /api/auth/password/signin
POST   /api/auth/password/change
POST   /api/auth/session/refresh
PATCH  /api/auth/account
DELETE /api/auth/account

POST   /api/profiles
GET    /api/profiles/me
GET    /api/profiles/:profileId
GET    /api/profile/constraints
PATCH  /api/profile/constraints

GET    /api/groups
POST   /api/groups
GET    /api/groups/:groupId
GET    /api/groups/:groupId/members
GET    /api/groups/:groupId/settings
PATCH  /api/groups/:groupId/settings
POST   /api/groups/join

GET    /api/ingredients
POST   /api/ingredients
PATCH  /api/ingredients/:ingredientId
DELETE /api/ingredients/:ingredientId
GET    /api/ingredients/catalog

GET    /api/groups/:groupId/bundle-candidates
POST   /api/groups/:groupId/bundle-candidates/more
POST   /api/groups/:groupId/bundle-candidates/select

GET    /api/notifications
POST   /api/notifications/read
GET    /api/spoonacular/definitions
GET    /api/spoonacular/mode
```

Example:

```bash
curl http://localhost:3000/api/ingredients \
  -H "Authorization: Bearer <access-token>"
```

## 11. Troubleshooting

### `P1013 The provided database string is invalid`

Your connection string is malformed. Common causes:

- Password is not URL-encoded.
- Missing host.
- Missing username prefix like `postgres.<project-ref>`.
- Quotes are mismatched in `.env.local`.

### `P1001 Can't reach database server`

Check:

- You are using the dashboard's current pooler host.
- The port is `5432` for this setup.
- You are online and not blocked by VPN/firewall.

### `P4001 The introspected database was empty`

This means Prisma connected successfully, but the database had
no tables. On a fresh project, that is expected before
migrations are applied.

### `PrismaClient needs to be constructed with a valid PrismaClientOptions`

Prisma 7 requires a database adapter. Our backend uses
`@prisma/adapter-pg` in `packages/backend/src/lib/prisma.ts`.
Run:

```bash
npm ci --prefix packages/backend
npm run prisma:generate --prefix packages/backend
```

### `permission denied for table ...`

If this comes from direct Supabase Data API access, the table
probably lacks grants or RLS policies. For the current app,
prefer calling backend API routes instead of accessing tables
directly from the frontend.

### `vitest: command not found`

Install package dependencies:

```bash
npm ci --prefix packages/backend
```

### The frontend API calls fail in dev

Make sure the backend is running on port `3000`. The frontend
proxy expects:

```txt
http://127.0.0.1:3000
```

## References

- Supabase Prisma guide:
  https://supabase.com/docs/guides/database/prisma
- Supabase CLI reference:
  https://supabase.com/docs/reference/cli/introduction
- Supabase changelog, Data API grants change:
  https://supabase.com/changelog
- Prisma Client setup:
  https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/introduction
