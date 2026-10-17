import { expect, test, type Page } from '@playwright/test';
import { installQsFixtures } from './fixtures/qs';
import { buildToken } from './fixtures/token';

type StubAnswer = { kind: string; token?: string; expiresAt?: number };

const stubBridge = async (page: Page, answers: StubAnswer[]) => {
  await page.addInitScript((queue: StubAnswer[]) => {
    const calls: unknown[] = [];
    const runtime = {
      sendMessage: (
        _id: string,
        message: unknown,
        callback: (answer: unknown) => void,
      ) => {
        calls.push(message);
        const answer = queue.length > 1 ? queue.shift() : queue[0];
        setTimeout(() => callback(answer), 10);
      },
    };
    Object.defineProperty(window, 'chrome', {
      configurable: true,
      value: { runtime },
    });
    Object.defineProperty(window, 'bridgeCalls', { value: calls });
  }, answers);
};

const bridgeCalls = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { bridgeCalls: unknown[] }).bridgeCalls,
  );

const tokenAnswer = (token: string): StubAnswer => ({
  kind: 'token',
  token,
  expiresAt: Date.now() + 3_600_000,
});

test('a stored tenant connects with the extension without a paste', async ({
  page,
}) => {
  await installQsFixtures(page);
  await stubBridge(page, [tokenAnswer(buildToken())]);
  await page.addInitScript(() =>
    localStorage.setItem('qc.tenant', JSON.stringify('fulll')),
  );
  await page.goto('/connect');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('user-avatar')).toHaveAttribute(
    'title',
    'Alex Example',
  );
  expect(await bridgeCalls(page)).toEqual([{ type: 'token', tenant: 'fulll' }]);
});

test('Connect with an empty token asks the extension for the typed tenant', async ({
  page,
}) => {
  await installQsFixtures(page);
  await stubBridge(page, [tokenAnswer(buildToken())]);
  await page.goto('/connect');
  await page.getByLabel('Tenant').fill('fulll');
  await page.getByRole('button', { name: 'Connect' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('a login answer keeps the paste and says what to do', async ({ page }) => {
  await installQsFixtures(page);
  await stubBridge(page, [{ kind: 'login' }]);
  await page.goto('/connect');
  await page.getByLabel('Tenant').fill('fulll');
  await page.getByRole('button', { name: 'Connect' }).click();
  await expect(page.getByRole('alert')).toContainText('asks you to sign in');
  await expect(page).toHaveURL(/\/connect$/);
  await page.getByLabel('Token').fill(buildToken());
  await page.getByRole('button', { name: 'Connect' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('without the extension an empty token asks for a paste', async ({
  page,
}) => {
  const qs = await installQsFixtures(page);
  await page.goto('/connect');
  await page.getByLabel('Tenant').fill('fulll');
  await page.getByRole('button', { name: 'Connect' }).click();
  await expect(page.getByRole('alert')).toContainText('Paste a token');
  expect(qs.calls).toHaveLength(0);
});

test('a 401 with the extension retries without the prompt', async ({
  page,
}) => {
  const qs = await installQsFixtures(page);
  await stubBridge(page, [tokenAnswer(buildToken(7200))]);
  await page.goto('/connect');
  await page.getByLabel('Tenant').fill('fulll');
  await page.getByLabel('Token').fill(buildToken());
  await page.getByRole('button', { name: 'Connect' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => qs.callsTo(/planners\/me$/).length).toBe(2);
  qs.failNext('GET', /planners\/me$/, 401, { message: 'expired' });
  await page.getByRole('button', { name: 'Next year' }).click();
  await expect(page.getByTestId('year')).toHaveText('2027–28');
  await expect
    .poll(() => qs.callsTo(/planners\/me$/).length)
    .toBeGreaterThanOrEqual(4);
  await expect(page.getByTestId('token-prompt')).toHaveCount(0);
  expect(await bridgeCalls(page)).toHaveLength(1);
});
