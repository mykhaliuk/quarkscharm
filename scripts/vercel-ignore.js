// Vercel Ignored Build Step (vercel.json → ignoreCommand).
// Exit code: 0 = SKIP the build, 1 = proceed with the build.
import { execFileSync } from 'node:child_process';

const NOT_APP_PREFIXES = ['openspec/', 'docs/', 'extension/'];

const isNotApp = (file) =>
  NOT_APP_PREFIXES.some((prefix) => file.startsWith(prefix));

export const shouldBuild = ({ previousSha, changedFiles }) => {
  if (previousSha === '') return true;
  if (changedFiles.length === 0) return true;
  return !changedFiles.every(isNotApp);
};

const listChangedFiles = (previousSha, sha) => {
  try {
    const out = execFileSync('git', ['diff', '--name-only', previousSha, sha], {
      encoding: 'utf8',
    });
    return out.split('\n').filter((line) => line.length > 0);
  } catch (error) {
    console.error('vercel-ignore: git diff failed, building', error);
    return [];
  }
};

const main = () => {
  const previousSha = process.env.VERCEL_GIT_PREVIOUS_SHA ?? '';
  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? 'HEAD';
  const changedFiles =
    previousSha === '' ? [] : listChangedFiles(previousSha, sha);
  const build = shouldBuild({ previousSha, changedFiles });
  console.log(
    build
      ? `vercel-ignore: building (${changedFiles.length} changed files)`
      : 'vercel-ignore: skipping, only openspec/, docs/ or extension/ changed',
  );
  process.exit(build ? 1 : 0);
};

if (process.argv[1] === import.meta.filename) main();
