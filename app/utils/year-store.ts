import { computed, reactive } from 'vue';
import { fromApiDate } from '~~/shared/utils/api-dates';
import { segmentsToSlots } from '~~/shared/utils/slots';
import { weekday } from '~~/shared/utils/ymd';
import { toRequest, type AbsenceRequest } from './qs/map';
import type {
  RawHolidays,
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
  getHolidays: (year: number, countryCode: string) => Promise<RawHolidays>;
  employeeId: () => number;
};

const COUNTRY = 'FR';

export const createYearStore = (deps: YearDeps) => {
  const state = reactive<YearState>({
    year: 0,
    requests: [],
    nonWorkingDates: new Set(),
    holidays: new Map(),
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

  const loadRequests = (year: number) =>
    run('requests', async () => {
      const mine = token;
      const page = await deps.getRequests(
        deps.employeeId(),
        `${year}-01-01`,
        `${year}-12-31`,
      );
      if (mine !== token) return;
      state.requests = page.value.map(toRequest);
    });

  const loadPlanner = (year: number) =>
    run('planner', async () => {
      const mine = token;
      const halves = await Promise.all([
        deps.getPlannerMe(`${year}-01-01`, `${year}-06-30`),
        deps.getPlannerMe(`${year}-07-01`, `${year}-12-31`),
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
      const answer = await deps.getHolidays(year, COUNTRY);
      if (mine !== token) return;
      const labels = new Map<string, string>();
      for (const day of answer.public ?? [])
        labels.set(fromApiDate(day.date).date, day.label);
      state.holidays = labels;
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
