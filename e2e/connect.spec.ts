import { expect, test } from '@playwright/test';
import { installQsFixtures } from './fixtures/qs';
import { buildToken, tokenExpiryLabel } from './fixtures/token';

test('an anonymous visit redirects to /connect', async ({ page }) => {
  await installQsFixtures(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/connect$/);
  await expect(page.getByRole('heading', { name: 'Connect' })).toBeVisible();
});

test('a malformed token shows the inline error without a request', async ({
  page,
}) => {
  const qs = await installQsFixtures(page);
  await page.goto('/connect');
  await page.getByLabel('Tenant').fill('fulll');
  await page.getByLabel('Token').fill('this is not a jwt');
  await page.getByRole('button', { name: 'Connect' }).click();
  await expect(page.getByText('This is not a quarksUp token')).toBeVisible();
  expect(qs.calls).toHaveLength(0);
  await expect(page).toHaveURL(/\/connect$/);
});

test('a rejected token stays on connect, keeps the tenant, clears the token', async ({
  page,
}) => {
  const qs = await installQsFixtures(page);
  qs.override('GET', /users\/me$/, () => ({
    status: 401,
    body: { message: 'unauthorized' },
  }));
  await page.goto('/connect');
  await page.getByLabel('Tenant').fill('fulll');
  await page.getByLabel('Token').fill(buildToken());
  await page.getByRole('button', { name: 'Connect' }).click();
  await expect(page.getByText('Token rejected')).toBeVisible();
  await expect(page.getByLabel('Tenant')).toHaveValue('fulll');
  await expect(page.getByLabel('Token')).toHaveValue('');
  await expect(page).toHaveURL(/\/connect$/);
});

test('a valid token lands on / with the name and the expiry in the header', async ({
  page,
}) => {
  const qs = await installQsFixtures(page);
  const token = buildToken();
  await page.goto('/connect');
  await page.getByLabel('Tenant').fill('fulll');
  await page.getByLabel('Token').fill(`Bearer ${token}`);
  await page.getByRole('button', { name: 'Connect' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('user-name')).toHaveText('Alex Example');
  await expect(page.getByTestId('token-until')).toHaveText(
    `token until ${tokenExpiryLabel(token)}`,
  );
  const me = qs.callsTo(/users\/me$/);
  expect(me).toHaveLength(1);
  expect(me[0]!.headers['authorization']).toBe(`Bearer ${token}`);
  expect(me[0]!.headers['x-qs-tenant']).toBe('fulll');
  await page.reload();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId('user-name')).toHaveText('Alex Example');
});

test('forget token returns to connect with the tenant prefilled', async ({
  page,
}) => {
  await installQsFixtures(page);
  await page.goto('/connect');
  await page.getByLabel('Tenant').fill('fulll');
  await page.getByLabel('Token').fill(buildToken());
  await page.getByRole('button', { name: 'Connect' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('button', { name: 'Forget token' }).click();
  await expect(page).toHaveURL(/\/connect$/);
  await expect(page.getByLabel('Tenant')).toHaveValue('fulll');
  const stored = await page.evaluate(() => localStorage.getItem('qc.token'));
  expect(stored).toBeNull();
});

test('a connected user opening /connect is sent to /', async ({ page }) => {
  await installQsFixtures(page);
  await page.goto('/connect');
  await page.getByLabel('Tenant').fill('fulll');
  await page.getByLabel('Token').fill(buildToken());
  await page.getByRole('button', { name: 'Connect' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/connect');
  await expect(page).toHaveURL(/\/$/);
});

test('a 401 on a later call shows the token prompt and a new token resumes', async ({
  page,
}) => {
  const qs = await installQsFixtures(page);
  await page.goto('/connect');
  await page.getByLabel('Tenant').fill('fulll');
  await page.getByLabel('Token').fill(buildToken());
  await page.getByRole('button', { name: 'Connect' }).click();
  await expect(page).toHaveURL(/\/$/);
  qs.failNext('GET', /planners\/me$/, 401, { message: 'expired' });
  await page.getByRole('button', { name: 'Next year' }).click();
  const prompt = page.getByTestId('token-prompt');
  await expect(prompt).toBeVisible();
  await expect(page.getByTestId('user-name')).toHaveText('Alex Example');
  await prompt.getByLabel('Token').fill(buildToken(7200));
  await prompt.getByRole('button', { name: 'Connect' }).click();
  await expect(prompt).toBeHidden();
  expect(qs.callsTo(/planners\/me$/).length).toBeGreaterThanOrEqual(2);
});
