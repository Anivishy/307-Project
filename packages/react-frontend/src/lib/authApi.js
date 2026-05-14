import { saveSession } from "./session.js";

async function readJson(response) {
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed.");
  }

  return payload;
}

export async function requestEmailOtp(email) {
  const response = await fetch("/api/auth/email-otp/request", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });

  return readJson(response);
}

export async function verifyEmailOtp({ email, otp, displayName }) {
  const response = await fetch("/api/auth/email-otp/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, otp, displayName }),
  });
  const payload = await readJson(response);

  saveSession(payload.session);
  return payload;
}
