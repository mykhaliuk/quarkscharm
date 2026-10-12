import { afterEach, describe, expect, test } from 'bun:test';
import { QsError } from '~/utils/qs/error';
import { qsFetch, setQsHooks } from '~/utils/qs/fetch';
import { whenConnected } from '~/utils/qs/retry';

type Call = { url: string; init: RequestInit };
const calls: Call[] = [];
const expiredCalls: number[] = [];

const stub = (responses: (() => Response)[]) => {
  let i = 0;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = responses[Math.min(i, responses.length - 1)]!;
    i++;
    return next();
  }) as unknown as typeof fetch;
};

let status: 'connected' | 'expired' = 'connected';
let resume: (() => void) | null = null;
setQsHooks({
  credentials: () => ({ tenant: 'fulll', token: 'tok.en.x' }),
  onExpired: () => {
    status = 'expired';
    expiredCalls.push(1);
  },
  whenConnected: () =>
    status === 'connected'
      ? Promise.resolve()
      : new Promise<void>((r) => {
          resume = () => {
            status = 'connected';
            r();
          };
        }),
});

afterEach(() => {
  calls.length = 0;
  expiredCalls.length = 0;
  status = 'connected';
  resume = null;
});

const json =
  (body: unknown, code = 200) =>
  () =>
    new Response(JSON.stringify(body), {
      status: code,
      headers: { 'content-type': 'application/json' },
    });

describe('qsFetch', () => {
  test('calls the proxy with tenant, bearer, accept and absence-beta', async () => {
    stub([json({ ok: 1 })]);
    const result = await qsFetch<{ ok: number }>('times/v3/planners/me', {
      query: { beginDate: '2026-01-01', locale: 'fr-FR' },
    });
    expect(result).toEqual({ ok: 1 });
    expect(calls[0]!.url).toBe(
      '/api/qs/times/v3/planners/me?beginDate=2026-01-01&locale=fr-FR',
    );
    const headers = new Headers(calls[0]!.init.headers);
    expect(headers.get('x-qs-tenant')).toBe('fulll');
    expect(headers.get('authorization')).toBe('Bearer tok.en.x');
    expect(headers.get('accept')).toBe('application/json');
    expect(headers.get('absence-beta')).toBe('true');
    expect(headers.get('content-type')).toBeNull();
  });

  test('sends a JSON body with content-type and extra headers', async () => {
    stub([json({ id: 1 }, 201)]);
    await qsFetch('times/v3/requests', {
      method: 'POST',
      body: { duration: 2 },
      headers: { prefer: 'return=representation' },
    });
    expect(calls[0]!.init.method).toBe('POST');
    expect(calls[0]!.init.body).toBe('{"duration":2}');
    const headers = new Headers(calls[0]!.init.headers);
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get('prefer')).toBe('return=representation');
  });

  test('uses explicit credentials when given', async () => {
    stub([json({})]);
    await qsFetch('org/organization/users/me', {
      credentials: { tenant: 'acme', token: 'a.b.c' },
    });
    const headers = new Headers(calls[0]!.init.headers);
    expect(headers.get('x-qs-tenant')).toBe('acme');
    expect(headers.get('authorization')).toBe('Bearer a.b.c');
  });

  test('a 401 marks the session expired and throws expired', async () => {
    stub([json({ message: 'nope' }, 401)]);
    const error = await qsFetch('times/v3/planners/me').catch((e) => e);
    expect(error).toBeInstanceOf(QsError);
    expect(error.kind).toBe('expired');
    expect(expiredCalls).toHaveLength(1);
  });

  test('a 4xx with a JSON body throws rejected with the messages', async () => {
    stub([
      json(
        { errors: [{ message: 'Solde insuffisant' }, { message: 'x' }] },
        400,
      ),
    ]);
    const error = await qsFetch('times/v3/requests/preview').catch((e) => e);
    expect(error.kind).toBe('rejected');
    expect(error.status).toBe(400);
    expect(error.messages).toEqual(['Solde insuffisant', 'x']);
    expect(expiredCalls).toHaveLength(0);
  });

  test('a 5xx or a network error throws unavailable', async () => {
    stub([() => new Response('bad gateway', { status: 502 })]);
    const first = await qsFetch('times/v3/planners/me').catch((e) => e);
    expect(first.kind).toBe('unavailable');
    globalThis.fetch = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    const second = await qsFetch('times/v3/planners/me').catch((e) => e);
    expect(second.kind).toBe('unavailable');
  });

  test('a 204 resolves to null', async () => {
    stub([() => new Response(null, { status: 204 })]);
    expect(await qsFetch('times/v3/x')).toBeNull();
  });
});

describe('whenConnected', () => {
  test('retries once after the session reconnects', async () => {
    stub([json({ message: 'nope' }, 401), json({ ok: true })]);
    const pending = whenConnected(() => qsFetch<{ ok: boolean }>('times/v3/x'));
    await new Promise((r) => setTimeout(r, 0));
    expect(status).toBe('expired');
    expect(resume).not.toBeNull();
    resume!();
    expect(await pending).toEqual({ ok: true });
    expect(calls).toHaveLength(2);
  });

  test('passes other errors through without a retry', async () => {
    stub([json({ errors: [{ message: 'no' }] }, 400)]);
    const error = await whenConnected(() => qsFetch('times/v3/x')).catch(
      (e) => e,
    );
    expect(error.kind).toBe('rejected');
    expect(calls).toHaveLength(1);
  });
});
