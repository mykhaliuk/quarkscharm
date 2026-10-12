import { describe, expect, test } from 'bun:test';
import { shouldBuild } from '../../scripts/vercel-ignore.js';

describe('shouldBuild', () => {
  test('builds when the previous commit is unknown', () => {
    expect(shouldBuild({ previousSha: '', changedFiles: [] })).toBe(true);
  });

  test('skips when every changed file is under openspec/ or docs/', () => {
    const changedFiles = [
      'openspec/changes/x/tasks.md',
      'docs/quarksup-api.md',
    ];
    expect(shouldBuild({ previousSha: 'abc', changedFiles })).toBe(false);
  });

  test('builds when one changed file is outside those folders', () => {
    const changedFiles = ['docs/quarksup-api.md', 'app/pages/index.vue'];
    expect(shouldBuild({ previousSha: 'abc', changedFiles })).toBe(true);
  });

  test('builds when the diff is empty', () => {
    expect(shouldBuild({ previousSha: 'abc', changedFiles: [] })).toBe(true);
  });
});
