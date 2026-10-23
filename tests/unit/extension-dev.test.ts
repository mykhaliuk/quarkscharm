import { describe, expect, test } from 'bun:test';
import manifest from '../../extension/manifest.json';
import { devManifest } from '../../scripts/extension-dev.js';
import { firefoxManifest, GECKO_ID } from '../../scripts/extension-firefox.js';
import { pageOrigins } from '../../extension/core.js';

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

describe('firefox manifest', () => {
  test('swaps the service worker, the key and externally_connectable', () => {
    const firefox = firefoxManifest(manifest);
    expect(firefox.background).toEqual({
      scripts: ['background.js'],
      type: 'module',
    });
    expect('key' in firefox).toBe(false);
    expect('externally_connectable' in firefox).toBe(false);
    expect(firefox.browser_specific_settings.gecko.id).toBe(GECKO_ID);
  });

  test('relays the production page only and keeps the quarksUp script', () => {
    const firefox = firefoxManifest(manifest);
    expect(firefox.content_scripts[0]).toEqual(manifest.content_scripts[0]);
    expect(firefox.content_scripts[1]).toEqual({
      matches: ['https://quarkscharm.vercel.app/*'],
      js: ['page.js'],
      run_at: 'document_start',
    });
  });

  test('the dev build also relays localhost', () => {
    const firefox = firefoxManifest(devManifest(manifest));
    expect(firefox.content_scripts[1].matches).toEqual([
      'https://quarkscharm.vercel.app/*',
      'http://localhost:3000/*',
    ]);
  });

  test('both builds answer the same page origins', () => {
    expect(pageOrigins(manifest)).toEqual(['https://quarkscharm.vercel.app']);
    expect(pageOrigins(firefoxManifest(manifest))).toEqual([
      'https://quarkscharm.vercel.app',
    ]);
  });
});
