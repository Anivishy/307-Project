# Deploying to Vercel (Hobby / free plan)

This repo is a monorepo with two deployable apps:

- `packages/react-frontend` — Vite + React SPA (all API calls are relative `/api/*`)
- `packages/backend` — Next.js app that serves the `/api/*` routes

Because the frontend calls `/api` as **relative** paths, it must look like the same
origin as the backend. We do that with **two Vercel projects**, where the frontend
**rewrites `/api/*` to the backend** (no CORS, no code changes).

```
frontend.vercel.app
  /api/*  --rewrite-->  backend.vercel.app/api/*
  /*      -->           index.html  (SPA client-side routing)

backend.vercel.app   (Next.js, root = packages/backend)
  /api/*  -->  route handlers
```

Both projects run on the **free Hobby plan**.

---

## 1. Deploy the backend project (do this first)

1. Vercel → **Add New… → Project** → import the GitHub repo.
2. **Root Directory:** set to `packages/backend`.
3. In **Settings → Build & Deployment** (or the import screen), make sure
   **"Include source files outside of the Root Directory in the Build Step"** is
   **ON**. The Prisma schema lives at the repo root (`prisma/schema.prisma`), and the
   build's `prebuild` step (`prisma generate`) needs it.
4. Framework Preset: **Next.js** (auto-detected). Leave build/install commands default —
   `npm run build` already runs `prisma generate` via the `prebuild` script.
5. Add **Environment Variables** (Production + Preview). Values come from your local
   `.env.local`:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SPOONACULAR_API_KEY` (optional — omit to use mock data)
   - `SPOONACULAR_MOCK_CATALOG=true` and `SPOONACULAR_MOCK_GENERATION=true`
     (set to `false` only if you provided a real Spoonacular key)
6. Deploy. Note the production URL, e.g. `https://<your-backend>.vercel.app`.
   Verify it works: visiting that URL returns `{"ok":true,"service":"307-cooking-app-backend"}`.

## 2. Point the frontend at the backend

Edit `packages/react-frontend/vercel.json` and replace the placeholder host in the
`/api/*` rewrite `destination` with your real backend domain from step 1:

```json
{ "source": "/api/:path*", "destination": "https://<your-backend>.vercel.app/api/:path*" }
```

Commit and push.

## 3. Deploy the frontend project

1. Vercel → **Add New… → Project** → import the **same** GitHub repo (a second project).
2. **Root Directory:** set to `packages/react-frontend`.
3. Framework Preset: **Vite** (auto-detected). Output dir `dist` — already pinned in
   `vercel.json`.
4. No environment variables are required.
5. Deploy. This is your demo URL.

## 4. Supabase redirect allow-list

Auth redirects go to `<frontend-domain>/auth/callback`. In the Supabase dashboard
(**Authentication → URL Configuration**), add your frontend domain to **Site URL** /
**Redirect URLs** so magic-link / OAuth sign-in completes.

---

## Notes

- The original 404 was simply because Vercel was importing the repo **root**, which has
  no app to build. The two projects above (each with a Root Directory) fix that.
- Re-deploys: pushing to the default branch redeploys both projects automatically.
- If `/api/*` returns 404 on the frontend domain, the rewrite host in
  `packages/react-frontend/vercel.json` is wrong or the backend project failed to build.
