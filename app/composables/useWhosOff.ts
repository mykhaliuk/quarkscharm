import { getFavorites, getPlannerService } from '~/utils/qs/api';
import { whenConnected } from '~/utils/qs/retry';
import { createWhosOff, type WhosOffStore } from '~/utils/whos-off-store';

let store: WhosOffStore | null = null;

export const useWhosOff = (): WhosOffStore => {
  if (store !== null) return store;
  const session = useSession();
  const cursor = useCursor();
  const natures = useNatures();
  const periods = usePeriods();
  store = createWhosOff({
    getPlannerService: (b, e) => whenConnected(() => getPlannerService(b, e)),
    employeeId: () => session.state.me?.employeeId ?? 0,
    focusDate: () => cursor.cursor.value,
    getPeriods: periods.load,
    getFavorites: () => whenConnected(getFavorites),
    remoteNatureId: () =>
      [...natures.byId.value.values()].find((n) => n.reference === 'TT')?.id ??
      null,
  });
  return store;
};
