import { loadBackendEnv } from './env';

let hasLoadedEnv = false;

function loadEnvFiles() {
  if (hasLoadedEnv) {
    return;
  }

  loadBackendEnv();
  hasLoadedEnv = true;
}

export function hasDatabaseUrl() {
  loadEnvFiles();
  return Boolean(process.env.DATABASE_URL);
}

export function shouldUseLocalDemoStore() {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.NODE_ENV !== 'test' &&
    !hasDatabaseUrl()
  );
}
