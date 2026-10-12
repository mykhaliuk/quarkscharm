import { addDays, daysBetween, type Ymd } from './ymd';

export type ApiInstant = { date: Ymd; hour: number };

export type HalfDay = { date: Ymd; am: boolean; pm: boolean };

export type ApiSegment = { beginDate: string; endDate: string };

export const fromApiDate = (iso: string): ApiInstant => ({
  date: iso.slice(0, 10),
  hour: Number(iso.slice(11, 13)),
});

const pad = (n: number): string => String(n).padStart(2, '0');

export const toApiDate = (ymd: Ymd, hour: number): string =>
  `${ymd}T${pad(hour)}:00:00Z`;

export const segmentHalves = (segment: ApiSegment): HalfDay[] => {
  const begin = fromApiDate(segment.beginDate);
  const end = fromApiDate(segment.endDate);
  const count = daysBetween(begin.date, end.date) + 1;
  const halves: HalfDay[] = [];
  for (let i = 0; i < count; i++) {
    const date = addDays(begin.date, i);
    const isFirst = i === 0;
    const isLast = i === count - 1;
    halves.push({
      date,
      am: !isFirst || begin.hour < 13,
      pm: !isLast || end.hour > 12,
    });
  }
  return halves;
};
