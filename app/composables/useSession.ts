import { getMe } from '~/utils/qs/api';
import { setQsHooks } from '~/utils/qs/fetch';
import { createSession, type Session } from '~/utils/session';
import { requestBridgeToken } from '~/utils/token-bridge';

let session: Session | null = null;

export const useSession = (): Session => {
  if (session !== null) return session;
  const created = createSession({
    fetchMe: getMe,
    getBridgeToken: requestBridgeToken,
  });
  setQsHooks({
    credentials: () =>
      created.state.token === null
        ? null
        : { tenant: created.state.tenant, token: created.state.token },
    onExpired: () => void created.markExpired(),
    whenConnected: created.whenConnected,
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void created.checkRenewal();
  });
  session = created;
  return created;
};
