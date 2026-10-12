import { fromApiDate } from '~~/shared/utils/api-dates';
import { segmentsToSlots, type Slot } from '~~/shared/utils/slots';
import type {
  RawEmployee,
  RawEntitlement,
  RawPlannerEmployee,
  RawPreview,
  RawRequest,
} from './types';

export type RequestSegment = {
  id: number | null;
  natureId: number | null;
  beginDate: string;
  endDate: string;
  duration: number;
};

export type AbsenceRequest = {
  id: number;
  statusId: number;
  beginDate: string;
  beginHour: number;
  endDate: string;
  endHour: number;
  duration: number;
  comment: string | null;
  segments: RequestSegment[];
  cancelSequenceId: number | null;
};

export type Entitlement = {
  id: number;
  natureId: number;
  periodId: number;
  periodLabel: string;
  periodBegin: string | null;
  periodEnd: string | null;
  earned: number;
  used: number;
  pending: number;
  balance: number;
};

export type Colleague = {
  employeeId: number;
  name: string;
  entity: string | null;
  job: string | null;
  avatarUrl: string | null;
  slots: Map<string, Slot>;
};

export type PreviewSegment = {
  beginDate: string;
  endDate: string;
  duration: number;
  natureId: number | null;
  entitlementId: number | null;
};

export type PreviewNature = {
  id: number;
  balance: number | null;
  entitlementId: number | null;
};

export type Overlap = {
  employeeId: number;
  name: string;
  avatarUrl: string | null;
  beginDate: string;
  endDate: string;
};

export type Preview = {
  segments: PreviewSegment[];
  natures: PreviewNature[];
  warnings: string[];
  conflicts: string[];
  overlaps: Overlap[];
};

export const toRequest = (raw: RawRequest): AbsenceRequest => {
  const begin = fromApiDate(raw.beginDate);
  const end = fromApiDate(raw.endDate);
  return {
    id: raw.id,
    statusId: raw.statusId,
    beginDate: begin.date,
    beginHour: begin.hour,
    endDate: end.date,
    endHour: end.hour,
    duration: raw.duration,
    comment: raw.comment ?? null,
    segments: raw.segments.map((segment) => ({
      id: segment.id ?? null,
      natureId: segment.natureId,
      beginDate: segment.beginDate,
      endDate: segment.endDate,
      duration: segment.duration,
    })),
    cancelSequenceId: raw._workflows?.CancelRequest?.sequenceId ?? null,
  };
};

export const toEntitlement = (raw: RawEntitlement): Entitlement => {
  const { period } = raw;
  const periodBegin = period.beginDate
    ? fromApiDate(period.beginDate).date
    : null;
  const periodEnd = period.endDate ? fromApiDate(period.endDate).date : null;
  const agreement = period.agreement?.label ?? `Period ${period.id}`;
  const dates =
    periodBegin !== null && periodEnd !== null
      ? ` · ${periodBegin} – ${periodEnd}`
      : '';
  return {
    id: raw.id,
    natureId: period.natureId,
    periodId: period.id,
    periodLabel: `${agreement}${dates}`,
    periodBegin,
    periodEnd,
    earned: raw.earned,
    used: raw.used,
    pending: raw.pending ?? 0,
    balance: raw.balance,
  };
};

const fullName = (employee: RawEmployee): string =>
  `${employee.firstName} ${employee.lastName}`.trim();

const avatarOf = (employee: RawEmployee): string | null =>
  employee.picture?.url ??
  employee.picture?.thumbnails?.medium ??
  employee.picture?.thumbnails?.small ??
  null;

export const toColleague = (raw: RawPlannerEmployee): Colleague => ({
  employeeId: raw.id,
  name: fullName(raw),
  entity: raw.position?.entity?.label ?? null,
  job: raw.job?.label ?? raw.position?.job?.label ?? null,
  avatarUrl: avatarOf(raw),
  slots: segmentsToSlots(
    (raw.absences ?? []).map((absence) => ({
      id: absence.id,
      segments: absence.segments.map((segment) => ({
        natureId: segment.natureId,
        beginDate: segment.beginDate,
        endDate: segment.endDate,
      })),
    })),
  ),
});

const toText = (value: unknown): string | null => {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const message = (value as { message?: unknown; label?: unknown }).message;
    if (typeof message === 'string') return message;
    const label = (value as { label?: unknown }).label;
    if (typeof label === 'string') return label;
  }
  return null;
};

const toTexts = (values: unknown[] | undefined): string[] =>
  (values ?? []).map(toText).filter((text): text is string => text !== null);

export const toPreview = (raw: RawPreview): Preview => {
  const natures = (raw.natures ?? []).map((nature) => ({
    id: nature.id,
    balance: nature.entitlement?.balance ?? nature.threshold ?? null,
    entitlementId: nature.entitlement?.id ?? null,
  }));
  const entitlementOf = (natureId: number | null): number | null =>
    natures.find((nature) => nature.id === natureId)?.entitlementId ?? null;
  return {
    segments: (raw.segments ?? []).map((segment) => ({
      beginDate: fromApiDate(segment.beginDate).date,
      endDate: fromApiDate(segment.endDate).date,
      duration: segment.duration,
      natureId: segment.natureId,
      entitlementId: entitlementOf(segment.natureId),
    })),
    natures,
    warnings: toTexts(raw.warnings),
    conflicts: toTexts(raw.conflictingEvents),
    overlaps: (raw.overlappingRequests ?? []).map((overlap) => ({
      employeeId: overlap.employee.id,
      name: fullName(overlap.employee),
      avatarUrl: avatarOf(overlap.employee),
      beginDate: fromApiDate(overlap.beginDate).date,
      endDate: fromApiDate(overlap.endDate).date,
    })),
  };
};
