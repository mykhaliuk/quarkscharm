import { getPlannerService } from '~/utils/qs/api';
import { whenConnected } from '~/utils/qs/retry';
import { createWhosOff, type WhosOffStore } from '~/utils/whos-off-store';
import { today } from '~~/shared/utils/ymd';

let store: WhosOffStore | null = null;

export const useWhosOff = (): WhosOffStore => {
  if (store !== null) return store;
  const session = useSession();
  store = createWhosOff({
    getPlannerService: (b, e) => whenConnected(() => getPlannerService(b, e)),
    employeeId: () => session.state.me?.employeeId ?? 0,
    today: () => today(session.state.me?.timeZone ?? 'Europe/Paris'),
  });
  return store;
};
