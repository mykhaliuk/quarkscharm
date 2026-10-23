// Builds extension-firefox/: extension/ for Firefox, with the page.js relay.
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { devManifest } from './extension-dev.js';

export const GECKO_ID = 'token-bridge@quarkscharm';

export const firefoxManifest = (manifest) => {
  const {
    key: _key,
    externally_connectable: connectable,
    background,
    ...rest
  } = manifest;
  return {
    ...rest,
    background: { scripts: [background.service_worker], type: 'module' },
    content_scripts: [
      ...manifest.content_scripts,
      {
        matches: connectable.matches,
        js: ['page.js'],
        run_at: 'document_start',
      },
    ],
    browser_specific_settings: {
      gecko: { id: GECKO_ID, strict_min_version: '128.0' },
    },
  };
};

const main = () => {
  const isDev = process.argv.includes('--dev');
  const source = 'extension';
  const target = isDev ? 'extension-firefox-dev' : 'extension-firefox';
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
  const path = join(target, 'manifest.json');
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  const base = isDev ? devManifest(manifest) : manifest;
  const firefox = firefoxManifest(base);
  writeFileSync(path, `${JSON.stringify(firefox, null, 2)}\n`);
  console.log(`extension-firefox: built, load ${target}/manifest.json`);
};

if (process.argv[1] === import.meta.filename) main();
