# RecipeCollab Frontend + Supabase Auth Baseline

This orphan branch intentionally keeps only the React frontend and the Supabase authentication backend from `main`.

Kept backend scope:

- `packages/backend/src/app/api/auth/**`
- Supabase auth/session services
- profile persistence used by auth
- backend `.env` / `.env.local` loading
- a minimal Prisma `Profile` schema and auth baseline migration

The real `.env` and `.env.local` files stay ignored. Copy `.env.local.example` to `.env.local` locally and fill in the Supabase and database values.

## Run

```bash
npm install
npm install --prefix packages/backend
npm install --prefix packages/react-frontend
npm run dev --prefix packages/backend
npm run dev --prefix packages/react-frontend
```

Run the root install first because Prisma resolves `@prisma/client` from the root `prisma/schema.prisma` location.

The Vite frontend proxies `/api` requests to the Next backend on `http://127.0.0.1:3000`.
