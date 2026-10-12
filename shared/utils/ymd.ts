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

export const daysBetween = (a: Ymd, b: Ymd): number =>
  Math.round((toUtc(b) - toUtc(a)) / DAY_MS);

export const weekday = (ymd: Ymd): number =>
  (new Date(toUtc(ymd)).getUTCDay() + 6) % 7;

export const monthDays = (year: number, month: number): Ymd[] => {
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days: Ymd[] = [];
  for (let day = 1; day <= count; day++) {
    days.push(`${year}-${pad(month)}-${pad(day)}`);
  }
  return days;
};

export type MonthGrid = (Ymd | null)[][];

export const yearMonths = (year: number): MonthGrid[] => {
  const grids: MonthGrid[] = [];
  for (let month = 1; month <= 12; month++) {
    const days = monthDays(year, month);
    const offset = weekday(days[0] as Ymd);
    const cells: (Ymd | null)[] = Array.from({ length: 42 }, () => null);
    for (let i = 0; i < days.length; i++) cells[offset + i] = days[i] as Ymd;
    const grid: MonthGrid = [];
    for (let row = 0; row < 6; row++) {
      grid.push(cells.slice(row * 7, row * 7 + 7));
    }
    grids.push(grid);
  }
  return grids;
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
