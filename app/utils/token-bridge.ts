export const TOKEN_BRIDGE_EXTENSION_ID = 'micddnobbaccgmpanjpdnedkpeaocfai';

const BRIDGE_TIMEOUT_MS = 35 * 1000;

const FAILURE_KINDS = ['absent', 'login', 'timeout', 'failed'] as const;

export type BridgeFailure = (typeof FAILURE_KINDS)[number];

export type BridgeResult =
  | { kind: 'token'; token: string; expiresAt: number }
  | { kind: BridgeFailure };

export type BridgeRuntime = {
  sendMessage: (
    extensionId: string,
    message: unknown,
    callback: (answer: unknown) => void,
  ) => void;
  lastError?: { message?: string } | undefined;
};

type ClientDeps = {
  runtime: BridgeRuntime | null;
  timeoutMs?: number;
};

export const createBridgeClient = ({
  runtime,
  timeoutMs = BRIDGE_TIMEOUT_MS,
}: ClientDeps) => {
  const request = (tenant: string): Promise<BridgeResult> => {
    if (runtime === null) return Promise.resolve({ kind: 'absent' });
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve({ kind: 'timeout' }), timeoutMs);
      const finish = (result: BridgeResult) => {
        clearTimeout(timer);
        resolve(result);
      };
      try {
        runtime.sendMessage(
          TOKEN_BRIDGE_EXTENSION_ID,
          { type: 'token', tenant },
          (answer) => {
            if (runtime.lastError) finish({ kind: 'absent' });
            else finish(parseAnswer(answer));
          },
        );
      } catch (error) {
        console.warn('token-bridge: message not sent', error);
        finish({ kind: 'absent' });
      }
    });
  };
  return { request };
};

const RELAY_ACK_MS = 500;

export type RelayWindow = Pick<
  Window,
  'postMessage' | 'addEventListener' | 'removeEventListener'
> & { location: { origin: string } };

export const relayRuntime = (
  target: RelayWindow,
  ackMs = RELAY_ACK_MS,
): BridgeRuntime => {
  const { origin } = target.location;
  const runtime: BridgeRuntime = {
    lastError: undefined,
    sendMessage: (_extensionId, message, callback) => {
      const id = crypto.randomUUID();
      const finish = (answer: unknown, lastError?: { message: string }) => {
        clearTimeout(noRelay);
        target.removeEventListener('message', onMessage);
        runtime.lastError = lastError;
        callback(answer);
        runtime.lastError = undefined;
      };
      const onMessage = (event: MessageEvent) => {
        if (event.source !== target || event.origin !== origin) return;
        const data = event.data as Record<string, unknown> | null;
        if (data?.source !== 'quarkscharm-bridge' || data.id !== id) return;
        if (data.type === 'received') clearTimeout(noRelay);
        if (data.type === 'answer') finish(data.answer);
      };
      const noRelay = setTimeout(
        () => finish(undefined, { message: 'No relay on this page.' }),
        ackMs,
      );
      target.addEventListener('message', onMessage);
      target.postMessage(
        { source: 'quarkscharm', id, ...(message as object) },
        origin,
      );
    },
  };
  return runtime;
};

export const requestBridgeToken = (tenant: string): Promise<BridgeResult> =>
  createBridgeClient({ runtime: browserRuntime() }).request(tenant);

function browserRuntime(): BridgeRuntime | null {
  const chrome = (globalThis as { chrome?: { runtime?: BridgeRuntime } })
    .chrome;
  if (typeof chrome?.runtime?.sendMessage === 'function') return chrome.runtime;
  return typeof window === 'undefined' ? null : relayRuntime(window);
}

function parseAnswer(answer: unknown): BridgeResult {
  if (typeof answer !== 'object' || answer === null) return { kind: 'failed' };
  const { kind, token, expiresAt } = answer as Record<string, unknown>;
  if (
    kind === 'token' &&
    typeof token === 'string' &&
    typeof expiresAt === 'number'
  ) {
    return { kind, token, expiresAt };
  }
  const failure = FAILURE_KINDS.find((known) => known === kind);
  return { kind: failure ?? 'failed' };
}
