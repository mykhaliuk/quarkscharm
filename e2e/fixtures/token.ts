const b64url = (value: object): string =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

export const buildToken = (expiresInSeconds = 3600): string => {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url({ exp, sub: 'e2e' })}.c2lnbmF0dXJl`;
};

export const tokenExpiryLabel = (token: string): string => {
  const payload = JSON.parse(
    Buffer.from(token.split('.')[1]!, 'base64url').toString('utf8'),
  ) as { exp: number };
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(payload.exp * 1000));
};
