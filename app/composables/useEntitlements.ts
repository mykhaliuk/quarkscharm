import { getEntitlements, getTsaEntitlements } from '~/utils/qs/api';
import { whenConnected } from '~/utils/qs/retry';
import {
  createEntitlements,
  type EntitlementsStore,
} from '~/utils/entitlements-store';
import { today } from '~~/shared/utils/ymd';

let store: EntitlementsStore | null = null;

export const useEntitlements = (): EntitlementsStore => {
  if (store !== null) return store;
  const session = useSession();
  const created = createEntitlements({
    getEntitlements: (id) => whenConnected(() => getEntitlements(id)),
    getTsaEntitlements: (id) => whenConnected(() => getTsaEntitlements(id)),
    employeeId: () => session.state.me?.employeeId ?? 0,
    today: () => today(session.state.me?.timeZone ?? 'Europe/Paris'),
  });
  onAfterChange(created.reload);
  store = created;
  return created;
};
