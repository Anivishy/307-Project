# RecipeCollab

A collaborative recipe app for sharing pantry items, generating group meals, and approving ingredient requests.

## Run locally

```bash
npm install
npm run dev
```

The frontend proxies `/api` requests to the backend on `http://127.0.0.1:3001`.
Start the backend with `npm run dev --prefix ../backend` from this directory, or set
`VITE_API_TARGET`/`API_TARGET` before starting Vite if your backend is on a different port.

Supabase auth also needs `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in the repo-root
`.env.local`. Vite exposes only those public values to the browser.

## Scripts

- `npm run dev` starts the local frontend server.
- `npm run build` checks the production build.
- `npm run lint` checks code style and unused code.
