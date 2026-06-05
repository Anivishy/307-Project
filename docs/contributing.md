# Contributing

This repository is a **multi-package monorepo** for the Recipe Collaboration App. It is **not** configured as an npm workspace yet — each package has its own `package.json` and `node_modules`. Install dependencies and run scripts inside the package you are working on.

For architecture, package layout, and request flow, see [monorepo-structure.md](./monorepo-structure.md).

## Repository Layout

```
307-Project/
├── packages/
│   ├── react-frontend/     # Vite + React SPA (client)
│   └── backend/            # Next.js API server
├── prisma/                 # Shared database schema and migrations
├── docs/                   # Architecture and contribution docs
├── .github/workflows/      # CI automation
└── package.json            # Root tooling (Prettier, Prisma CLI)
```

| Package | Stack | Key paths |
|---------|-------|-----------|
| `packages/react-frontend` | Vite, React, React Router | Pages in `src/pages/`, components in `src/components/`, API clients in `src/lib/*Api.js` |
| `packages/backend` | Next.js, TypeScript, Prisma | API routes in `src/app/api/`, business logic in `src/lib/` |
| `prisma/` (root) | PostgreSQL schema | `schema.prisma` and `migrations/` — used by the backend only |

The React SPA talks to the backend over `/api/*`. In local dev, the frontend proxies API requests to the backend (port 3000). In production, two Vercel projects serve the SPA and API behind a single origin.

## Workflow

1. Pull the latest `main` and create a feature branch.
2. Install dependencies in the relevant package(s):
   - `cd packages/react-frontend && npm install`
   - `cd packages/backend && npm install`
   - From the root (optional, for formatting): `npm install`
3. If you change the database schema, update `prisma/schema.prisma` and add a migration. Regenerate the Prisma client:
   - `cd packages/backend && npm run prisma:generate`
4. Make your changes.
5. Run the checks for the area you touched (CI runs all of these on every PR):
   - **Frontend:** `npm run lint`, `npm run build`, `npm test`
   - **Backend:** `npm run lint`, `npm run build`, `npm test`
   - **Repo formatting:** from the root, `npm run format`
6. Commit with a clear message and open a PR with a short summary of what changed and how you tested it.

## Local Development

Run each package in its own terminal:

```bash
# Backend (port 3000)
cd packages/backend && npm install && npm run dev

# Frontend (port 5173; proxies /api to the backend)
cd packages/react-frontend && npm install && npm run dev
```

The backend `predev` and `prebuild` scripts run `prisma generate` automatically. Ensure `packages/backend/.env.local` contains `DATABASE_URL`, `DIRECT_URL`, and Supabase credentials. See [supabase-setup.md](../supabase-setup.md) for first-time setup.

## Where to Put Changes

| Change type | Location |
|-------------|----------|
| UI pages and components | `packages/react-frontend/src/` |
| Frontend API calls | `packages/react-frontend/src/lib/*Api.js` |
| Backend endpoints | `packages/backend/src/app/api/**/route.ts` |
| Business logic | `packages/backend/src/lib/` |
| Database model | `prisma/schema.prisma` + new migration in `prisma/migrations/` |
| Domain model reference | [uml-class-diagram.md](./uml-class-diagram.md) |

Keep route handlers thin — parse the request, call a service in `src/lib/`, and return a JSON response.

## Notes

- Do not edit generated Prisma output in `packages/backend/src/generated/prisma/`.
- Backend tests use Vitest; frontend tests use Vitest + Testing Library.
- Spoonacular integration supports mock modes via backend env vars (`SPOONACULAR_MOCK_CATALOG`, `SPOONACULAR_MOCK_GENERATION`) — see `packages/backend/package.json` `dev:*` scripts.
