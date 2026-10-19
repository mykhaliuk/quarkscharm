import { computed, ref } from 'vue';
import { toEntitlement, type Entitlement, type Preview } from './qs/map';
import type { RawEntitlement, RawPeriod } from './qs/types';

export type EntitlementsStatus = 'idle' | 'loading' | 'ready' | 'failed';

type Deps = {
  getEntitlements: (employeeId: number) => Promise<RawEntitlement[]>;
  getTsaEntitlements: (employeeId: number) => Promise<unknown>;
  getPeriods: () => Promise<RawPeriod[]>;
  employeeId: () => number;
  today: () => string;
  log?: (...args: unknown[]) => void;
};

const isRawEntitlement = (value: unknown): value is RawEntitlement =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as RawEntitlement).id === 'number' &&
  typeof (value as RawEntitlement).balance === 'number' &&
  typeof (value as RawEntitlement).period === 'object' &&
  (value as RawEntitlement).period !== null &&
  typeof (value as RawEntitlement).period.natureId === 'number';

const round = (value: number): number => Math.round(value * 100) / 100;

const isUntouched = (entitlement: Entitlement): boolean =>
  entitlement.earned === 0 &&
  entitlement.used === 0 &&
  entitlement.pending === 0 &&
  entitlement.balance === 0;

export const createEntitlements = ({
  getEntitlements,
  getTsaEntitlements,
  getPeriods,
  employeeId,
  today,
  log = console.warn,
}: Deps) => {
  const all = ref<Entitlement[]>([]);
  const status = ref<EntitlementsStatus>('idle');

  const parseTsa = (answer: unknown): RawEntitlement[] => {
    if (Array.isArray(answer) && answer.every(isRawEntitlement)) return answer;
    log('entitlements/tsa: unexpected shape, ignored');
    return [];
  };

  const loadPeriods = (): Promise<RawPeriod[]> =>
    getPeriods().catch((error: unknown) => {
      log('entitlements/periods: unavailable, counters stay undated', error);
      return [];
    });

  const load = async (): Promise<void> => {
    status.value = 'loading';
    try {
      const id = employeeId();
      const [main, tsa, periods] = await Promise.all([
        getEntitlements(id),
        getTsaEntitlements(id).catch(() => []),
        loadPeriods(),
      ]);
      const byId = new Map(periods.map((period) => [period.id, period]));
      all.value = [...main, ...parseTsa(tsa)].map((raw) =>
        toEntitlement(raw, byId.get(raw.period.id) ?? null),
      );
      status.value = 'ready';
    } catch {
      status.value = 'failed';
    }
  };

  const reload = load;

  const counters = computed<Entitlement[]>(() => {
    const now = today();
    const byNature = new Map<number, Entitlement[]>();
    for (const entitlement of all.value) {
      if (isUntouched(entitlement)) continue;
      if (entitlement.periodEnd !== null && entitlement.periodEnd < now)
        continue;
      const list = byNature.get(entitlement.natureId) ?? [];
      list.push(entitlement);
      byNature.set(entitlement.natureId, list);
    }
    const result: Entitlement[] = [];
    for (const list of byNature.values()) {
      const dated = list.every((e) => e.periodBegin !== null);
      if (dated) {
        list.sort((a, b) =>
          (a.periodBegin as string).localeCompare(b.periodBegin as string),
        );
        result.push(...list.slice(0, 2));
        continue;
      }
      list.sort((a, b) => b.periodId - a.periodId);
      result.push(...list.filter((e, index) => index === 0 || e.balance > 0));
    }
    return result;
  });

  const after = (
    entitlementId: number,
    durations: Map<number, number>,
  ): number | null => {
    const entitlement = all.value.find((e) => e.id === entitlementId);
    if (!entitlement) return null;
    return round(entitlement.balance - (durations.get(entitlement.id) ?? 0));
  };

  return { all, status, counters, load, reload, after };
};

export const previewedDurations = (
  runs: { natureId: number | null; preview: Preview }[],
): Map<number, number> => {
  const sums = new Map<number, number>();
  for (const run of runs) {
    const nature = run.preview.natures.find((n) => n.id === run.natureId);
    if (!nature || nature.entitlementId === null) continue;
    const total = run.preview.segments.reduce((sum, s) => sum + s.duration, 0);
    const sum = sums.get(nature.entitlementId) ?? 0;
    sums.set(nature.entitlementId, round(sum + total));
  }
  return sums;
};

export type EntitlementsStore = ReturnType<typeof createEntitlements>;
