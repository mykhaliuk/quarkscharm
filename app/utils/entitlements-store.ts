import { computed, ref } from 'vue';
import { toEntitlement, type Entitlement } from './qs/map';
import type { RawEntitlement } from './qs/types';

export type EntitlementsStatus = 'idle' | 'loading' | 'ready' | 'failed';

type Deps = {
  getEntitlements: (employeeId: number) => Promise<RawEntitlement[]>;
  getTsaEntitlements: (employeeId: number) => Promise<unknown>;
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

export const createEntitlements = ({
  getEntitlements,
  getTsaEntitlements,
  employeeId,
  today,
  log = console.warn,
}: Deps) => {
  const all = ref<Entitlement[]>([]);
  const status = ref<EntitlementsStatus>('idle');

  const parseTsa = (answer: unknown): Entitlement[] => {
    if (Array.isArray(answer) && answer.every(isRawEntitlement)) {
      return answer.map(toEntitlement);
    }
    log('entitlements/tsa: unexpected shape, ignored');
    return [];
  };

  const load = async (): Promise<void> => {
    status.value = 'loading';
    try {
      const id = employeeId();
      const [main, tsa] = await Promise.all([
        getEntitlements(id),
        getTsaEntitlements(id).catch(() => []),
      ]);
      all.value = [...main.map(toEntitlement), ...parseTsa(tsa)];
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
      if (entitlement.periodEnd !== null && entitlement.periodEnd < now)
        continue;
      const list = byNature.get(entitlement.natureId) ?? [];
      list.push(entitlement);
      byNature.set(entitlement.natureId, list);
    }
    const result: Entitlement[] = [];
    for (const list of byNature.values()) {
      list.sort((a, b) =>
        (a.periodBegin ?? '').localeCompare(b.periodBegin ?? ''),
      );
      result.push(...list.slice(0, 2));
    }
    return result;
  });

  const after = (
    entitlementId: number,
    durations: Map<number, number>,
  ): number | null => {
    const entitlement = all.value.find((e) => e.id === entitlementId);
    if (!entitlement) return null;
    return round(
      entitlement.balance - (durations.get(entitlement.natureId) ?? 0),
    );
  };

  return { all, status, counters, load, reload, after };
};

export type EntitlementsStore = ReturnType<typeof createEntitlements>;
