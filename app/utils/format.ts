const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const formatTime = (timestamp: number, timeZone: string): string =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));

type Parts = { day: number; month: string; year: number };

const parts = (ymd: string): Parts => ({
  day: Number(ymd.slice(8, 10)),
  month: MONTHS[Number(ymd.slice(5, 7)) - 1] as string,
  year: Number(ymd.slice(0, 4)),
});

export const formatDay = (ymd: string): string => {
  const { day, month, year } = parts(ymd);
  return `${day} ${month} ${year}`;
};

export const formatDayRange = (begin: string, end: string): string => {
  if (begin === end) return formatDay(begin);
  const a = parts(begin);
  const b = parts(end);
  if (a.year !== b.year) return `${formatDay(begin)} – ${formatDay(end)}`;
  if (a.month !== b.month) {
    return `${a.day} ${a.month} – ${b.day} ${b.month} ${b.year}`;
  }
  return `${a.day}–${b.day} ${a.month} ${a.year}`;
};

export const formatDays = (duration: number): string =>
  duration === 1 ? '1 day' : `${duration} days`;

export const formatLeaveYear = (year: number): string =>
  `${year}–${String((year + 1) % 100).padStart(2, '0')}`;
