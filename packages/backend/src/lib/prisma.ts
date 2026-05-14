import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaClient } from '../generated/prisma';

// Next.js can reload modules frequently in development, so cache Prisma globally to avoid connection churn.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

if (!process.env.DATABASE_URL) {
  // The backend package runs from packages/backend, but the shared env files live at the repo root.
  config({
    path: resolve(process.cwd(), '../../.env'),
    quiet: true
  });
  config({
    path: resolve(process.cwd(), '../../.env.local'),
    override: true,
    quiet: true
  });
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is required to initialize Prisma.'
  );
}

const adapter = new PrismaPg({ connectionString });

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
