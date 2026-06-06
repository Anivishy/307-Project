# Architecture & Monorepo Structure

_Last updated: June 5, 2026_

RecipeCollab is organized as a **TypeScript npm-workspace monorepo**. The code
is split into two deployable packages plus a shared data layer, and it follows
a **Model–View–Controller (MVC)** separation:

- **Model** — the Prisma schema and the backend `*-service` modules that own all
  database access and domain logic.
- **View** — the React single-page frontend.
- **Controller** — the Next.js API route handlers that translate HTTP requests
  into service calls and shape responses.

## Top-level layout

```
307-Project/
├── packages/
│   ├── backend/            # Next.js API + service/model layer (Model + Controller)
│   └── react-frontend/     # React SPA (View)
├── prisma/                 # Shared schema.prisma + SQL migrations (the schema of record)
├── supabase/               # Supabase CLI config (Postgres + Auth host)
├── docs/                   # This documentation
└── package.json            # Root workspace: Prettier, shared @prisma/client
```

## How architectural modules map to packages

| Architectural module | Where it lives | Notes |
| --- | --- | --- |
| **Domain model / schema** | `prisma/schema.prisma` + `prisma/migrations/` | Single source of truth for all tables. Generates a typed Prisma client into `packages/backend/src/generated/prisma`. See the [UML class diagram](uml-class-diagram.md). |
| **Service / model layer (M)** | `packages/backend/src/lib/*-service.ts` | All database reads/writes and business rules. Routes never touch Prisma directly. These modules are the primary unit-test target. |
| **API controllers (C)** | `packages/backend/src/app/api/**/route.ts` | Next.js App Router handlers. Thin: parse/validate input, call a service, return a JSON envelope. |
| **Cross-cutting backend helpers** | `packages/backend/src/lib/http/`, `api-response.ts`, `api-error.ts`, `request-user.ts` | Auth extraction, consistent response/error envelopes, input normalization. |
| **External integrations** | `packages/backend/src/lib/spoonacular/`, `packages/backend/src/lib/generation/` | Spoonacular client + recipe mapping, and the menu/bundle generation orchestrator. Mockable via `SPOONACULAR_MOCK_*` env flags. |
| **View / UI (V)** | `packages/react-frontend/src/pages/`, `components/` | React Router pages and reusable presentational components. |
| **Frontend API clients** | `packages/react-frontend/src/lib/*Api.js` | One module per backend domain (`groupApi`, `pantryApi`, `authApi`, …). The UI never calls `fetch` directly; it goes through these. |
| **Frontend session/state** | `packages/react-frontend/src/lib/session.js` | Stores the Supabase session in `localStorage` and exposes token/profile helpers. |
| **Auth host & DB host** | `supabase/` + Supabase cloud | Supabase provides Postgres and Auth; the backend talks to it through Prisma and the Supabase auth SDK. |

## Backend package (`packages/backend`)

A Next.js app used **only as an API server** (the React frontend is the UI).

```
src/
├── app/
│   ├── api/.../route.ts     # Controllers: HTTP in, JSON out
│   └── route.ts             # Health/root route
├── lib/
│   ├── *-service.ts         # Model layer: profiles, groups, ingredients, notifications, ...
│   ├── http/                # auth() + response helpers shared by routes
│   ├── constraints/         # Dietary-constraint normalization + validation
│   ├── generation/          # Menu/bundle generation orchestration
│   ├── spoonacular/         # External recipe/ingredient client + mappers
│   ├── prisma.ts            # PrismaClient (pg adapter) singleton
│   └── env.ts               # Validated environment access
└── generated/prisma/        # Generated client (git-ignored)
```

**Request flow:** `route.ts` (controller) → `*-service.ts` (model/domain logic)
→ `prisma.ts` → Supabase Postgres. Routes are intentionally thin so the
testable logic lives in services.

## Frontend package (`packages/react-frontend`)

A Vite + React 19 single-page app using React Router.

```
src/
├── App.jsx                  # Route table (views)
├── pages/                   # One component per view (Pantry, Groups, Profile, ...)
├── components/              # Reusable UI (cards, nav, typeahead, notifications)
├── lib/
│   ├── *Api.js              # Typed fetch wrappers per backend domain
│   ├── session.js           # Session persistence + token helpers
│   └── httpResponse.js      # Shared response unwrapping
└── styles/                  # Global CSS
```

In development, Vite proxies `/api` to the backend on `http://127.0.0.1:3000`
(configurable via `VITE_API_PROXY_TARGET`), so the frontend and backend run as
two processes but share an origin from the browser's perspective.

### Views (React Router routes)

Public: `/` (landing), `/signin`, `/signup`, `/auth/callback`, `/join/:inviteCode`.

Inside the app shell (`AppLayout`): `/recipes`, `/recipes/:recipeId`,
`/add-recipe`, `/favorites`, `/pantry`, `/profile`, `/groups`,
`/groups/:groupId`, `/approvals`.

## Shared data layer (`prisma/`)

`schema.prisma` is the single schema of record. Both the local backend and CI
generate the Prisma client from it (`prisma generate --schema
../../prisma/schema.prisma`). Schema changes always go through a reviewable
migration — see [supabase-setup.md](../supabase-setup.md) §8.

## Build, run, and CI

- **Local:** run backend (`next dev`, port 3000) and frontend (`vite`, port
  5173) as separate processes. See the README's Development Environment Setup.
- **CI:** [.github/workflows/ci-testing.yml](../.github/workflows/ci-testing.yml)
  installs all three dependency sets, lints and builds both packages, and runs
  the Vitest suites for each.
- **Deployment:** the backend deploys to Azure / Vercel and the frontend to
  Vercel. See [DEPLOYMENT.md](DEPLOYMENT.md).
