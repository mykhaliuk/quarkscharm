import { describe, expect, test } from 'bun:test';
import manifest from '../../extension/manifest.json';
import { devManifest } from '../../scripts/extension-dev.js';

describe('extension manifest', () => {
  test('the shipped manifest answers production only', () => {
    expect(manifest.externally_connectable.matches).toEqual([
      'https://quarkscharm.vercel.app/*',
    ]);
  });

  test('the dev manifest adds localhost and keeps the key', () => {
    const dev = devManifest(manifest);
    expect(dev.externally_connectable.matches).toEqual([
      'https://quarkscharm.vercel.app/*',
      'http://localhost:3000/*',
    ]);
    expect(dev.key).toBe(manifest.key);
    expect(dev.name).toBe('quarksCharm token bridge (dev)');
  });
});
