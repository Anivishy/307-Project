# RecipeCollab

RecipeCollab is a collaborative recipe-planning web app for roommates and shared households. Users can create or join groups, maintain personal pantry items, combine group ingredients, save dietary constraints and preferences, and review generated meal bundle candidates that respect group settings such as missing ingredients and pantry staples.

## Project Links

- Deployed app: [https://307-project.vercel.app](https://307-project.vercel.app)
- GitHub repository: [https://github.com/Anivishy/307-Project](https://github.com/Anivishy/307-Project)
- GitHub sprint board: [Repository Projects](https://github.com/Anivishy/307-Project/projects)
- UI prototype: [docs/ui-prototype/recipe-collab-all-frames.svg](docs/ui-prototype/recipe-collab-all-frames.svg), last updated May 1, 2026
- Software Requirements Specification: [SRD.md](SRD.md)
- Architecture documentation: [docs/architecture/monorepo-architecture.md](docs/architecture/monorepo-architecture.md)
- UML class diagram: [docs/architecture/class-diagram.md](docs/architecture/class-diagram.md)
- Authentication and access control: [docs/auth-justification-TE5](docs/auth-justification-TE5)
- Supabase and Prisma setup: [supabase-setup.md](supabase-setup.md)

## Team

- Vinayak Kohli - Product Owner
- Anikait Vishwanathan - Scrum Master
- Kartik M - Customer/Tester
- Leon Oks - Lead Developer

## Tech Stack

- Frontend: Vite, React, React Router, Vitest, Testing Library
- Backend: Next.js API routes, TypeScript, Vitest
- Data and auth: Supabase Auth, Supabase Postgres, Prisma
- Deployment: Vercel

## Monorepo Structure

```txt
packages/react-frontend   Vite/React browser app
packages/backend          Next.js API backend and service tests
prisma                    Prisma schema and database migrations
docs                      Architecture, access-control, and prototype artifacts
supabase                  Local Supabase CLI configuration
```

## Development Setup

Install prerequisites:

- Node.js 20.19 or newer
- npm
- Git
- Supabase project access

Install dependencies from the repository root:

```bash
npm ci
npm ci --prefix packages/backend
npm ci --prefix packages/react-frontend
```

Create `.env.local` in the repository root using the template in [supabase-setup.md](supabase-setup.md). Keep database URLs, Supabase keys, and Spoonacular keys out of Git.

Validate Prisma and generate the backend client:

```bash
npm run prisma:validate
npm run prisma:generate --prefix packages/backend
```

Run the backend on port `3000`:

```bash
npm run dev --prefix packages/backend
```

Run the frontend in a second terminal:

```bash
npm run dev --prefix packages/react-frontend
```

The frontend development server proxies `/api` requests to `http://127.0.0.1:3000`.

## Testing And Verification

Backend service tests:

```bash
npm test --prefix packages/backend
```

Frontend component and page tests:

```bash
npm test --prefix packages/react-frontend
```

Coverage reports:

```bash
npm run test:coverage --prefix packages/backend
npm run test:coverage --prefix packages/react-frontend
```

Testing rubric option used for final submission:

```bash
npm run test:coverage:component --prefix packages/react-frontend
```

This focused report covers the non-trivial `NotificationBell` React component, which manages menu/read state and notification actions.

Full local verification:

```bash
npm run check
```

The GitHub Actions workflow in [.github/workflows/ci-testing.yml](.github/workflows/ci-testing.yml) installs both apps, validates Prisma, runs backend tests, builds the backend, runs frontend tests, lints the frontend, and builds the frontend.

## Security Notes

- Supabase Auth handles password hashing, sessions, refresh tokens, and bearer-token validation.
- The frontend stores only the serialized user session and sends protected API calls with `Authorization: Bearer <access token>`.
- The backend validates Supabase bearer tokens before reading or modifying protected user data.
- Prisma migrations enable Row Level Security on app tables.
- `.env`, `.env.local`, and local override files are ignored; API keys and database credentials must never be committed.

## Submission Notes

Canvas submission should include the final presentation slides, the hosted demo video link, this GitHub repo, the GitHub sprint board, and the deployed app link above. Provide login instructions or a temporary test account in Canvas rather than committing credentials to the repository.
