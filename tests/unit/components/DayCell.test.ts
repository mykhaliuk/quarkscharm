import { describe, expect, test } from 'bun:test';
import { mount } from '@vue/test-utils';
import DayCell from '~/components/calendar/DayCell.vue';

const base = {
  date: '2026-10-14',
  slot: { am: null, pm: null },
  muted: false,
  holiday: null,
  today: false,
  pending: false,
  selected: false,
  colorToken: () => '--nature-cp',
};

describe('DayCell', () => {
  test('a full day takes the number colour of its nature, else on-nature', () => {
    const wrapper = mount(DayCell, {
      props: {
        ...base,
        colorToken: () => '--nature-tt',
        slot: {
          am: { natureId: 75, requestId: 155 },
          pm: { natureId: 75, requestId: 155 },
        },
      },
    });
    expect(wrapper.attributes('style')).toContain(
      '--cell-on: var(--on-nature-tt, var(--on-nature))',
    );
  });

  test('renders a pm-only cell with the nature colour on the afternoon half', () => {
    const wrapper = mount(DayCell, {
      props: {
        ...base,
        slot: { am: null, pm: { natureId: 14, requestId: 160 } },
      },
    });
    expect(wrapper.text()).toBe('14');
    const am = wrapper.get('[data-half="am"]');
    const pm = wrapper.get('[data-half="pm"]');
    expect(am.attributes('style') ?? '').not.toContain('--nature-cp');
    expect(pm.attributes('style')).toContain('var(--nature-cp)');
    expect(wrapper.classes()).not.toContain('full');
  });

  test('renders a muted holiday with its label as the accessible name', () => {
    const wrapper = mount(DayCell, {
      props: {
        ...base,
        date: '2026-11-11',
        muted: true,
        holiday: 'Armistice 1918',
      },
    });
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['muted', 'holiday']),
    );
    expect(wrapper.attributes('aria-label')).toBe('Armistice 1918');
    expect(wrapper.attributes('data-selectable')).toBe('false');
  });

  test('marks today, pending and selected', () => {
    const wrapper = mount(DayCell, {
      props: {
        ...base,
        slot: {
          am: { natureId: 75, requestId: 155 },
          pm: { natureId: 75, requestId: 155 },
        },
        today: true,
        pending: true,
        selected: true,
      },
    });
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['today', 'pending', 'selected', 'full']),
    );
    expect(wrapper.attributes('data-request-id')).toBe('155');
  });
});
