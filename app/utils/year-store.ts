import { computed, reactive } from 'vue';
import { fromApiDate } from '~~/shared/utils/api-dates';
import { segmentsToSlots } from '~~/shared/utils/slots';
import {
  addDays,
  DEFAULT_START_MONTH,
  leaveYearWindow,
  moveMonth,
  weekday,
  type Ymd,
} from '~~/shared/utils/ymd';
import { toRequest, type AbsenceRequest } from './qs/map';
import type {
  RawHolidays,
  RawNature,
  RawPeriod,
  RawPlannerEmployee,
  RawRequestsPage,
} from './qs/types';

export type PartStatus = 'idle' | 'loading' | 'ready' | 'failed';
export type YearPart = 'requests' | 'planner' | 'holidays';

export type YearState = {
  year: number;
  requests: AbsenceRequest[];
  nonWorkingDates: Set<string>;
  holidays: Map<string, string>;
  schoolTerms: Map<string, Map<string, string>>;
  status: Record<YearPart, PartStatus>;
};

export type YearDeps = {
  getRequests: (
    employeeId: number,
    beginDate: string,
    endDate: string,
  ) => Promise<RawRequestsPage>;
  getPlannerMe: (
    beginDate: string,
    endDate: string,
  ) => Promise<RawPlannerEmployee>;
  getHolidays: (
    beginDate: string,
    endDate: string,
    countryCode: string,
  ) => Promise<RawHolidays>;
  employeeId: () => number;
  startMonth: () => number;
};

const COUNTRY = 'FR';
const PAID_LEAVE_REFERENCE = 'CP';

export const pickStartMonth = (
  natures: Iterable<RawNature>,
  periods: RawPeriod[],
  today: Ymd,
): number => {
  const paidLeave = new Set<number>();
  for (const nature of natures)
    if (nature.reference === PAID_LEAVE_REFERENCE) paidLeave.add(nature.id);
  for (const period of periods) {
    if (!paidLeave.has(period.natureId)) continue;
    if (!period.dateBegin || !period.dateEnd) continue;
    const begin = fromApiDate(period.dateBegin).date;
    const end = fromApiDate(period.dateEnd).date;
    if (begin <= today && today <= end) return Number(begin.slice(5, 7));
  }
  return DEFAULT_START_MONTH;
};

export const createYearStore = (deps: YearDeps) => {
  const state = reactive<YearState>({
    year: 0,
    requests: [],
    nonWorkingDates: new Set(),
    holidays: new Map(),
    schoolTerms: new Map(),
    status: { requests: 'idle', planner: 'idle', holidays: 'idle' },
  });
  let token = 0;

  const run = async (part: YearPart, job: () => Promise<void>) => {
    const mine = token;
    state.status[part] = 'loading';
    try {
      await job();
      if (mine !== token) return;
      state.status[part] = 'ready';
    } catch {
      if (mine !== token) return;
      state.status[part] = 'failed';
    }
  };

  const windowOf = (year: number) => leaveYearWindow(year, deps.startMonth());

  const loadRequests = (year: number) =>
    run('requests', async () => {
      const mine = token;
      const { from, to } = windowOf(year);
      const page = await deps.getRequests(deps.employeeId(), from, to);
      if (mine !== token) return;
      state.requests = page.value.map(toRequest);
    });

  const loadPlanner = (year: number) =>
    run('planner', async () => {
      const mine = token;
      const { from, to } = windowOf(year);
      const middle = moveMonth(from, 6);
      const halves = await Promise.all([
        deps.getPlannerMe(from, addDays(middle, -1)),
        deps.getPlannerMe(middle, to),
      ]);
      if (mine !== token) return;
      const dates = new Set<string>();
      for (const half of halves) {
        for (const iso of half.nonWorkingDates ?? [])
          dates.add(fromApiDate(iso).date);
      }
      state.nonWorkingDates = dates;
    });

  const loadHolidays = (year: number) =>
    run('holidays', async () => {
      const mine = token;
      const range = windowOf(year);
      const answer = await deps.getHolidays(range.from, range.to, COUNTRY);
      if (mine !== token) return;
      const labels = new Map<string, string>();
      for (const day of answer.public ?? [])
        labels.set(fromApiDate(day.date).date, day.label);
      state.holidays = labels;
      state.schoolTerms = toSchoolTerms(answer, range);
    });

  const loaders: Record<YearPart, (year: number) => Promise<void>> = {
    requests: loadRequests,
    planner: loadPlanner,
    holidays: loadHolidays,
  };

  const load = async (year: number): Promise<void> => {
    token++;
    state.year = year;
    state.requests = [];
    state.nonWorkingDates = new Set();
    state.holidays = new Map();
    state.schoolTerms = new Map();
    await Promise.all([
      loadRequests(year),
      loadPlanner(year),
      loadHolidays(year),
    ]);
  };

  const retry = (part: YearPart): Promise<void> => loaders[part](state.year);

  const reload = (): Promise<void> => load(state.year);

  const slots = computed(() =>
    segmentsToSlots(
      state.requests.map((request) => ({
        id: request.id,
        segments: request.segments,
      })),
    ),
  );

  const isSelectable = (ymd: string): boolean =>
    weekday(ymd) < 5 &&
    !state.holidays.has(ymd) &&
    !state.nonWorkingDates.has(ymd);

  return { state, load, retry, reload, slots, isSelectable };
};

export type YearStore = ReturnType<typeof createYearStore>;

function toSchoolTerms(
  answer: RawHolidays,
  range: { from: Ymd; to: Ymd },
): Map<string, Map<string, string>> {
  const terms = new Map<string, Map<string, string>>();
  for (const term of answer.schoolTerm ?? []) {
    if (term.area === undefined) continue;
    const days = new Map<string, string>();
    for (const holiday of term.holidays ?? []) {
      const begin = fromApiDate(holiday.beginDate).date;
      const end = fromApiDate(holiday.endDate).date;
      const from = begin < range.from ? range.from : begin;
      const to = end > range.to ? range.to : end;
      for (let day = from; day <= to; day = addDays(day, 1))
        days.set(day, holiday.label);
    }
    terms.set(term.area, days);
  }
  return terms;
}
