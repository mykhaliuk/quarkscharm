import { describe, expect, test } from 'bun:test';
import {
  createBridgeClient,
  TOKEN_BRIDGE_EXTENSION_ID,
  type BridgeRuntime,
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
