import { getPeriods } from '~/utils/qs/api';
import { whenConnected } from '~/utils/qs/retry';
import type { RawPeriod } from '~/utils/qs/types';

let job: Promise<RawPeriod[]> | null = null;

const load = (): Promise<RawPeriod[]> => {
  job ??= whenConnected(getPeriods).catch((error: unknown) => {
    job = null;
    throw error;
  });
  return job;
};

export const usePeriods = () => ({ load });
