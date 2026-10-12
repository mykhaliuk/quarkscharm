import { describe, expect, test } from 'bun:test';
import { relayToQuarksUp, type ProxyInput } from '~~/server/utils/qs-proxy';

type Call = { url: string; init: RequestInit };

const stubFetch = (response: () => Response | Promise<Response>) => {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return response();
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
};

const input = (over: Partial<ProxyInput> = {}): ProxyInput => ({
  method: 'GET',
  path: 'times/v3/planners/me',
  tenant: 'fulll',
  search: '?beginDate=2026-01-01&endDate=2026-06-30',
  headers: {
    authorization: 'Bearer abc.def.ghi',
    accept: 'application/json',
    'absence-beta': 'true',
    'x-forwarded-for': '1.2.3.4',
    cookie: 'secret=1',
  },
  body: null,
  ...over,
});

describe('relayToQuarksUp', () => {
  test('forwards method, query and the allowed headers only', async () => {
    const { calls, fetchImpl } = stubFetch(
      () =>
        new Response('[]', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );
    const result = await relayToQuarksUp(input(), fetchImpl);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(
      'https://api.quarksup.net/times/v3/planners/me?beginDate=2026-01-01&endDate=2026-06-30',
    );
    const sent = new Headers(calls[0]!.init.headers);
    expect(sent.get('authorization')).toBe('Bearer abc.def.ghi');
    expect(sent.get('accept')).toBe('application/json');
    expect(sent.get('absence-beta')).toBe('true');
    expect(sent.get('x-forwarded-for')).toBeNull();
    expect(sent.get('cookie')).toBeNull();
    expect(result.status).toBe(200);
    expect(result.headers['content-type']).toBe('application/json');
  });

  test('forwards a raw body with content-type and prefer', async () => {
    const { calls, fetchImpl } = stubFetch(
      () => new Response('{}', { status: 201 }),
    );
    const body = new TextEncoder().encode('{"duration":2}');
    await relayToQuarksUp(
      input({
        method: 'POST',
        path: 'times/v3/requests',
        search: '?workflowSequenceId=11281',
        headers: {
          authorization: 'Bearer t',
          'content-type': 'application/json',
          prefer: 'return=representation',
        },
        body,
      }),
      fetchImpl,
    );
    expect(calls[0]!.init.method).toBe('POST');
    expect(calls[0]!.init.body).toBe(body);
    const sent = new Headers(calls[0]!.init.headers);
    expect(sent.get('content-type')).toBe('application/json');
    expect(sent.get('prefer')).toBe('return=representation');
  });

  test('passes an upstream 401 through unchanged', async () => {
    const { fetchImpl } = stubFetch(
      () =>
        new Response('{"message":"nope"}', {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
    );
    const result = await relayToQuarksUp(input(), fetchImpl);
    expect(result.status).toBe(401);
    expect(new TextDecoder().decode(result.body)).toBe('{"message":"nope"}');
  });

  test('sets cache-control: no-store on every answer', async () => {
    const { fetchImpl } = stubFetch(() => new Response('x', { status: 200 }));
    const ok = await relayToQuarksUp(input(), fetchImpl);
    expect(ok.headers['cache-control']).toBe('no-store');
    const missing = await relayToQuarksUp(input({ headers: {} }), fetchImpl);
    expect(missing.headers['cache-control']).toBe('no-store');
    const forbidden = await relayToQuarksUp(
      input({ path: 'admin/x' }),
      fetchImpl,
    );
    expect(forbidden.headers['cache-control']).toBe('no-store');
  });

  test('answers 401 without authorization and makes no call', async () => {
    const { calls, fetchImpl } = stubFetch(() => new Response('x'));
    const result = await relayToQuarksUp(
      input({ headers: { accept: 'application/json' } }),
      fetchImpl,
    );
    expect(result.status).toBe(401);
    expect(JSON.parse(new TextDecoder().decode(result.body))).toEqual({
      error: 'missing authorization',
    });
    expect(calls).toHaveLength(0);
  });

  test('answers 403 for a rejected path or tenant without a call', async () => {
    const { calls, fetchImpl } = stubFetch(() => new Response('x'));
    const path = await relayToQuarksUp(
      input({ path: 'admin/users' }),
      fetchImpl,
    );
    expect(path.status).toBe(403);
    expect(JSON.parse(new TextDecoder().decode(path.body))).toEqual({
      error: 'path not allowed',
    });
    const tenant = await relayToQuarksUp(
      input({ tenant: 'Bad Tenant' }),
      fetchImpl,
    );
    expect(tenant.status).toBe(403);
    expect(JSON.parse(new TextDecoder().decode(tenant.body))).toEqual({
      error: 'tenant not allowed',
    });
    expect(calls).toHaveLength(0);
  });

  test('answers 502 when the upstream is unreachable', async () => {
    const { fetchImpl } = stubFetch(() => {
      throw new TypeError('fetch failed');
    });
    const result = await relayToQuarksUp(input(), fetchImpl);
    expect(result.status).toBe(502);
    expect(JSON.parse(new TextDecoder().decode(result.body))).toEqual({
      error: 'upstream unreachable',
    });
  });
});
