const PART_RE = /^[A-Za-z0-9_-]+$/;
const BEARER_RE = /^bearer\s+/i;

export const normalizeToken = (raw: string): string | null => {
  const value = raw.trim().replace(BEARER_RE, '');
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  if (!parts.every((part) => PART_RE.test(part))) return null;
  return value;
};

const decodePart = (part: string): unknown => {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
};

export const tokenExpiry = (token: string): number | null => {
  const middle = token.split('.')[1];
  if (middle === undefined) return null;
  try {
    const payload = decodePart(middle);
    if (typeof payload !== 'object' || payload === null) return null;
    const exp = (payload as { exp?: unknown }).exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
};
