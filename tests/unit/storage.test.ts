import { afterEach, describe, expect, test } from 'bun:test';
import { readJson, remove, writeJson } from '~/utils/storage';

const memory = new Map<string, string>();
const working = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => void memory.set(key, value),
  removeItem: (key: string) => void memory.delete(key),
};
const throwing = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
  removeItem: () => {
    throw new Error('blocked');
  },
};

const install = (storage: object | undefined) => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
};

afterEach(() => {
  memory.clear();
  install(undefined);
});

describe('storage', () => {
  test('writes and reads a JSON value back', () => {
    install(working);
    expect(writeJson('qc.theme', 'dark')).toBe(true);
    expect(readJson<string>('qc.theme')).toBe('dark');
  });

  test('reads null for a missing key', () => {
    install(working);
    expect(readJson('qc.missing')).toBeNull();
  });

  test('reads null for a value that is not JSON', () => {
    install(working);
    memory.set('qc.theme', '{broken');
    expect(readJson('qc.theme')).toBeNull();
  });

  test('removes a key', () => {
    install(working);
    writeJson('qc.token', 'x');
    expect(remove('qc.token')).toBe(true);
    expect(readJson('qc.token')).toBeNull();
  });

  test('returns null or false when localStorage throws', () => {
    install(throwing);
    expect(readJson('qc.theme')).toBeNull();
    expect(writeJson('qc.theme', 'dark')).toBe(false);
    expect(remove('qc.theme')).toBe(false);
  });

  test('returns null or false when localStorage is absent', () => {
    install(undefined);
    expect(readJson('qc.theme')).toBeNull();
    expect(writeJson('qc.theme', 'dark')).toBe(false);
    expect(remove('qc.theme')).toBe(false);
  });
});

describe('session area', () => {
  test('reads and writes sessionStorage, not localStorage', () => {
    const tab = new Map<string, string>();
    install({
      getItem: () => {
        throw new Error('local storage must not be used');
      },
    });
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      writable: true,
      value: {
        getItem: (key: string) => tab.get(key) ?? null,
        setItem: (key: string, value: string) => void tab.set(key, value),
        removeItem: (key: string) => void tab.delete(key),
      },
    });
    expect(writeJson('qc.token', 'x', 'session')).toBe(true);
    expect(readJson<string>('qc.token', 'session')).toBe('x');
    expect(remove('qc.token', 'session')).toBe(true);
    expect(tab.size).toBe(0);
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      writable: true,
      value: undefined,
    });
  });
});
