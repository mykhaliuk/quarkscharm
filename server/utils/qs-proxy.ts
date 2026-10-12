import { resolveUpstream } from './qs-allowlist';

export type ProxyInput = {
  method: string;
  path: string;
  tenant: string;
  search: string;
  headers: Record<string, string | undefined>;
  body: Uint8Array<ArrayBuffer> | null;
};

export type ProxyOutput = {
  status: number;
  headers: Record<string, string>;
  body: Uint8Array;
};

const FORWARDED_HEADERS = [
  'authorization',
  'accept',
  'content-type',
  'prefer',
  'absence-beta',
] as const;

const NO_STORE = { 'cache-control': 'no-store' } as const;

const jsonAnswer = (status: number, error: string): ProxyOutput => ({
  status,
  headers: { ...NO_STORE, 'content-type': 'application/json' },
  body: new TextEncoder().encode(JSON.stringify({ error })),
});

export const relayToQuarksUp = async (
  input: ProxyInput,
  fetchImpl: typeof fetch,
): Promise<ProxyOutput> => {
  if (!input.headers.authorization)
    return jsonAnswer(401, 'missing authorization');
  const upstream = resolveUpstream(input.path, input.tenant);
  if ('error' in upstream)
    return jsonAnswer(403, `${upstream.error} not allowed`);

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = input.headers[name];
    if (value !== undefined) headers.set(name, value);
  }
  const url = upstream.url.href + input.search;
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: input.method,
      headers,
      body: input.body,
      redirect: 'manual',
    });
  } catch {
    return jsonAnswer(502, 'upstream unreachable');
  }
  const body = new Uint8Array(await response.arrayBuffer());
  const out: Record<string, string> = { ...NO_STORE };
  const contentType = response.headers.get('content-type');
  if (contentType !== null) out['content-type'] = contentType;
  return { status: response.status, headers: out, body };
};
