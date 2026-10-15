import { computed, ref, watch } from 'vue';
import { toColleague, type Colleague } from './qs/map';
import type {
  RawDirectoryPerson,
  RawPeriod,
  RawPlannerEmployee,
  RawPlannerService,
  RawSegment,
} from './qs/types';
import { monthDays } from '~~/shared/utils/ymd';

export type WhosOffStatus = 'idle' | 'loading' | 'ready' | 'failed';

export type OffEntry = {
  employeeId: number;
  name: string;
  entity: string | null;
  job: string | null;
  avatarUrl: string | null;
  natureId: number | null;
  isRemote: boolean;
  am: boolean;
  pm: boolean;
};

type Deps = {
  getPlannerService: (
    beginDate: string,
    endDate: string,
  ) => Promise<RawPlannerService[]>;
  employeeId: () => number;
  focusDate: () => string;
  getPeriods: () => Promise<RawPeriod[]>;
  getFavorites: () => Promise<RawDirectoryPerson[]>;
  remoteNatureId: () => number | null;
  log?: (...args: unknown[]) => void;
};

const REMOTE_MAX_DAYS = 3;

const monthOf = (ymd: string): string => ymd.slice(0, 7);

export const createWhosOff = ({
  getPlannerService,
  employeeId,
  focusDate,
  getPeriods,
  getFavorites,
  remoteNatureId,
  log = console.warn,
}: Deps) => {
  const months = ref(new Map<string, RawPlannerEmployee[]>());
  const periods = ref(new Map<number, number>());
  const favorites = ref<Set<number> | null>(null);
  const plannerStatus = ref<WhosOffStatus>('idle');
  const favoritesStatus = ref<WhosOffStatus>('idle');
  let favoritesJob: Promise<void> | null = null;
  const pending = new Map<string, Promise<void>>();
  let periodsJob: Promise<void> | null = null;

  const loadPeriods = (): Promise<void> => {
    if (periods.value.size > 0) return Promise.resolve();
    periodsJob ??= getPeriods()
      .then((list) => {
        periods.value = new Map(list.map((p) => [p.id, p.natureId]));
      })
      .catch((error: unknown) => log('whos-off: periods not loaded', error))
      .finally(() => {
        periodsJob = null;
      });
    return periodsJob;
  };

  const loadFavorites = (): Promise<void> => {
    if (favorites.value !== null) return Promise.resolve();
    if (favoritesJob === null) {
      favoritesStatus.value = 'loading';
      favoritesJob = getFavorites()
        .then((people) => {
          const pinned = people.filter((person) => person.pinned !== false);
          favorites.value = new Set(pinned.map((person) => person.id));
          favoritesStatus.value = 'ready';
        })
        .catch((error: unknown) => {
          log('whos-off: favorites not loaded', error);
          favoritesStatus.value = 'failed';
        })
        .finally(() => {
          favoritesJob = null;
        });
    }
    return favoritesJob;
  };

  const status = computed<WhosOffStatus>(() => {
    const both = [plannerStatus.value, favoritesStatus.value];
    if (both.includes('failed')) return 'failed';
    if (both.includes('loading')) return 'loading';
    return both.every((s) => s === 'ready') ? 'ready' : 'idle';
  });

  const hasFavorites = computed(
    () => favorites.value !== null && favorites.value.size > 0,
  );

  const natureOf = (segment: RawSegment): number | null => {
    const natureId = segment.natureId ?? null;
    if (natureId !== null) return natureId;
    const periodId = segment.periodId ?? null;
    if (periodId !== null) return periods.value.get(periodId) ?? null;
    return segment.duration <= REMOTE_MAX_DAYS ? remoteNatureId() : null;
  };

  const colleagues = computed(() => {
    const byMonth = new Map<string, Colleague[]>();
    const pinned = favorites.value;
    if (pinned === null) return byMonth;
    const me = employeeId();
    for (const [month, employees] of months.value) {
      const mapped = employees
        .filter((e) => e.id !== me && pinned.has(e.id))
        .map((e) => toColleague(e, natureOf));
      byMonth.set(month, mapped);
    }
    return byMonth;
  });

  const loadMonth = (month: string): Promise<void> => {
    if (months.value.has(month)) return Promise.resolve();
    const running = pending.get(month);
    if (running) return running;
    plannerStatus.value = 'loading';
    const [year, mm] = month.split('-').map(Number) as [number, number];
    const days = monthDays(year, mm);
    const job = getPlannerService(
      days[0] as string,
      days[days.length - 1] as string,
    )
      .then((services) => {
        months.value = new Map(months.value).set(month, employeesOf(services));
        plannerStatus.value = 'ready';
      })
      .catch(() => {
        plannerStatus.value = 'failed';
      })
      .finally(() => pending.delete(month));
    pending.set(month, job);
    return job;
  };

  const load = async (): Promise<void> => {
    await Promise.all([
      loadPeriods(),
      loadFavorites(),
      loadMonth(monthOf(focusDate())),
    ]);
  };

  watch(focusDate, (ymd) => void loadMonth(monthOf(ymd)));

  const offOn = (ymd: string): OffEntry[] => {
    const remote = remoteNatureId();
    const entries: OffEntry[] = [];
    for (const colleague of colleagues.value.get(monthOf(ymd)) ?? []) {
      const slot = colleague.slots.get(ymd);
      if (!slot || (slot.am === null && slot.pm === null)) continue;
      const natureId = (slot.am ?? slot.pm)?.natureId ?? null;
      entries.push({
        employeeId: colleague.employeeId,
        name: colleague.name,
        entity: colleague.entity,
        job: colleague.job,
        avatarUrl: colleague.avatarUrl,
        natureId,
        isRemote: natureId !== null && natureId === remote,
        am: slot.am !== null,
        pm: slot.pm !== null,
      });
    }
    return entries;
  };

  const focused = computed(() => offOn(focusDate()));
  const remote = computed(() => focused.value.filter((e) => e.isRemote));
  const away = computed(() => focused.value.filter((e) => !e.isRemote));
  const date = computed(focusDate);

  return {
    focusDate: date,
    status,
    hasFavorites,
    focused,
    remote,
    away,
    load,
    offOn,
  };
};

export type WhosOffStore = ReturnType<typeof createWhosOff>;

function employeesOf(services: RawPlannerService[]): RawPlannerEmployee[] {
  const byId = new Map<number, RawPlannerEmployee>();
  for (const service of services) {
    for (const employee of service.employees) {
      if (!byId.has(employee.id)) byId.set(employee.id, employee);
    }
  }
  return [...byId.values()];
}
