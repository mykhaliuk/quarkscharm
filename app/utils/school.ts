export const SCHOOL_KEY = 'qc.school';
export const DEFAULT_AREA = 'Zone B';

export type SchoolPref = { shown: boolean; area: string };

export const toSchoolPref = (value: unknown): SchoolPref => {
  if (typeof value !== 'object' || value === null) {
    return { shown: false, area: DEFAULT_AREA };
  }
  const { shown, area } = value as { shown?: unknown; area?: unknown };
  return {
    shown: shown === true,
    area: typeof area === 'string' && area !== '' ? area : DEFAULT_AREA,
  };
};

export const pickArea = (wanted: string, areas: string[]): string | null =>
  areas.includes(wanted) ? wanted : (areas[0] ?? null);

export const schoolLabels = (
  days: Map<string, string> | undefined,
  area: string,
): Map<string, string> => {
  const labels = new Map<string, string>();
  for (const [ymd, label] of days ?? []) labels.set(ymd, `${label} (${area})`);
  return labels;
};
