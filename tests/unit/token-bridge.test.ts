import { describe, expect, test } from 'bun:test';
import {
  createBridgeClient,
  relayRuntime,
  TOKEN_BRIDGE_EXTENSION_ID,
  type BridgeRuntime,
  type RelayWindow,
} from '~/utils/token-bridge';

const runtimeAnswering = (
  answer: unknown,
  lastError?: { message: string },
): BridgeRuntime & { calls: unknown[][] } => {
  const calls: unknown[][] = [];
  const runtime: BridgeRuntime & { calls: unknown[][] } = {
    calls,
    lastError: undefined,
    sendMessage: (id, message, callback) => {
      calls.push([id, message]);
      runtime.lastError = lastError;
      callback(answer);
      runtime.lastError = undefined;
    },
  };
  return runtime;
};

describe('token bridge client', () => {
  test('no runtime means no extension', async () => {
    const client = createBridgeClient({ runtime: null });
    expect(await client.request('fulll')).toEqual({ kind: 'absent' });
  });

  test('asks the extension by id for the tenant and returns its token', async () => {
    const runtime = runtimeAnswering({
      kind: 'token',
      token: 'a.b.c',
      expiresAt: 1_800_000_000_000,
    });
    const client = createBridgeClient({ runtime });
    expect(await client.request('fulll')).toEqual({
      kind: 'token',
      token: 'a.b.c',
      expiresAt: 1_800_000_000_000,
    });
    expect(runtime.calls).toEqual([
      [TOKEN_BRIDGE_EXTENSION_ID, { type: 'token', tenant: 'fulll' }],
    ]);
  });

  test('a missing extension sets lastError and gives absent', async () => {
    const runtime = runtimeAnswering(undefined, {
      message: 'Receiving end does not exist.',
    });
    const client = createBridgeClient({ runtime });
    expect(await client.request('fulll')).toEqual({ kind: 'absent' });
  });

  test('passes login, timeout and failed through', async () => {
    for (const kind of ['login', 'timeout', 'failed'] as const) {
      const client = createBridgeClient({
        runtime: runtimeAnswering({ kind }),
      });
      expect(await client.request('fulll')).toEqual({ kind });
    }
  });

  test('an unknown answer is failed', async () => {
    const odd = [{ kind: 'token', token: 42 }, { kind: 'nope' }, 'text', null];
    for (const answer of odd) {
      const client = createBridgeClient({ runtime: runtimeAnswering(answer) });
      expect(await client.request('fulll')).toEqual({ kind: 'failed' });
    }
  });

  test('no answer in time gives timeout', async () => {
    const runtime: BridgeRuntime = { sendMessage: () => {} };
    const client = createBridgeClient({ runtime, timeoutMs: 10 });
    expect(await client.request('fulll')).toEqual({ kind: 'timeout' });
  });

  test('a throwing runtime gives absent', async () => {
    const runtime: BridgeRuntime = {
      sendMessage: () => {
        throw new Error('Invalid extension id');
      },
    };
    const client = createBridgeClient({ runtime });
    expect(await client.request('fulll')).toEqual({ kind: 'absent' });
  });
});

const ORIGIN = 'https://quarkscharm.vercel.app';

type Posted = { source: string; id: string; type: string; tenant: string };

const fakeWindow = () => {
  const listeners = new Set<(event: MessageEvent) => void>();
  const posted: Posted[] = [];
  const target: RelayWindow & {
    posted: Posted[];
    deliver: (data: unknown, from?: Partial<MessageEvent>) => void;
    listenerCount: () => number;
  } = {
    location: { origin: ORIGIN },
    posted,
    postMessage: ((data: Posted) => posted.push(data)) as Window['postMessage'],
    addEventListener: ((_type: string, listener: (e: MessageEvent) => void) =>
      listeners.add(listener)) as Window['addEventListener'],
    removeEventListener: ((
      _type: string,
      listener: (e: MessageEvent) => void,
    ) => listeners.delete(listener)) as Window['removeEventListener'],
    deliver: (data, from = {}) => {
      const event = { source: target, origin: ORIGIN, data, ...from };
      for (const listener of listeners) listener(event as MessageEvent);
    },
    listenerCount: () => listeners.size,
  };
  return target;
};

const relayAnswer = (id: string, answer: unknown) => ({
  source: 'quarkscharm-bridge',
  id,
  type: 'answer',
  answer,
});

describe('token bridge relay', () => {
  test('posts the request to the page origin and returns the relay answer', async () => {
    const target = fakeWindow();
    const client = createBridgeClient({ runtime: relayRuntime(target) });
    const pending = client.request('fulll');
    const request = target.posted[0];
    expect(request).toMatchObject({
      source: 'quarkscharm',
      type: 'token',
      tenant: 'fulll',
    });
    target.deliver(
      relayAnswer(request.id, {
        kind: 'token',
        token: 'a.b.c',
        expiresAt: 1_800_000_000_000,
      }),
    );
    expect(await pending).toEqual({
      kind: 'token',
      token: 'a.b.c',
      expiresAt: 1_800_000_000_000,
    });
    expect(target.listenerCount()).toBe(0);
  });

  test('ignores answers of other requests, sources and origins', async () => {
    const target = fakeWindow();
    const client = createBridgeClient({ runtime: relayRuntime(target) });
    const first = client.request('fulll');
    const second = client.request('other');
    const firstId = target.posted[0].id;
    const secondId = target.posted[1].id;
    expect(firstId).not.toBe(secondId);
    const login = { kind: 'login' };
    target.deliver({ ...relayAnswer(firstId, login), source: 'quarkscharm' });
    target.deliver(relayAnswer(firstId, login), {
      origin: 'https://evil.example',
    });
    target.deliver(relayAnswer(firstId, login), { source: null });
    expect(target.listenerCount()).toBe(2);
    target.deliver(relayAnswer(secondId, login));
    expect(await second).toEqual({ kind: 'login' });
    target.deliver(relayAnswer(firstId, { kind: 'timeout' }));
    expect(await first).toEqual({ kind: 'timeout' });
  });

  test('no relay on the page gives absent', async () => {
    const target = fakeWindow();
    const runtime = relayRuntime(target, 10);
    const client = createBridgeClient({ runtime });
    expect(await client.request('fulll')).toEqual({ kind: 'absent' });
    expect(target.listenerCount()).toBe(0);
    expect(runtime.lastError).toBeUndefined();
  });

  test('a received relay waits for its answer past the ack time', async () => {
    const target = fakeWindow();
    const client = createBridgeClient({ runtime: relayRuntime(target, 10) });
    const pending = client.request('fulll');
    const { id } = target.posted[0];
    target.deliver({ source: 'quarkscharm-bridge', id, type: 'received' });
    await Bun.sleep(30);
    target.deliver(relayAnswer(id, { kind: 'login' }));
    expect(await pending).toEqual({ kind: 'login' });
  });
});
