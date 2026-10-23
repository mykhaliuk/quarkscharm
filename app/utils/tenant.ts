const TENANT_RE = /^[a-z0-9-]{2,32}$/;

export const isTenant = (value: string): boolean => TENANT_RE.test(value);
