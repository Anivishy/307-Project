import { config } from 'dotenv';
import { resolve } from 'node:path';

export function loadBackendEnv() {
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
