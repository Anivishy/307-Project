const SESSION_KEY = 'recipeCollab.session';
const REFRESH_BUFFER_SECONDS = 60;

export function getSavedSession() {
  try {
    const rawSession = localStorage.getItem(SESSION_KEY);
    return rawSession ? JSON.parse(rawSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function updateSavedSession(updates) {
  const session = getSavedSession();

  if (!session) {
    return null;
  }

  const nextSession = { ...session, ...updates };
  saveSession(nextSession);
  return nextSession;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function getSessionProfileId() {
  return getSavedSession()?.profileId ?? null;
}

export function getSessionAccessToken() {
  return getSavedSession()?.accessToken ?? null;
}

export function getSessionRefreshToken() {
  return getSavedSession()?.refreshToken ?? null;
}

export function isSessionExpiringSoon(
  session = getSavedSession()
) {
  if (!session?.expiresAt) {
    return true;
  }

  return (
    session.expiresAt - REFRESH_BUFFER_SECONDS <=
    Math.floor(Date.now() / 1000)
  );
}
