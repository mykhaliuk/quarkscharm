export type UpstreamResult = { url: URL } | { error: 'tenant' | 'path' };

type Row = {
  prefix: string;
  host: string;
  upstreamPrefix: string;
  versionPrefix: string | null;
  allowed: readonly string[] | null;
};

const TENANT_RE = /^[a-z0-9-]{2,32}$/;

const ROWS: readonly Row[] = [
  {
    prefix: 'times/',
    host: 'api.quarksup.net',
    upstreamPrefix: '/times/v3/',
    versionPrefix: 'v3/',
    allowed: null,
  },
  {
    prefix: 'people/',
    host: 'api.quarksup.net',
    upstreamPrefix: '/people/v3/',
    versionPrefix: 'v3/',
    allowed: null,
  },
  {
    prefix: 'org/',
    host: 'service-<tenant>.quarksup.net',
    upstreamPrefix: '/api/v2/',
    versionPrefix: null,
    allowed: ['organization/', 'people/'],
  },
];

const isCleanPath = (remainder: string): boolean => {
  if (remainder.length === 0) return false;
  if (remainder.startsWith('/')) return false;
  if (
    remainder.split('/').some((segment) => segment === '..' || segment === '.')
  ) {
    return false;
  }
  return true;
};

export const resolveUpstream = (
  path: string,
  tenant: string,
): UpstreamResult => {
  if (!TENANT_RE.test(tenant)) return { error: 'tenant' };
  if (path.includes('//')) return { error: 'path' };
  const row = ROWS.find((candidate) => path.startsWith(candidate.prefix));
  if (!row) return { error: 'path' };
  let remainder = path.slice(row.prefix.length);
  if (row.versionPrefix !== null && remainder.startsWith(row.versionPrefix)) {
    remainder = remainder.slice(row.versionPrefix.length);
  }
  if (!isCleanPath(remainder)) return { error: 'path' };
  if (row.allowed !== null) {
    const scope = row.allowed.find((prefix) => remainder.startsWith(prefix));
    if (!scope || remainder.length === scope.length) return { error: 'path' };
  }
  const host = row.host.replace('<tenant>', tenant);
  return { url: new URL(`https://${host}${row.upstreamPrefix}${remainder}`) };
};
