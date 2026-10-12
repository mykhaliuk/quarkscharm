import { afterEach, describe, expect, test } from 'bun:test';
import { setQsHooks } from '~/utils/qs/fetch';
import * as api from '~/utils/qs/api';
import me from '../fixtures/qs/me.json';
import natures from '../fixtures/qs/natures.json';
import statuses from '../fixtures/qs/statuses.json';
import entitlements from '../fixtures/qs/entitlements.json';
import requests from '../fixtures/qs/requests.json';
import plannerMe from '../fixtures/qs/planner-me.json';
import holidays from '../fixtures/qs/holidays.json';
import plannerService from '../fixtures/qs/planner-service.json';
import workflowsMe from '../fixtures/qs/workflows-me.json';
import preview from '../fixtures/qs/preview.json';
import created from '../fixtures/qs/create.json';
import updated from '../fixtures/qs/update.json';
import cancelled from '../fixtures/qs/cancel.json';

type Call = { url: URL; init: RequestInit };
const calls: Call[] = [];

const serve = (body: unknown, status = 200) => {
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: new URL(String(url), 'http://local'), init: init ?? {} });
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
};

setQsHooks({
  credentials: () => ({ tenant: 'fulll', token: 'tok.en.x' }),
  onExpired: () => {},
  whenConnected: () => Promise.resolve(),
});

afterEach(() => {
  calls.length = 0;
});

const last = () => {
  const call = calls.at(-1)!;
  return {
    path: call.url.pathname,
    query: Object.fromEntries(call.url.searchParams),
    headers: new Headers(call.init.headers),
    method: call.init.method ?? 'GET',
    body:
      call.init.body === undefined
        ? undefined
        : JSON.parse(String(call.init.body)),
  };
};

const PREVIEW_QUERY = {
  thumbnails: 'small',
  overlapScope: 'Service',
  details: 'default,Conflicts,Overlaps',
  isSocialSecurity: 'false',
  locale: 'fr-FR',
};

