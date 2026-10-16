import { readJson, writeJson } from '~/utils/storage';
import {
  SCHOOL_KEY,
  pickArea,
  schoolLabels,
  toSchoolPref,
  type SchoolPref,
} from '~/utils/school';

const EMPTY = new Map<string, string>();

export const useSchoolHolidays = () => {
  const pref = useState<SchoolPref>('school', () =>
    toSchoolPref(readJson<unknown>(SCHOOL_KEY)),
  );
  const { store } = useYear();

  const areas = computed(() => [...store.state.schoolTerms.keys()]);
  const area = computed(() => pickArea(pref.value.area, areas.value));
  const shown = computed(() => pref.value.shown);
  const days = computed(() => {
    const selected = area.value;
    if (!pref.value.shown || selected === null) return EMPTY;
    return schoolLabels(store.state.schoolTerms.get(selected), selected);
  });

  const save = (next: SchoolPref) => {
    pref.value = next;
    writeJson(SCHOOL_KEY, next);
  };
  const toggle = () => save({ ...pref.value, shown: !pref.value.shown });
  const setArea = (value: string) => save({ ...pref.value, area: value });

  return { shown, area, areas, days, toggle, setArea };
};
