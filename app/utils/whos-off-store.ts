import { computed, ref, watch } from 'vue';
import { toColleague, type Colleague } from './qs/map';
import type { RawPlannerService } from './qs/types';
import { monthDays } from '~~/shared/utils/ymd';

export type WhosOffStatus = 'idle' | 'loading' | 'ready' | 'failed';

export type OffEntry = {
  employeeId: number;
  name: string;
  entity: string | null;
  job: string | null;
  avatarUrl: string | null;
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
};

const monthOf = (ymd: string): string => ymd.slice(0, 7);

export const createWhosOff = ({
  getPlannerService,
  employeeId,
  focusDate,
}: Deps) => {
  const months = ref(new Map<string, Colleague[]>());
  const status = ref<WhosOffStatus>('idle');
  const pending = new Map<string, Promise<void>>();

  const colleaguesOf = (services: RawPlannerService[]): Colleague[] => {
    const me = employeeId();
    const mine = services.find((service) =>
      service.employees.some((e) => e.id === me),
    );
    const employees = mine?.employees ?? [];
    return employees.filter((e) => e.id !== me).map(toColleague);
  };

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

  const load = (): Promise<void> => loadMonth(monthOf(focusDate()));

  watch(focusDate, (ymd) => void loadMonth(monthOf(ymd)));

  const offOn = (ymd: string): OffEntry[] => {
    const colleagues = months.value.get(monthOf(ymd)) ?? [];
    const entries: OffEntry[] = [];
    for (const colleague of colleagues) {
      const slot = colleague.slots.get(ymd);
      if (!slot || (slot.am === null && slot.pm === null)) continue;
      entries.push({
        employeeId: colleague.employeeId,
        name: colleague.name,
        entity: colleague.entity,
        job: colleague.job,
        avatarUrl: colleague.avatarUrl,
        am: slot.am !== null,
        pm: slot.pm !== null,
      });
    }
    return entries;
  };

  const focused = computed(() => offOn(focusDate()));
  const date = computed(focusDate);

  return { focusDate: date, status, focused, load, offOn };
};

export type WhosOffStore = ReturnType<typeof createWhosOff>;
