// Builds extension-dev/: a copy of extension/ that also answers localhost.
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const DEV_ORIGINS = ['http://localhost:3000/*'];

export const devManifest = (manifest) => ({
  ...manifest,
  name: `${manifest.name} (dev)`,
  externally_connectable: {
    ...manifest.externally_connectable,
    matches: [...manifest.externally_connectable.matches, ...DEV_ORIGINS],
  },
});

const main = () => {
  const source = 'extension';
  const target = 'extension-dev';
  rmSync(target, { recursive: true, force: true });
  cpSync(source, target, { recursive: true });
  const path = join(target, 'manifest.json');
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  writeFileSync(path, `${JSON.stringify(devManifest(manifest), null, 2)}\n`);
  console.log(`extension-dev: built, load ${target}/ unpacked`);
};

if (process.argv[1] === import.meta.filename) main();
