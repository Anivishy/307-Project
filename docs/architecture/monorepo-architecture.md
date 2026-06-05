# Monorepo Architecture

Last updated: June 5, 2026

RecipeCollab is organized as a small monorepo with separate frontend and backend packages plus shared database schema artifacts. The frontend owns browser interaction and view state; the backend owns authentication enforcement, domain services, and database access; Prisma owns the database model and migrations applied to Supabase Postgres.

## Package Responsibilities

| Path | Responsibility |
| --- | --- |
| `packages/react-frontend` | Vite/React app, routing, UI components, page workflows, authenticated API client helpers, and frontend tests. |
| `packages/backend` | Next.js API routes, Supabase Auth integration, Prisma-backed services, recipe generation adapters, validation, and backend service tests. |
| `prisma` | Canonical schema, migrations, and generated Prisma client configuration. |
| `docs` | Architecture notes, access-control documentation, UML source, and UI prototype artifacts. |
| `supabase` | Supabase CLI configuration for local project workflows. |

## Runtime Flow

1. A user signs up or signs in through the React app.
2. The frontend calls backend `/api/auth/...` routes.
3. The backend delegates credential/session work to Supabase Auth and returns a serialized session.
4. Authenticated frontend requests include `Authorization: Bearer <access token>`.
5. Backend route handlers validate the bearer token, call service modules, and scope reads/writes to the authenticated profile or group membership.
6. Service modules use Prisma to read and update Supabase Postgres tables.
7. The frontend renders group, pantry, profile, notification, and bundle-generation state from backend JSON responses.

## Backend Design

The backend keeps route handlers thin. Handlers parse request data and call services in `src/lib`, while services implement reusable behavior such as:

- `auth-service.ts` and `supabase-auth.ts`: password auth, OTP/magic-link support, session refresh, account updates, and Supabase token validation.
- `profile-service.ts` and `profile-constraints-service.ts`: profile identity, hard constraints, and soft preferences.
- `group-service.ts`, `group-membership-service.ts`, and `group-settings-service.ts`: group CRUD, invite joins, roles, and generation settings.
- `ingredient-service.ts` and `ingredient-catalog-service.ts`: pantry CRUD and ingredient typeahead.
- `notification-service.ts`: notification persistence and read state.
- `generation/*`: group context loading, bundle candidate storage, generation orchestration, validation, and persisted selection behavior.

## Frontend Design

The frontend uses React pages for main workflows and smaller reusable components for repeated UI patterns:

- Pages: sign-in, auth callback, groups, group detail, pantry, profile, recipes, favorites, add recipe, and approvals.
- Components: app layout, bottom navigation, recipe cards, bundle candidate cards, notification bell, ingredient typeahead, search/filter controls, tag inputs, and status messages.
- API helpers in `src/lib` centralize session loading, auth headers, API response handling, and feature-specific request functions.

## Database Model

Supabase Postgres stores users' app data through Prisma models:

- `Profile`
- `Ingredient`
- `Group`
- `GroupMember`
- `MenuRequest`
- `Menu`
- `Recipe`
- `RecipeIngredient`
- `Notification`

The UML class diagram source is committed at [class-diagram.mmd](class-diagram.mmd), and the rendered Markdown version is documented in [class-diagram.md](class-diagram.md).

## Security Boundary

The browser never connects directly to the database. It talks to backend API routes, and the backend validates Supabase access tokens before service calls. Prisma migrations enable Row Level Security on app tables, and secret values are read from local or deployment environment variables instead of committed files.

## Testing And CI

Backend tests cover model/service behavior such as auth, group creation, pantry CRUD, constraints, settings, notifications, generation, and candidate selection. Frontend tests cover non-trivial components and page workflows with Vitest and Testing Library. The CI workflow runs Prisma validation, backend tests/build, frontend tests/lint/build, and uses mock generation settings so external API keys are not required.
