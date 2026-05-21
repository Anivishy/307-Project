function paramsFromLocation(location) {
  const params = new URLSearchParams(location.search);
  const hash = location.hash.startsWith('#')
    ? location.hash.slice(1)
    : location.hash;
  const hashParams = new URLSearchParams(hash);

  for (const [key, value] of hashParams.entries()) {
    params.set(key, value);
  }

  return params;
}

export function parseMagicLinkCallback(location) {
  const params = paramsFromLocation(location);
  const errorCode = params.get('error_code');
  const error =
    params.get('error_description') ??
    params.get('error') ??
    errorCode;

  if (error) {
    return {
      ok: false,
      message:
        errorCode === 'otp_expired'
          ? 'This sign-in link has expired. Return to sign in and try again.'
          : error.replace(/\+/g, ' ')
    };
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const expiresIn = params.get('expires_in');

  if (!accessToken || !refreshToken || !expiresIn) {
    return {
      ok: false,
      message:
        'This sign-in link is missing session details. Return to sign in and try again.'
    };
  }

  return {
    ok: true,
    session: {
      accessToken,
      refreshToken,
      tokenType: params.get('token_type') ?? 'bearer',
      expiresIn: Number(expiresIn),
      expiresAt: params.get('expires_at')
        ? Number(params.get('expires_at'))
        : undefined
    }
  };
}
