import { addDays, daysBetween, type Ymd } from './ymd';
import { segmentHalves, type HalfDay } from './api-dates';

export type Paint = { natureId: number | null; requestId: number | null };

export type Slot = { am: Paint | null; pm: Paint | null };

export type SlotRequest = {
  id: number;
  segments: { natureId: number | null; beginDate: string; endDate: string }[];
};

export type Run = {
  natureId: number;
  beginDate: Ymd;
  beginHour: 0 | 13;
  endDate: Ymd;
  endHour: 12 | 23;
  days: HalfDay[];
};

export const segmentsToSlots = (requests: SlotRequest[]): Map<Ymd, Slot> => {
  const slots = new Map<Ymd, Slot>();
  for (const request of requests) {
    for (const segment of request.segments) {
      const paint: Paint = {
        natureId: segment.natureId,
        requestId: request.id,
      };
      for (const half of segmentHalves(segment)) {
        const slot = slots.get(half.date) ?? { am: null, pm: null };
        if (half.am) slot.am = paint;
        if (half.pm) slot.pm = paint;
        slots.set(half.date, slot);
      }
    }
  }
  return slots;
};

const painted = (paint: Paint | null): number | null =>
  paint !== null && paint.requestId === null ? paint.natureId : null;

const isConsecutive = (
  previous: Ymd,
  next: Ymd,
  isSelectable: (ymd: Ymd) => boolean,
): boolean => {
  const gap = daysBetween(previous, next);
  for (let i = 1; i < gap; i++) {
    if (isSelectable(addDays(previous, i))) return false;
  }
  return true;
};

const startRun = (
  natureId: number,
  date: Ymd,
  beginHour: 0 | 13,
  endHour: 12 | 23,
): Run => ({
  natureId,
  beginDate: date,
  beginHour,
  endDate: date,
  endHour,
  days: [{ date, am: beginHour === 0, pm: endHour === 23 }],
});

export const slotsToRuns = (
  selection: Map<Ymd, Slot>,
  isSelectable: (ymd: Ymd) => boolean,
): Run[] => {
  const dates = [...selection.keys()].toSorted();
  const runs: Run[] = [];
  let open: Run | null = null;

  for (const date of dates) {
    const slot = selection.get(date) as Slot;
    const am = painted(slot.am);
    const pm = painted(slot.pm);
    if (am === null && pm === null) {
      if (open !== null && isSelectable(date)) {
        runs.push(open);
        open = null;
      }
      continue;
    }
    const continues =
      open !== null &&
      am !== null &&
      am === open.natureId &&
      open.endHour === 23 &&
      isConsecutive(open.endDate, date, isSelectable);
    if (open !== null && continues) {
      open.endDate = date;
      open.endHour = pm === am ? 23 : 12;
      open.days.push({ date, am: true, pm: pm === am });
      if (pm !== am) {
        runs.push(open);
        open = null;
      }
    } else {
      if (open !== null) runs.push(open);
      open = null;
      if (am !== null) {
        open = startRun(am, date, 0, pm === am ? 23 : 12);
        if (pm !== am) {
          runs.push(open);
          open = null;
        }
      }
    }
    if (pm !== null && pm !== am) open = startRun(pm, date, 13, 23);
  }
  if (open !== null) runs.push(open);
  return runs;
};

export const withoutRequest = (
  slots: Map<string, Slot>,
  requestId: number,
): Map<string, Slot> => {
  const result = new Map<string, Slot>();
  for (const [ymd, slot] of slots) {
    const am = slot.am?.requestId === requestId ? null : slot.am;
    const pm = slot.pm?.requestId === requestId ? null : slot.pm;
    if (am !== null || pm !== null) result.set(ymd, { am, pm });
  }
  return result;
};
