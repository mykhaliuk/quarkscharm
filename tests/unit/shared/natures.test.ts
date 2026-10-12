import { describe, expect, test } from 'bun:test';
import { DEFAULT_BRUSHES, natureColorToken } from '~~/shared/utils/natures';

describe('natures', () => {
  test('DEFAULT_BRUSHES are TT, FOFF, CP in that order', () => {
    expect(DEFAULT_BRUSHES).toEqual(['TT', 'FOFF', 'CP']);
  });

  test('natureColorToken maps the known references', () => {
    expect(natureColorToken('TT')).toBe('--nature-tt');
    expect(natureColorToken('FOFF')).toBe('--nature-foff');
    expect(natureColorToken('CP')).toBe('--nature-cp');
    expect(natureColorToken('CETCP')).toBe('--nature-cetcp');
    expect(natureColorToken('CETFOFF')).toBe('--nature-cetfoff');
    expect(natureColorToken('RTT')).toBe('--nature-rtt');
  });

  test('natureColorToken maps everything else to other', () => {
    expect(natureColorToken('MA')).toBe('--nature-other');
    expect(natureColorToken('CONSSOL')).toBe('--nature-other');
    expect(natureColorToken(null)).toBe('--nature-other');
  });
});
