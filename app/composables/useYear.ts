import { today } from '~~/shared/utils/ymd';

const yearOf = (ymd: string): number => Number(ymd.slice(0, 4));

const current = ref<number | null>(null);

export const useYear = () => {
  const session = useSession();
  if (current.value === null) {
    current.value = yearOf(today(session.state.me?.timeZone ?? 'Europe/Paris'));
  }
  const year = current as Ref<number>;
  const setYear = (value: number) => {
    current.value = value;
  };
  const previous = () => setYear(year.value - 1);
  const next = () => setYear(year.value + 1);
  return { year, setYear, previous, next };
};
