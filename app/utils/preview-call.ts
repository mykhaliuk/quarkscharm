import { toApiDate } from '~~/shared/utils/api-dates';
import type { KeyedRun } from './selection-store';

export type PreviewCall = {
  kind: 'create' | 'update';
  requestId: number | null;
  employeeId: number;
  begin: string;
  end: string;
};

export const previewCallFor = (
  run: KeyedRun,
  editing: number | null,
  employeeId: number,
): PreviewCall => ({
  kind: editing === null ? 'create' : 'update',
  requestId: editing,
  employeeId,
  begin: toApiDate(run.beginDate, run.beginHour),
  end: toApiDate(run.endDate, run.endHour),
});
