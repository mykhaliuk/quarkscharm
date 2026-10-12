import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Page, Route } from '@playwright/test';

const FIXTURES = join(process.cwd(), 'tests/fixtures/qs');

const load = (name: string): unknown =>
  JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), 'utf8'));

type Answer = { status: number; body: unknown };

type Rule = {
  method: string;
  pattern: RegExp;
  answer: () => Answer;
};

const ok = (name: string) => () => ({ status: 200, body: load(name) });

const DEFAULT_RULES: Rule[] = [
  {
    method: 'GET',
    pattern: /\/org\/organization\/users\/me$/,
    answer: ok('me'),
  },
  {
    method: 'GET',
    pattern: /\/org\/organization\/metadata\/absenceNature$/,
    answer: ok('natures'),
  },
  {
    method: 'GET',
    pattern: /\/org\/organization\/metadata\/absenceStatus$/,
    answer: ok('statuses'),
  },
  {
    method: 'GET',
    pattern: /\/times\/v3\/entitlements\/tsa$/,
    answer: () => ({ status: 200, body: [] }),
  },
  {
    method: 'GET',
    pattern: /\/times\/v3\/entitlements$/,
    answer: ok('entitlements'),
  },
  {
    method: 'GET',
    pattern: /\/times\/v3\/odata\/requests$/,
    answer: ok('requests'),
  },
  {
    method: 'GET',
    pattern: /\/times\/v3\/planners\/me$/,
    answer: ok('planner-me'),
  },
  {
    method: 'GET',
    pattern: /\/times\/v3\/planners\/holidays$/,
    answer: ok('holidays'),
  },
  {
    method: 'GET',
    pattern: /\/times\/v3\/planners\/service$/,
    answer: ok('planner-service'),
  },
  {
    method: 'GET',
    pattern: /\/times\/v3\/requests\/workflows\/me$/,
    answer: ok('workflows-me'),
  },
  {
    method: 'GET',
    pattern: /\/times\/v3\/requests\/\d+\/preview$/,
    answer: ok('preview'),
  },
  {
    method: 'GET',
    pattern: /\/times\/v3\/requests\/preview$/,
    answer: ok('preview'),
  },
  {
    method: 'POST',
    pattern: /\/times\/v3\/requests$/,
    answer: () => ({ status: 201, body: load('create') }),
  },
  {
    method: 'PUT',
    pattern: /\/times\/v3\/requests\/\d+\/workflows\/\d+$/,
    answer: ok('cancel'),
  },
  {
    method: 'PUT',
    pattern: /\/times\/v3\/requests\/\d+$/,
    answer: ok('update'),
  },
];

export type QsCall = {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: unknown;
};

export type QsFixtures = {
  calls: QsCall[];
  override: (method: string, pattern: RegExp, answer: () => Answer) => void;
  failNext: (
    method: string,
    pattern: RegExp,
    status: number,
    body?: unknown,
  ) => void;
  callsTo: (pattern: RegExp) => QsCall[];
};

export const installQsFixtures = async (page: Page): Promise<QsFixtures> => {
  const calls: QsCall[] = [];
  const overrides: Rule[] = [];
  const oneShots: Rule[] = [];

  const handler = async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api\/qs\//, '');
    const method = request.method();
    const postData = request.postData();
    calls.push({
      method,
      path,
      query: Object.fromEntries(url.searchParams),
      headers: request.headers(),
      body: postData === null ? null : JSON.parse(postData),
    });
    const matches = (rule: Rule) =>
      rule.method === method && rule.pattern.test(url.pathname);
    const shotIndex = oneShots.findIndex(matches);
    const rule =
      shotIndex >= 0
        ? oneShots.splice(shotIndex, 1)[0]!
        : (overrides.find(matches) ?? DEFAULT_RULES.find(matches));
    if (!rule) {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: '{"error":"no fixture"}',
      });
      return;
    }
    const answer = rule.answer();
    await route.fulfill({
      status: answer.status,
      contentType: 'application/json',
      headers: { 'cache-control': 'no-store' },
      body: JSON.stringify(answer.body),
    });
  };
  await page.route('**/api/qs/**', handler);

  return {
    calls,
    override: (method, pattern, answer) =>
      void overrides.unshift({ method, pattern, answer }),
    failNext: (
      method,
      pattern,
      status,
      body = { errors: [{ message: 'fixture failure' }] },
    ) =>
      void oneShots.push({ method, pattern, answer: () => ({ status, body }) }),
    callsTo: (pattern) => calls.filter((call) => pattern.test(call.path)),
  };
};