describe('qs api', () => {
  test('getMe uses the given credentials and the users/me path', async () => {
    serve(me);
    expect(await api.getMe('acme', 'a.b.c')).toEqual(me);
    const { path, query, headers } = last();
    expect(path).toBe('/api/qs/org/organization/users/me');
    expect(query).toEqual({
      expand: 'profiles,portals,metrics',
      locale: 'fr-FR',
    });
    expect(headers.get('x-qs-tenant')).toBe('acme');
    expect(headers.get('authorization')).toBe('Bearer a.b.c');
  });

  test('getNatures and getStatuses read the organization metadata', async () => {
    serve(natures);
    expect(await api.getNatures()).toEqual(natures);
    expect(last().path).toBe('/api/qs/org/organization/metadata/absenceNature');
    expect(last().query).toEqual({ includeInactive: 'true', locale: 'fr-FR' });
    serve(statuses);
    expect(await api.getStatuses()).toEqual(statuses);
    expect(last().path).toBe('/api/qs/org/organization/metadata/absenceStatus');
  });

  test('getEntitlements and getTsaEntitlements filter by employee', async () => {
    serve(entitlements);
    expect(await api.getEntitlements(9001)).toEqual(entitlements);
    expect(last().path).toBe('/api/qs/times/v3/entitlements');
    expect(last().query).toEqual({ employeeId: '9001', locale: 'fr-FR' });
    serve([]);
    expect(await api.getTsaEntitlements(9001)).toEqual([]);
    expect(last().path).toBe('/api/qs/times/v3/entitlements/tsa');
    expect(last().query.employeeId).toBe('9001');
  });

  test('getRequests is an OData call with the visible statuses', async () => {
    serve(requests);
    expect(await api.getRequests(9001, '2026-01-01', '2026-12-31')).toEqual(
      requests,
    );
    const { path, query, headers } = last();
    expect(path).toBe('/api/qs/times/v3/odata/requests');
    expect(query).toEqual({
      employeeId: '9001',
      beginDate: '2026-01-01T00:00:00Z',
      endDate: '2026-12-31T23:00:00Z',
      $top: '500',
      $count: 'true',
      statusIds: '1,2,5,6',
      locale: 'fr-FR',
    });
    expect(headers.get('accept')).toBe('application/json; odata.metadata=none');
  });

  test('getPlannerMe, getHolidays and getPlannerService take a date range', async () => {
    serve(plannerMe);
    expect(await api.getPlannerMe('2026-01-01', '2026-06-30')).toEqual(
      plannerMe,
    );
    expect(last().path).toBe('/api/qs/times/v3/planners/me');
    expect(last().query).toEqual({
      beginDate: '2026-01-01T00:00:00Z',
      endDate: '2026-06-30T23:00:00Z',
      locale: 'fr-FR',
    });
    serve(holidays);
    expect(await api.getHolidays(2026, 'FR')).toEqual(holidays);
    expect(last().path).toBe('/api/qs/times/v3/planners/holidays');
    expect(last().query).toEqual({
      beginDate: '2026-01-01T00:00:00Z',
      endDate: '2026-12-31T23:00:00Z',
      countryCode: 'FR',
      locale: 'fr-FR',
    });
    serve(plannerService);
    expect(await api.getPlannerService('2026-10-01', '2026-10-31')).toEqual(
      plannerService,
    );
    expect(last().path).toBe('/api/qs/times/v3/planners/service');
    expect(last().query).toEqual({
      beginDate: '2026-10-01T00:00:00Z',
      endDate: '2026-10-31T23:00:00Z',
      top: '500',
      thumbnails: 'small',
      locale: 'fr-FR',
    });
  });

  test('getWorkflowsMe reads the workflows of the user', async () => {
    serve(workflowsMe);
    expect(await api.getWorkflowsMe()).toEqual(workflowsMe);
    expect(last().path).toBe('/api/qs/times/v3/requests/workflows/me');
  });

  test('previewRequest and previewUpdate send the preview query', async () => {
    serve(preview);
    expect(
      await api.previewRequest(
        9001,
        '2026-11-02T00:00:00Z',
        '2026-11-04T23:00:00Z',
      ),
    ).toEqual(preview);
    expect(last().path).toBe('/api/qs/times/v3/requests/preview');
    expect(last().query).toEqual({
      employeeId: '9001',
      beginDate: '2026-11-02T00:00:00Z',
      endDate: '2026-11-04T23:00:00Z',
      ...PREVIEW_QUERY,
    });
    serve(preview);
    await api.previewUpdate(
      155,
      9001,
      '2026-10-22T00:00:00Z',
      '2026-10-22T23:00:00Z',
    );
    expect(last().path).toBe('/api/qs/times/v3/requests/155/preview');
    expect(last().query).toMatchObject({
      employeeId: '9001',
      ...PREVIEW_QUERY,
    });
  });

  test('createRequest posts with prefer and unwraps result[0].result', async () => {
    serve(created, 201);
    const body = {
      duration: 3,
      beginDate: '2026-11-02T00:00:00Z',
      endDate: '2026-11-04T23:00:00Z',
      employeeId: 9001,
      segments: [
        {
          entitlementId: 656,
          duration: 3,
          natureId: 17,
          id: null,
          beginDate: null,
          endDate: null,
          document: null,
        },
      ],
      comment: null,
    };
    expect(await api.createRequest(11281, body)).toEqual(
      created.result[0]!.result,
    );
    const call = last();
    expect(call.method).toBe('POST');
    expect(call.path).toBe('/api/qs/times/v3/requests');
    expect(call.query).toEqual({
      workflowSequenceId: '11281',
      locale: 'fr-FR',
    });
    expect(call.headers.get('prefer')).toBe('return=representation');
    expect(call.headers.get('absence-beta')).toBe('true');
    expect(call.body).toEqual(body);
  });

  test('updateRequest puts the same body shape', async () => {
    serve(updated);
    const body = {
      duration: 1,
      beginDate: '2026-10-22T00:00:00Z',
      endDate: '2026-10-22T23:00:00Z',
      employeeId: 9001,
      segments: [
        {
          entitlementId: null,
          duration: 1,
          natureId: 75,
          id: null,
          beginDate: null,
          endDate: null,
          document: null,
        },
      ],
      comment: null,
    };
    expect(await api.updateRequest(155, body)).toEqual(updated);
    const call = last();
    expect(call.method).toBe('PUT');
    expect(call.path).toBe('/api/qs/times/v3/requests/155');
    expect(call.query).toEqual({ locale: 'fr-FR' });
    expect(call.headers.get('prefer')).toBe('return=representation');
  });

  test('cancelRequest puts the workflow with an empty comment', async () => {
    serve(cancelled);
    expect(await api.cancelRequest(155, 11283)).toEqual(cancelled);
    const call = last();
    expect(call.method).toBe('PUT');
    expect(call.path).toBe('/api/qs/times/v3/requests/155/workflows/11283');
    expect(call.body).toEqual({ fields: { comment: null } });
  });
});
