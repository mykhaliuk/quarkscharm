export type StorageArea = 'local' | 'session';

const AREAS = {
  local: 'localStorage',
  session: 'sessionStorage',
} as const satisfies Record<StorageArea, string>;

const store = (area: StorageArea): Storage | null => {
  try {
    return globalThis[AREAS[area]] ?? null;
  } catch {
    return null;
  }
};

export const readJson = <T>(
  key: string,
  area: StorageArea = 'local',
): T | null => {
  try {
    const raw = store(area)?.getItem(key);
    if (raw === null || raw === undefined) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const writeJson = (
  key: string,
  value: unknown,
  area: StorageArea = 'local',
): boolean => {
  try {
    const storage = store(area);
    if (!storage) return false;
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export const remove = (key: string, area: StorageArea = 'local'): boolean => {
  try {
    const storage = store(area);
    if (!storage) return false;
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};
