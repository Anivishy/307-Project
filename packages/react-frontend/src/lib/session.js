const SESSION_KEY = "recipeCollab.session";

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

export function getSessionProfileId() {
  return getSavedSession()?.profileId ?? null;
}
