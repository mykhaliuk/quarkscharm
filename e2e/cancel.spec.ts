import { expect, test, type Page } from '@playwright/test';
import { installQsFixtures, type QsFixtures } from './fixtures/qs';
import { buildToken } from './fixtures/token';
import requestsFixture from '../tests/fixtures/qs/requests.json' with { type: 'json' };

const connect = async (page: Page): Promise<QsFixtures> => {
  const qs = await installQsFixtures(page);
  await page.goto('/connect');
  await page.getByLabel('Tenant').fill('fulll');
  await page.getByLabel('Token').fill(buildToken());
  await page.getByRole('button', { name: 'Connect' }).click();
  await expect(page.locator('[data-date="2026-10-22"]')).toHaveClass(/full/);
  return qs;
};

const cell = (page: Page, date: string) =>
  page.locator(`[data-date="${date}"]`);

test('a confirmed cancel calls the workflow and removes the request', async ({
  page,
}) => {
  const qs = await connect(page);
  await cell(page, '2026-10-22').click();
  const card = page.getByTestId('request-card');
  await card.getByRole('button', { name: 'Cancel' }).click();
  await expect(card).toContainText('Cancel Télétravail 22–23 Oct 2026?');
  qs.override('GET', /odata\/requests$/, () => ({
    status: 200,
    body: { '@odata.count': 2, value: requestsFixture.value.slice(1) },
  }));
  await card.getByRole('button', { name: 'Yes' }).click();
  await expect(card).toBeHidden();
  await expect(cell(page, '2026-10-22')).not.toHaveClass(/painted/);
  const calls = qs.callsTo(/requests\/155\/workflows\/11283$/);
  expect(calls).toHaveLength(1);
  expect(calls[0]!.method).toBe('PUT');
  expect(calls[0]!.body).toEqual({ fields: { comment: null } });
});

test('No restores the button and nothing is called', async ({ page }) => {
  const qs = await connect(page);
  await cell(page, '2026-10-22').click();
  const card = page.getByTestId('request-card');
  await card.getByRole('button', { name: 'Cancel' }).click();
  await card.getByRole('button', { name: 'No' }).click();
  await expect(card.getByRole('button', { name: 'Cancel' })).toBeVisible();
  expect(qs.callsTo(/workflows\/\d+$/)).toHaveLength(0);
});

test('the confirmation times out after five seconds without a request', async ({
  page,
}) => {
  const qs = await connect(page);
  await page.clock.install();
  await cell(page, '2026-10-22').click();
  const card = page.getByTestId('request-card');
  await card.getByRole('button', { name: 'Cancel' }).click();
  await expect(card.getByRole('button', { name: 'Yes' })).toBeVisible();
  await page.clock.runFor(5100);
  await expect(card.getByRole('button', { name: 'Yes' })).toBeHidden();
  await expect(card.getByRole('button', { name: 'Cancel' })).toBeVisible();
  expect(qs.callsTo(/workflows\/\d+$/)).toHaveLength(0);
});

test('a failed cancel keeps the card open with the message', async ({
  page,
}) => {
  const qs = await connect(page);
  await cell(page, '2026-10-22').click();
  const card = page.getByTestId('request-card');
  await card.getByRole('button', { name: 'Cancel' }).click();
  qs.failNext('PUT', /requests\/155\/workflows\/11283$/, 400, {
    errors: [{ message: 'Request already validated' }],
  });
  await card.getByRole('button', { name: 'Yes' }).click();
  await expect(card).toBeVisible();
  await expect(card.getByRole('alert')).toHaveText('Request already validated');
  await expect(cell(page, '2026-10-22')).toHaveClass(/painted/);
});

test('a confirmation does not carry over to another request', async ({
  page,
}) => {
  await connect(page);
  await cell(page, '2026-10-22').click();
  const card = page.getByTestId('request-card');
  await card.getByRole('button', { name: 'Cancel' }).click();
  await expect(card.getByRole('button', { name: 'Yes' })).toBeVisible();
  await cell(page, '2026-12-29').click();
  await expect(card).toBeVisible();
  await expect(card.getByRole('button', { name: 'Yes' })).toHaveCount(0);
});
