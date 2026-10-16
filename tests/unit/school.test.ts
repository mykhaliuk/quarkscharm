import { describe, expect, test } from 'bun:test';
import { pickArea, schoolLabels, toSchoolPref } from '~/utils/school';

describe('school preference', () => {
  test('defaults to off and Zone B', () => {
    expect(toSchoolPref(null)).toEqual({ shown: false, area: 'Zone B' });
    expect(toSchoolPref('on')).toEqual({ shown: false, area: 'Zone B' });
  });

  test('restores a stored choice', () => {
    expect(toSchoolPref({ shown: true, area: 'Zone A' })).toEqual({
      shown: true,
      area: 'Zone A',
    });
  });

  test('drops values of the wrong type', () => {
    expect(toSchoolPref({ shown: 'yes', area: 3 })).toEqual({
      shown: false,
      area: 'Zone B',
    });
  });

  test('takes the first area when the wanted one is missing', () => {
    expect(pickArea('Zone B', ['Zone A', 'Zone B'])).toBe('Zone B');
    expect(pickArea('Zone B', ['Zone A', 'Zone C'])).toBe('Zone A');
    expect(pickArea('Zone B', [])).toBeNull();
  });

  test('labels each day with the holiday and the zone', () => {
    const days = new Map([['2027-02-22', "Vacances d'Hiver"]]);
    expect(schoolLabels(days, 'Zone B')).toEqual(
      new Map([['2027-02-22', "Vacances d'Hiver (Zone B)"]]),
    );
    expect(schoolLabels(undefined, 'Zone B').size).toBe(0);
  });
});
