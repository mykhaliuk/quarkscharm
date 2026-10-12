import { getHolidays, getPlannerMe, getRequests } from '~/utils/qs/api';
import { whenConnected } from '~/utils/qs/retry';
import { createYearStore, type YearStore } from '~/utils/year-store';
import { today } from '~~/shared/utils/ymd';

let store: YearStore | null = null;

const yearOf = (ymd: string): number => Number(ymd.slice(0, 4));

export const useYear = () => {
  const session = useSession();
  if (store === null) {
    store = createYearStore({
      getRequests: (e, b, end) => whenConnected(() => getRequests(e, b, end)),
      getPlannerMe: (b, e) => whenConnected(() => getPlannerMe(b, e)),
      getHolidays: (y, c) => whenConnected(() => getHolidays(y, c)),
      employeeId: () => session.state.me?.employeeId ?? 0,
    });
    store.state.year = yearOf(
      today(session.state.me?.timeZone ?? 'Europe/Paris'),
    );
  }
  const current = store;
  const year = computed(() => current.state.year);
  const setYear = (value: number) => void current.load(value);
  const previous = () => setYear(year.value - 1);
  const next = () => setYear(year.value + 1);
  return { store: current, year, setYear, previous, next };
};
