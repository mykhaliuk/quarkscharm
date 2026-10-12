import { readonly, ref } from 'vue';
import { addDays, moveMonth, type Ymd } from '~~/shared/utils/ymd';

type Deps = {
  today: () => Ymd;
  shownYear: () => number;
  showYear: (year: number) => void;
};

export const createCursor = ({ today, shownYear, showYear }: Deps) => {
  const cursor = ref<Ymd>(today());

  const moveTo = (ymd: Ymd) => {
    cursor.value = ymd;
    const year = yearOf(ymd);
    if (year !== shownYear()) showYear(year);
  };

  const byDays = (n: number) => moveTo(addDays(cursor.value, n));

  const byMonths = (n: number) => moveTo(moveMonth(cursor.value, n));

  const toToday = () => moveTo(today());

  const followYear = (year: number) => {
    const shift = year - yearOf(cursor.value);
    if (shift !== 0) cursor.value = moveMonth(cursor.value, shift * 12);
  };

  return {
    cursor: readonly(cursor),
    moveTo,
    byDays,
    byMonths,
    today: toToday,
    followYear,
  };
};

export type CursorStore = ReturnType<typeof createCursor>;

function yearOf(ymd: Ymd): number {
  return Number(ymd.slice(0, 4));
}
