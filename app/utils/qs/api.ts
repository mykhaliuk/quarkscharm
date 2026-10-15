import { toApiDate } from '~~/shared/utils/api-dates';
import { VISIBLE_STATUS_IDS } from '~~/shared/utils/status';
import { qsFetch } from './fetch';
import type {
  RawCancelAnswer,
  RawCreateEnvelope,
  RawEntitlement,
  RawHolidays,
  RawItemSet,
  RawMe,
  RawNature,
  RawPeriod,
  RawPlannerEmployee,
  RawPlannerService,
  RawPreview,
  RawRequest,
  RawRequestsPage,
  RawStatus,
  RawWorkflowsMe,
  RequestBody,
} from './types';

const LOCALE = { locale: 'fr-FR' };
const REPRESENTATION = { prefer: 'return=representation' };
const PREVIEW_QUERY = {
  thumbnails: 'medium',
  overlapScope: 'Service',
  details: 'default,Conflicts,Overlaps',
  isSocialSecurity: 'false',
};

const dayStart = (ymd: string) => toApiDate(ymd, 0);
const dayEnd = (ymd: string) => toApiDate(ymd, 23);

export const getMe = (tenant: string, token: string) =>
  qsFetch<RawMe>('org/organization/users/me', {
    query: { expand: 'profiles,portals,metrics', ...LOCALE },
    credentials: { tenant, token },
  });

const items = <T>(answer: RawItemSet<T> | T[]): T[] =>
  Array.isArray(answer) ? answer : answer.items;

export const getNatures = async (): Promise<RawNature[]> =>
  items(
    await qsFetch<RawItemSet<RawNature> | RawNature[]>(
      'org/organization/metadata/absenceNature',
      { query: { includeInactive: 'true', ...LOCALE } },
    ),
  );

export const getPeriods = async (): Promise<RawPeriod[]> =>
  items(
    await qsFetch<RawItemSet<RawPeriod> | RawPeriod[]>(
      'org/organization/metadata/absencePeriod',
      { query: { includeInactive: 'true', ...LOCALE } },
    ),
  );

export const getStatuses = async (): Promise<RawStatus[]> =>
  items(
    await qsFetch<RawItemSet<RawStatus> | RawStatus[]>(
      'org/organization/metadata/absenceStatus',
      { query: LOCALE },
    ),
  );

export const getEntitlements = (employeeId: number) =>
  qsFetch<RawEntitlement[]>('times/v3/entitlements', {
    query: { employeeId, ...LOCALE },
  });

export const getTsaEntitlements = (employeeId: number) =>
  qsFetch<unknown>('times/v3/entitlements/tsa', {
    query: { employeeId, ...LOCALE },
  });

export const getRequests = (
  employeeId: number,
  beginDate: string,
  endDate: string,
) =>
  qsFetch<RawRequestsPage>('times/v3/odata/requests', {
    query: {
      employeeId,
      beginDate: dayStart(beginDate),
      endDate: dayEnd(endDate),
      $top: 500,
      $count: true,
      statusIds: VISIBLE_STATUS_IDS.join(','),
      ...LOCALE,
    },
    headers: { accept: 'application/json; odata.metadata=none' },
  });

export const getPlannerMe = (beginDate: string, endDate: string) =>
  qsFetch<RawPlannerEmployee>('times/v3/planners/me', {
    query: {
      beginDate: dayStart(beginDate),
      endDate: dayEnd(endDate),
      ...LOCALE,
    },
  });

export const getHolidays = (year: number, countryCode: string) =>
  qsFetch<RawHolidays>('times/v3/planners/holidays', {
    query: {
      beginDate: dayStart(`${year}-01-01`),
      endDate: dayEnd(`${year}-12-31`),
      countryCode,
      ...LOCALE,
    },
  });

export const getPlannerService = (beginDate: string, endDate: string) =>
  qsFetch<RawPlannerService[]>('times/v3/planners/service', {
    query: {
      beginDate: dayStart(beginDate),
      endDate: dayEnd(endDate),
      top: 500,
      thumbnails: 'medium',
      ...LOCALE,
    },
  });

export const getWorkflowsMe = () =>
  qsFetch<RawWorkflowsMe>('times/v3/requests/workflows/me', { query: LOCALE });

export const previewRequest = (
  employeeId: number,
  beginIso: string,
  endIso: string,
) =>
  qsFetch<RawPreview>('times/v3/requests/preview', {
    query: {
      employeeId,
      beginDate: beginIso,
      endDate: endIso,
      ...PREVIEW_QUERY,
      ...LOCALE,
    },
  });

export const previewUpdate = (
  requestId: number,
  employeeId: number,
  beginIso: string,
  endIso: string,
) =>
  qsFetch<RawPreview>(`times/v3/requests/${requestId}/preview`, {
    query: {
      employeeId,
      beginDate: beginIso,
      endDate: endIso,
      ...PREVIEW_QUERY,
      ...LOCALE,
    },
  });

export const createRequest = async (
  workflowSequenceId: number,
  body: RequestBody,
): Promise<RawRequest> => {
  const envelope = await qsFetch<RawCreateEnvelope>('times/v3/requests', {
    method: 'POST',
    query: { workflowSequenceId, ...LOCALE },
    headers: REPRESENTATION,
    body,
  });
  const first = envelope.result[0];
  if (!first) throw new Error('create answer without result');
  return first.result;
};

export const updateRequest = (requestId: number, body: RequestBody) =>
  qsFetch<RawRequest>(`times/v3/requests/${requestId}`, {
    method: 'PUT',
    query: LOCALE,
    headers: REPRESENTATION,
    body,
  });

export const cancelRequest = (requestId: number, sequenceId: number) =>
  qsFetch<RawCancelAnswer>(
    `times/v3/requests/${requestId}/workflows/${sequenceId}`,
    {
      method: 'PUT',
      query: LOCALE,
      body: { fields: { comment: null } },
    },
  );
