import { getHolidays, getPlannerMe, getRequests } from '~/utils/qs/api';
import { whenConnected } from '~/utils/qs/retry';
import {
  createYearStore,
  pickStartMonth,
  type YearStore,
} from '~/utils/year-store';
import { DEFAULT_START_MONTH, leaveYearOf, today } from '~~/shared/utils/ymd';

let store: YearStore | null = null;
const startMonth = ref(DEFAULT_START_MONTH);

export const useYear = () => {
  const session = useSession();
  const natures = useNatures();
  const periods = usePeriods();
  const todayYmd = () => today(session.state.me?.timeZone ?? 'Europe/Paris');
  if (store === null) {
    store = createYearStore({
      getRequests: (e, b, end) => whenConnected(() => getRequests(e, b, end)),
      getPlannerMe: (b, e) => whenConnected(() => getPlannerMe(b, e)),
      getHolidays: (b, e, c) => whenConnected(() => getHolidays(b, e, c)),
      employeeId: () => session.state.me?.employeeId ?? 0,
      startMonth: () => startMonth.value,
    });
    store.state.year = leaveYearOf(todayYmd(), startMonth.value);
  }
  const current = store;
  const year = computed(() => current.state.year);
  const setYear = (value: number) => void current.load(value);
  const previous = () => setYear(year.value - 1);
  const next = () => setYear(year.value + 1);
  const yearOf = (ymd: string) => leaveYearOf(ymd, startMonth.value);

  const resolveStartMonth = async (): Promise<void> => {
    let found = DEFAULT_START_MONTH;
    try {
      const [list] = await Promise.all([periods.load(), natures.load()]);
      found = pickStartMonth(natures.byId.value.values(), list, todayYmd());
    } catch (error) {
      console.warn('year: periods not loaded, June start kept', error);
    }
    if (found === startMonth.value) return;
    startMonth.value = found;
    await current.load(leaveYearOf(todayYmd(), found));
  };

  return {
    store: current,
    year,
    startMonth: readonly(startMonth),
    setYear,
    previous,
    next,
    yearOf,
    resolveStartMonth,
  };
};
