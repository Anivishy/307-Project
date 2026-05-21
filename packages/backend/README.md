# Backend Auth API

This package is the minimal Next.js API surface kept for the frontend/auth orphan branch.

Included routes:

- `POST /api/auth/password/signup`
- `POST /api/auth/password/signin`
- `POST /api/auth/email-otp/request`
- `POST /api/auth/email-otp/verify`
- `POST /api/auth/magic-link/request`
- `POST /api/auth/session/complete`
- `POST /api/auth/session/refresh`

Environment loading is handled in `src/lib/env.ts`; it reads root `.env` first and root `.env.local` second with override enabled.

```bash
npm install
npm install --prefix packages/backend
npm run prisma:generate --prefix packages/backend
npm run dev --prefix packages/backend
```

Run these from the repo root. The root install is required because this package generates from `prisma/schema.prisma`.
