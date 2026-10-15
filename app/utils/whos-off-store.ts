import { computed, ref, watch } from 'vue';
import { toColleague, type Colleague } from './qs/map';
import type {
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
  remoteNatureId,
  log = console.warn,
}: Deps) => {
  const months = ref(new Map<string, RawPlannerEmployee[]>());
  const periods = ref(new Map<number, number>());
  const status = ref<WhosOffStatus>('idle');
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

  const natureOf = (segment: RawSegment): number | null => {
    const natureId = segment.natureId ?? null;
    if (natureId !== null) return natureId;
    const periodId = segment.periodId ?? null;
    if (periodId !== null) return periods.value.get(periodId) ?? null;
    return segment.duration <= REMOTE_MAX_DAYS ? remoteNatureId() : null;
  };

  const colleaguesOf = (
    services: RawPlannerService[],
  ): RawPlannerEmployee[] => {
    const me = employeeId();
    const mine = services.find((service) =>
      service.employees.some((e) => e.id === me),
    );
    const employees = mine?.employees ?? [];
    return employees.filter((e) => e.id !== me);
  };

  const colleagues = computed(() => {
    const byMonth = new Map<string, Colleague[]>();
    for (const [month, employees] of months.value) {
      const mapped = employees.map((e) => toColleague(e, natureOf));
      byMonth.set(month, mapped);
    }
    return byMonth;
  });

  const loadMonth = (month: string): Promise<void> => {
    if (months.value.has(month)) return Promise.resolve();
    const running = pending.get(month);
    if (running) return running;
    status.value = 'loading';
    const [year, mm] = month.split('-').map(Number) as [number, number];
    const days = monthDays(year, mm);
    const job = getPlannerService(
      days[0] as string,
      days[days.length - 1] as string,
    )
      .then((services) => {
        months.value = new Map(months.value).set(month, colleaguesOf(services));
        status.value = 'ready';
      })
      .catch(() => {
        status.value = 'failed';
      })
      .finally(() => pending.delete(month));
    pending.set(month, job);
    return job;
  };

  const load = async (): Promise<void> => {
    await Promise.all([loadPeriods(), loadMonth(monthOf(focusDate()))]);
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

  return { focusDate: date, status, focused, remote, away, load, offOn };
};

export type WhosOffStore = ReturnType<typeof createWhosOff>;
