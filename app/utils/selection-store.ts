import { computed, reactive, ref } from 'vue';
import { addDays, daysBetween } from '~~/shared/utils/ymd';
import {
  slotsToRuns,
  type Paint,
  type Run,
  type Slot,
} from '~~/shared/utils/slots';

export type Half = 'am' | 'pm';

export type KeyedRun = Run & { key: string };

export type EditTarget = {
  id: number;
  natureId: number;
  beginDate: string;
  beginHour: number;
  endDate: string;
  endHour: number;
};

export type PaintResult = 'painted' | 'no-brush' | 'not-selectable';

type Deps = { isSelectable: (ymd: string) => boolean };

const same = (current: Paint | null, natureId: number): boolean =>
  current !== null && current.natureId === natureId;

export const runKey = (run: Run): string =>
  `${run.natureId}:${run.beginDate}:${run.beginHour}`;

export const createSelection = ({ isSelectable }: Deps) => {
  const brush = ref<number | null>(null);
  const paint = reactive(new Map<string, Slot>());
  const editing = ref<number | null>(null);

  const setBrush = (natureId: number | null) => {
    brush.value = natureId;
  };

  const slotOf = (ymd: string): Slot =>
    paint.get(ymd) ?? { am: null, pm: null };

  const store = (ymd: string, slot: Slot) => {
    if (slot.am === null && slot.pm === null) paint.delete(ymd);
    else paint.set(ymd, slot);
  };

  const paintHalf = (ymd: string, half: Half): PaintResult => {
    if (brush.value === null) return 'no-brush';
    if (!isSelectable(ymd)) return 'not-selectable';
    const slot = { ...slotOf(ymd) };
    slot[half] = same(slot[half], brush.value)
      ? null
      : { natureId: brush.value, requestId: null };
    store(ymd, slot);
    return 'painted';
  };

  const paintDay = (ymd: string): PaintResult => {
    if (brush.value === null) return 'no-brush';
    if (!isSelectable(ymd)) return 'not-selectable';
    const slot = slotOf(ymd);
    const full = same(slot.am, brush.value) && same(slot.pm, brush.value);
    store(
      ymd,
      full
        ? { am: null, pm: null }
        : {
            am: { natureId: brush.value, requestId: null },
            pm: { natureId: brush.value, requestId: null },
          },
    );
    return 'painted';
  };

  const paintRange = (from: string, to: string): PaintResult => {
    if (brush.value === null) return 'no-brush';
    const first = from <= to ? from : to;
    const count = Math.abs(daysBetween(from, to)) + 1;
    for (let i = 0; i < count; i++) {
      const ymd = addDays(first, i);
      if (!isSelectable(ymd)) continue;
      store(ymd, {
        am: { natureId: brush.value, requestId: null },
        pm: { natureId: brush.value, requestId: null },
      });
    }
    return 'painted';
  };

  const clear = () => {
    paint.clear();
    editing.value = null;
  };

  const loadRequest = (target: EditTarget) => {
    paint.clear();
    editing.value = target.id;
    brush.value = target.natureId;
    const count = daysBetween(target.beginDate, target.endDate) + 1;
    for (let i = 0; i < count; i++) {
      const ymd = addDays(target.beginDate, i);
      const am = i > 0 || target.beginHour < 13;
      const pm = i < count - 1 || target.endHour > 12;
      paint.set(ymd, {
        am: am ? { natureId: target.natureId, requestId: null } : null,
        pm: pm ? { natureId: target.natureId, requestId: null } : null,
      });
    }
  };

  const removeRun = (run: Run) => {
    for (const day of run.days) {
      const slot = slotOf(day.date);
      store(day.date, {
        am: day.am ? null : slot.am,
        pm: day.pm ? null : slot.pm,
      });
    }
    if (paint.size === 0) editing.value = null;
  };

  const runs = computed<KeyedRun[]>(() =>
    slotsToRuns(new Map(paint), isSelectable).map((run) => ({
      ...run,
      key: runKey(run),
    })),
  );

  return {
    brush,
    paint,
    editing,
    runs,
    setBrush,
    paintHalf,
    paintDay,
    paintRange,
    clear,
    loadRequest,
    removeRun,
  };
};

export type SelectionStore = ReturnType<typeof createSelection>;
