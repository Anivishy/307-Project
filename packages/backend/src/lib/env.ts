import { config } from 'dotenv';
import { resolve } from 'node:path';

export function loadBackendEnv() {
  // Load .env.local before .env, and never override variables that are
  // already present in process.env. dotenv only fills in vars that are not
  // yet set, so precedence becomes:
  //   real process env (shell vars, test stubs) > .env.local > .env
  // This keeps .env.local winning over .env while letting explicitly-set
  // environment variables (e.g. the SPOONACULAR_MOCK_* flags in the dev:*
  // scripts, or values stubbed in tests) take priority as expected.
  config({
    path: resolve(process.cwd(), '../../.env.local'),
    quiet: true
  });
  config({
    path: resolve(process.cwd(), '../../.env'),
    quiet: true
  });
}
