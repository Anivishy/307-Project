# RecipeCollab Backend

This package contains the Next.js API backend for RecipeCollab. Route handlers live in `src/app/api`, and most data-access and domain behavior is factored into service modules under `src/lib`.

## Scripts

```bash
npm run dev
npm run build
npm test
npm run test:coverage
npm run prisma:generate
```

The backend reads Supabase, Prisma, and Spoonacular configuration from the repository root `.env` and `.env.local` files. See [../../supabase-setup.md](../../supabase-setup.md) for the complete setup guide.

## Main Areas

- Authentication: Supabase Auth wrapper and account routes
- Groups: group creation, joins, membership, settings, and candidate bundles
- Pantry: ingredient catalog search and user pantry CRUD
- Profiles: profile identity, constraints, and preferences
- Notifications: in-app notification records for pantry activity
- Generation: bundle generation, validation, settings, and persisted candidate selection
