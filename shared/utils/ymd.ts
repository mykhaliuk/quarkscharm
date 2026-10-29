export type Ymd = string;

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

const pad = (n: number): string => String(n).padStart(2, '0');

const toUtc = (ymd: Ymd): number => {
  const [year, month, day] = ymd.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  return Date.UTC(year, month - 1, day);
};

const fromUtc = (ms: number): Ymd => {
  const date = new Date(ms);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

export const isYmd = (value: unknown): value is Ymd => {
  if (typeof value !== 'string') return false;
  const match = YMD_RE.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  const ms = Date.UTC(Number(year), Number(month) - 1, Number(day));
  return fromUtc(ms) === value;
};

export const addDays = (ymd: Ymd, n: number): Ymd =>
  fromUtc(toUtc(ymd) + n * DAY_MS);

export const moveMonth = (ymd: Ymd, n: number): Ymd => {
  const [year, month, day] = ymd.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  const index = year * 12 + (month - 1) + n;
  const targetYear = Math.floor(index / 12);
  const targetMonth = index - targetYear * 12 + 1;
  const last = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  return `${targetYear}-${pad(targetMonth)}-${pad(Math.min(day, last))}`;
};

export const daysBetween = (a: Ymd, b: Ymd): number =>
  Math.round((toUtc(b) - toUtc(a)) / DAY_MS);

export const weekday = (ymd: Ymd): number =>
  (new Date(toUtc(ymd)).getUTCDay() + 6) % 7;

export const isoWeek = (ymd: Ymd): number => {
  const thursday = addDays(ymd, 3 - weekday(ymd));
  const yearStart = `${thursday.slice(0, 4)}-01-01`;
  return Math.floor(daysBetween(yearStart, thursday) / 7) + 1;
};

export const monthDays = (year: number, month: number): Ymd[] => {
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days: Ymd[] = [];
  for (let day = 1; day <= count; day++) {
    days.push(`${year}-${pad(month)}-${pad(day)}`);
  }
  return days;
};

export type MonthGrid = (Ymd | null)[][];

export type LeaveMonth = { year: number; month: number; grid: MonthGrid };

export type YmdWindow = { from: Ymd; to: Ymd };

export const DEFAULT_START_MONTH = 6;

export const monthGrid = (year: number, month: number): MonthGrid => {
  const days = monthDays(year, month);
  const offset = weekday(days[0] as Ymd);
  const cells: (Ymd | null)[] = Array.from({ length: 42 }, () => null);
  for (let i = 0; i < days.length; i++) cells[offset + i] = days[i] as Ymd;
  const grid: MonthGrid = [];
  for (let row = 0; row < 6; row++) {
    grid.push(cells.slice(row * 7, row * 7 + 7));
  }
  return grid;
};

export const leaveYearOf = (ymd: Ymd, startMonth: number): number => {
  const year = Number(ymd.slice(0, 4));
  return Number(ymd.slice(5, 7)) >= startMonth ? year : year - 1;
};

export const leaveYearWindow = (
  year: number,
  startMonth: number,
): YmdWindow => {
  const from = `${year}-${pad(startMonth)}-01`;
  return { from, to: addDays(moveMonth(from, 12), -1) };
};

export const leaveYearMonths = (
  year: number,
  startMonth: number,
): LeaveMonth[] => {
  const months: LeaveMonth[] = [];
  const from = leaveYearWindow(year, startMonth).from;
  for (let i = 0; i < 12; i++) {
    const first = moveMonth(from, i);
    const y = Number(first.slice(0, 4));
    const m = Number(first.slice(5, 7));
    months.push({ year: y, month: m, grid: monthGrid(y, m) });
  }
  return months;
};

export const today = (timeZone: string): Ymd => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};
