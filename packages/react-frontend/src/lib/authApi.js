import { saveSession } from "./session.js";
import { getSupabaseClient } from "./supabaseClient.js";

async function readJson(response) {
  const bodyText = await response.text();
  let payload = null;

  if (bodyText) {
    try {
      payload = JSON.parse(bodyText);
    } catch {
      if (!response.ok) {
        throw new Error(bodyText.slice(0, 180) || "Request failed.");
      }

      throw new Error("Server returned an invalid JSON response.");
    }
  }

  if (!response.ok) {
    throw new Error(readErrorMessage(payload) ?? "Request failed.");
  }

  return payload ?? {};
}

function readErrorMessage(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if (typeof payload.error === "string") {
    return payload.error;
  }

  if (payload.error && typeof payload.error === "object" && typeof payload.error.message === "string") {
    return payload.error.message;
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  return null;
}

function getAuthRedirectTo() {
  return `${window.location.origin}/auth/callback`;
}

function readSessionDisplayName(session) {
  return session?.user?.user_metadata?.display_name ?? session?.user?.user_metadata?.name ?? "";
}

export async function checkAccountStatus(email) {
  const response = await fetch("/api/auth/account-status", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });

  return readJson(response);
}

export async function sendMagicLink(email) {
  const { error } = await getSupabaseClient().auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getAuthRedirectTo(),
      shouldCreateUser: false,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function createSupabaseAccount({ name, email, password }) {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: name,
        name,
      },
      emailRedirectTo: getAuthRedirectTo(),
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data.user?.identities && data.user.identities.length === 0) {
    throw new Error("An account already exists for this email. Sign in instead.");
  }

  return data;
}

export async function syncProfileSession({ accessToken, displayName }) {
  const response = await fetch("/api/auth/session-profile", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ displayName }),
  });

  const payload = await readJson(response);

  saveSession(payload.session);
  return payload;
}

export async function completeAuthRedirect() {
  const supabase = getSupabaseClient();
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const hashAccessToken = hashParams.get("access_token");
  const hashRefreshToken = hashParams.get("refresh_token");
  let session = null;

  if (hashAccessToken && hashRefreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: hashAccessToken,
      refresh_token: hashRefreshToken,
    });

    if (error) {
      throw new Error(error.message);
    }

    session = data.session;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      throw new Error(error.message);
    }

    session = data.session;
  } else {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      throw new Error(error.message);
    }

    session = data.session;
  }

  if (!session?.access_token) {
    throw new Error("The email link did not include a valid Supabase session. Request a new link and try again.");
  }

  return syncProfileSession({
    accessToken: session.access_token,
    displayName: readSessionDisplayName(session),
  });
}
