const store = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
};

export const readJson = <T>(key: string): T | null => {
  try {
    const raw = store()?.getItem(key);
    if (raw === null || raw === undefined) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const writeJson = (key: string, value: unknown): boolean => {
  try {
    const storage = store();
    if (!storage) return false;
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export const remove = (key: string): boolean => {
  try {
    const storage = store();
    if (!storage) return false;
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};
