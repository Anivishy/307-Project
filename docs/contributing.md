# Contributing

This repo currently has two separate apps:

- `packages/react-frontend`: Vite + React + TypeScript frontend
- `packages/backend`: Next.js + TypeScript backend

This is not set up as an npm workspace yet, so run install and scripts inside the package you are changing.

## Workflow

1. Pull the latest `main` and create a feature branch.
2. Install dependencies in the relevant folder:
   - `cd packages/react-frontend && npm install`
   - `cd packages/backend && npm install`
3. Make your changes.
4. Run the checks for the area you touched:
   - Frontend: `npm run lint` and `npm run build`
   - Backend: `npm run build`
   - Repo formatting: from the root, run `npm run format`
5. Commit with a clear message and open a PR with a short summary of what changed and how you tested it.

## Notes

- Frontend code lives in `packages/react-frontend/src`.
- Backend routes live in `packages/backend/src/app`.
