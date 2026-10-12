import { describe, expect, test } from 'bun:test';
import { resolveUpstream } from '~~/server/utils/qs-allowlist';

const ok = (path: string, tenant = 'fulll') => {
  const result = resolveUpstream(path, tenant);
  if ('error' in result) throw new Error(`rejected: ${result.error}`);
  return result.url.href;
};

const rejected = (path: string, tenant = 'fulll') => {
  const result = resolveUpstream(path, tenant);
  return 'error' in result ? result.error : null;
};

describe('resolveUpstream accepts', () => {
  test('times/ on api.quarksup.net under /times/v3/', () => {
    expect(ok('times/v3/planners/me')).toBe(
      'https://api.quarksup.net/times/v3/planners/me',
    );
    expect(ok('times/odata/requests')).toBe(
      'https://api.quarksup.net/times/v3/odata/requests',
    );
  });

  test('people/ on api.quarksup.net under /people/v3/', () => {
    expect(ok('people/employees/12')).toBe(
      'https://api.quarksup.net/people/v3/employees/12',
    );
  });

  test('org/organization/ on the tenant service host under /api/v2/', () => {
    expect(ok('org/organization/users/me')).toBe(
      'https://service-fulll.quarksup.net/api/v2/organization/users/me',
    );
    expect(ok('org/organization/metadata/absenceNature', 'acme-2')).toBe(
      'https://service-acme-2.quarksup.net/api/v2/organization/metadata/absenceNature',
    );
  });

  test('org/people/ on the tenant service host', () => {
    expect(ok('org/people/directory')).toBe(
      'https://service-fulll.quarksup.net/api/v2/people/directory',
    );
  });

  test('strips a duplicated times/v3 prefix once', () => {
    expect(ok('times/v3/requests/preview')).toBe(
      'https://api.quarksup.net/times/v3/requests/preview',
    );
  });
});

describe('resolveUpstream rejects', () => {
  test('an unknown prefix', () => {
    expect(rejected('admin/users')).toBe('path');
  });

  test('an org/ path outside organization/ and people/', () => {
    expect(rejected('org/billing/invoices')).toBe('path');
  });

  test('a bad tenant', () => {
    expect(rejected('times/v3/planners/me', 'Fulll')).toBe('tenant');
    expect(rejected('times/v3/planners/me', 'a')).toBe('tenant');
    expect(rejected('times/v3/planners/me', 'evil.example.com')).toBe('tenant');
    expect(rejected('times/v3/planners/me', '')).toBe('tenant');
  });

  test('path traversal, a double slash, an absolute URL, an empty remainder', () => {
    expect(rejected('times/v3/../people/x')).toBe('path');
    expect(rejected('times/v3//planners')).toBe('path');
    expect(rejected('times/https://evil.example.com/x')).toBe('path');
    expect(rejected('times/')).toBe('path');
    expect(rejected('times/v3/')).toBe('path');
    expect(rejected('org/organization/')).toBe('path');
  });

  test('encoded dots, backslashes and encoded slashes the URL parser would normalise', () => {
    expect(rejected('times/v3/%2e%2e/people/x')).toBe('path');
    expect(rejected('times/v3/%2E%2E/people/x')).toBe('path');
    expect(rejected('times/v3/..\\people/x')).toBe('path');
    expect(rejected('times/v3/x%2F..%2F..%2Fpeople')).toBe('path');
    expect(rejected('times/v3/.%2e/people')).toBe('path');
    expect(rejected('org/organization/users/me%3Fx=1')).toBe('path');
    expect(rejected('org/organization/users/me@evil.example.com')).toBe('path');
  });

  test('the resolved URL keeps the allowed host and prefix', () => {
    const result = resolveUpstream('org/organization/users/me', 'fulll');
    if ('error' in result) throw new Error('rejected');
    expect(result.url.host).toBe('service-fulll.quarksup.net');
    expect(result.url.pathname.startsWith('/api/v2/organization/')).toBe(true);
  });
});
