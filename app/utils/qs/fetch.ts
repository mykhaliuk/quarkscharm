import { QsError } from './error';

export type QsCredentials = { tenant: string; token: string };

export type QsHooks = {
  credentials: () => QsCredentials | null;
  onExpired: () => void;
  whenConnected: () => Promise<void>;
};

export type QsFetchOptions = {
  method?: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  credentials?: QsCredentials;
};

let hooks: QsHooks = {
  credentials: () => null,
  onExpired: () => {},
  whenConnected: () => Promise.resolve(),
};

export const setQsHooks = (next: QsHooks): void => {
  hooks = next;
};

export const getQsHooks = (): QsHooks => hooks;

const buildUrl = (path: string, query: QsFetchOptions['query']): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) params.set(key, String(value));
  }
  const search = params.toString();
  return `/api/qs/${path}${search ? `?${search}` : ''}`;
};

const readMessages = async (response: Response): Promise<string[]> => {
  try {
    const body = (await response.json()) as {
      errors?: { message?: string }[];
      message?: string;
    };
    const messages = (body.errors ?? [])
      .map((e) => e.message)
      .filter((m): m is string => typeof m === 'string');
    if (messages.length === 0 && typeof body.message === 'string') {
      messages.push(body.message);
    }
    return messages;
  } catch {
    return [];
  }
};

export const qsFetch = async <T>(
  path: string,
  options: QsFetchOptions = {},
): Promise<T> => {
  const credentials = options.credentials ?? hooks.credentials();
  if (credentials === null) throw new QsError('expired');
  const headers = new Headers({
    'x-qs-tenant': credentials.tenant,
    authorization: `Bearer ${credentials.token}`,
    accept: 'application/json',
    'absence-beta': 'true',
    ...options.headers,
  });
  const hasBody = options.body !== undefined;
  if (hasBody) headers.set('content-type', 'application/json');
  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: hasBody ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new QsError('unavailable');
  }
  if (response.status === 401) {
    if (options.credentials === undefined) hooks.onExpired();
    throw new QsError('expired', 401, await readMessages(response));
  }
  if (response.status >= 500) throw new QsError('unavailable', response.status);
  if (response.status >= 400) {
    throw new QsError(
      'rejected',
      response.status,
      await readMessages(response),
    );
  }
  if (response.status === 204) return null as T;
  return (await response.json()) as T;
};
