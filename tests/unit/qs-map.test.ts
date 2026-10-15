import { describe, expect, test } from 'bun:test';
import {
  toColleague,
  toEntitlement,
  toPreview,
  toRequest,
} from '~/utils/qs/map';
import entitlements from '../fixtures/qs/entitlements.json';
import plannerService from '../fixtures/qs/planner-service.json';
import preview from '../fixtures/qs/preview.json';
import previewSplit from '../fixtures/qs/preview-split.json';
import requests from '../fixtures/qs/requests.json';

describe('toRequest', () => {
  test('maps a request with its segments and cancel sequence', () => {
    expect(toRequest(requests.value[0]!)).toEqual({
      id: 155,
      statusId: 1,
      beginDate: '2026-10-22',
      beginHour: 0,
      endDate: '2026-10-23',
      endHour: 23,
      duration: 2,
      comment: null,
      segments: [
        {
          id: 301,
          natureId: 75,
          beginDate: '2026-10-22T00:00:00+02:00',
          endDate: '2026-10-23T23:00:00+02:00',
          duration: 2,
        },
      ],
      cancelSequenceId: 11283,
      cancelNeedsApproval: false,
    });
  });

  test('a validated request exposes a cancellation that needs approval', () => {
    const request = toRequest(requests.value[2]!);
    expect(request.cancelSequenceId).toBe(11282);
    expect(request.cancelNeedsApproval).toBe(true);
  });

  test('a request without a cancel workflow has a null sequence', () => {
    const request = toRequest(requests.value[1]!);
    expect(request.cancelSequenceId).toBeNull();
    expect(request.cancelNeedsApproval).toBe(false);
    expect(request.beginHour).toBe(13);
    expect(request.endHour).toBe(23);
    expect(request.comment).toBe('dentiste');
  });
});

describe('toEntitlement', () => {
  test('maps the balance fields and the period label', () => {
    expect(toEntitlement(entitlements[0]!)).toEqual({
      id: 388,
      natureId: 14,
      periodId: 38,
      periodLabel: 'Fulll (CP + fulll off) · 2026-06-01 – 2027-05-31',
      periodBegin: '2026-06-01',
      periodEnd: '2027-05-31',
      earned: 8.32,
      used: 3.5,
      pending: 0,
      balance: 4.82,
    });
  });

  test('falls back to the agreement label without period dates', () => {
    const raw = { ...entitlements[2]!, period: { id: 51, natureId: 17 } };
    const entitlement = toEntitlement(raw);
    expect(entitlement.periodLabel).toBe('Period 51');
    expect(entitlement.periodBegin).toBeNull();
  });
});

describe('toColleague', () => {
  test('maps a planner employee with half-day slots', () => {
    const colleague = toColleague(plannerService[0]!.employees[2]!, () => null);
    expect(colleague).toMatchObject({
      employeeId: 9003,
      name: 'Cyr Demo',
      entity: 'TECH',
      job: 'QA',
      avatarUrl: null,
    });
    expect(colleague.slots.get('2026-10-12')).toEqual({
      am: null,
      pm: { natureId: null, requestId: 7002 },
    });
  });

  test('takes the nature of each segment from the lookup', () => {
    const colleague = toColleague(plannerService[0]!.employees[1]!, (s) =>
      s.periodId === 38 ? 14 : null,
    );
    expect(colleague.entity).toBe('TECH');
    expect(colleague.avatarUrl).toBe('https://cdn.example.test/p/9002.png');
    expect(colleague.slots.get('2026-10-12')).toEqual({
      am: { natureId: 14, requestId: 7001 },
      pm: { natureId: 14, requestId: 7001 },
    });
  });
});

describe('toPreview', () => {
  test('maps segments, natures, overlaps and warnings', () => {
    expect(toPreview(preview)).toEqual({
      segments: [
        {
          beginDate: '2026-11-02',
          endDate: '2026-11-04',
          duration: 3,
          natureId: 17,
          entitlementId: 656,
        },
      ],
      natures: [
        { id: 17, balance: 6, entitlementId: 656 },
        { id: 14, balance: 4.82, entitlementId: 388 },
        { id: 75, balance: null, entitlementId: null },
      ],
      warnings: [],
      conflicts: [],
      overlaps: [
        {
          employeeId: 9002,
          name: 'Bea Sample',
          avatarUrl: 'https://cdn.example.test/p/9002-s.png',
          beginDate: '2026-11-02',
          endDate: '2026-11-03',
        },
        {
          employeeId: 9003,
          name: 'Cyr Demo',
          avatarUrl: null,
          beginDate: '2026-11-04',
          endDate: '2026-11-04',
        },
      ],
    });
  });

  test('keeps every segment of a split preview and its warning', () => {
    const mapped = toPreview(previewSplit);
    expect(mapped.segments).toHaveLength(2);
    expect(mapped.segments.map((s) => s.beginDate)).toEqual([
      '2026-11-10',
      '2026-11-12',
    ]);
    expect(mapped.warnings).toEqual([
      'Le solde sera insuffisant après cette demande.',
    ]);
  });

  test('tolerates a preview without optional lists', () => {
    expect(toPreview({})).toEqual({
      segments: [],
      natures: [],
      warnings: [],
      conflicts: [],
      overlaps: [],
    });
  });
});
