import { relayToQuarksUp } from '../../utils/qs-proxy';

const BODYLESS = new Set(['GET', 'HEAD']);

export default defineEventHandler(async (event) => {
  const method = event.method;
  const raw = BODYLESS.has(method) ? null : await readRawBody(event, false);
  const body = raw === null || raw === undefined ? null : Uint8Array.from(raw);
  const url = getRequestURL(event);
  const output = await relayToQuarksUp(
    {
      method,
      path: getRouterParam(event, 'path') ?? '',
      tenant: getHeader(event, 'x-qs-tenant') ?? '',
      search: url.search,
      headers: {
        authorization: getHeader(event, 'authorization'),
        accept: getHeader(event, 'accept'),
        'content-type': getHeader(event, 'content-type'),
        prefer: getHeader(event, 'prefer'),
        'absence-beta': getHeader(event, 'absence-beta'),
      },
      body,
    },
    fetch,
  );
  setResponseStatus(event, output.status);
  for (const [name, value] of Object.entries(output.headers)) {
    setResponseHeader(event, name, value);
  }
  return output.body;
});
