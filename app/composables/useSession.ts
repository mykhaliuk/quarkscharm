import { getMe } from '~/utils/qs/api';
import { setQsHooks } from '~/utils/qs/fetch';
import { createSession, type Session } from '~/utils/session';

let session: Session | null = null;

export const useSession = (): Session => {
  if (session !== null) return session;
  const created = createSession({ fetchMe: getMe });
  setQsHooks({
    credentials: () =>
      created.state.token === null
        ? null
        : { tenant: created.state.tenant, token: created.state.token },
    onExpired: created.markExpired,
    whenConnected: created.whenConnected,
  });
  session = created;
  return created;
};
