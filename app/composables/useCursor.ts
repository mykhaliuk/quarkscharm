import { createCursor, type CursorStore } from '~/utils/cursor-store';
import { today } from '~~/shared/utils/ymd';

let store: CursorStore | null = null;

export const useCursor = (): CursorStore => {
  if (store !== null) return store;
  const session = useSession();
  const { year, setYear } = useYear();
  const created = createCursor({
    today: () => today(session.state.me?.timeZone ?? 'Europe/Paris'),
    shownYear: () => year.value,
    showYear: setYear,
  });
  watch(year, (value) => created.followYear(value));
  store = created;
  return store;
};
