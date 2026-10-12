import { expect, test, type Page } from '@playwright/test';
import { installQsFixtures, type QsFixtures } from './fixtures/qs';
import { buildToken } from './fixtures/token';
import requestsFixture from '../tests/fixtures/qs/requests.json' with { type: 'json' };
import updateFixture from '../tests/fixtures/qs/update.json' with { type: 'json' };

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

test('shorten a two-day request to one day', async ({ page }) => {
  const qs = await connect(page);
  qs.override('GET', /requests\/155\/preview$/, () => ({
    status: 200,
    body: {
      natures: [{ id: 75, reference: 'TT', entitlement: null }],
      segments: [
        {
          beginDate: '2026-10-22T00:00:00Z',
          endDate: '2026-10-22T23:00:00Z',
          duration: 1,
          natureId: 75,
        },
      ],
      overlappingRequests: [],
      conflictingEvents: [],
      warnings: [],
    },
  }));
  await cell(page, '2026-10-22').click();
  const card = page.getByTestId('request-card');
  await card.getByRole('button', { name: 'Change' }).click();
  await expect(card).toBeHidden();
  await expect(page.getByTestId('review-panel')).toContainText(
    'Change request',
  );
  await expect(cell(page, '2026-10-22')).toHaveClass(/selected/);
  await expect(cell(page, '2026-10-23')).toHaveClass(/selected/);
  await expect(
    page.getByTestId('brush-bar').locator('[data-nature-id="75"]'),
  ).toHaveAttribute('aria-pressed', 'true');
  await cell(page, '2026-10-23').click();
  await expect(cell(page, '2026-10-23')).not.toHaveClass(/selected/);
  const row = page.getByTestId('run-row').first();
  await expect(row).toContainText('22 Oct 2026');
  await expect(row).toContainText('1 day');
  await expect
    .poll(() =>
      qs.callsTo(/requests\/155\/preview$/).map((c) => c.query.endDate),
    )
    .toContain('2026-10-22T23:00:00Z');
  qs.override('GET', /odata\/requests$/, () => ({
    status: 200,
    body: {
      '@odata.count': 3,
      value: [updateFixture, ...requestsFixture.value.slice(1)],
    },
  }));
  await page.getByRole('button', { name: 'Save change' }).click();
  await expect(page.getByTestId('run-row')).toHaveCount(0);
  await expect(page.getByTestId('review-panel')).toContainText('Review');
  const puts = qs.callsTo(/requests\/155$/).filter((c) => c.method === 'PUT');
  expect(puts).toHaveLength(1);
  expect(puts[0]!.body).toMatchObject({
    duration: 1,
    beginDate: '2026-10-22T00:00:00Z',
    endDate: '2026-10-22T23:00:00Z',
    segments: [{ natureId: 75, duration: 1, entitlementId: null }],
  });
  await expect(cell(page, '2026-10-22')).toHaveClass(/full/);
  await expect(cell(page, '2026-10-23')).not.toHaveClass(/painted/);
});

test('Escape leaves edit mode and restores the grid', async ({ page }) => {
  await connect(page);
  await cell(page, '2026-10-22').click();
  await page
    .getByTestId('request-card')
    .getByRole('button', { name: 'Change' })
    .click();
  await expect(page.getByTestId('review-panel')).toContainText(
    'Change request',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('review-panel')).toContainText('Review');
  await expect(cell(page, '2026-10-22')).not.toHaveClass(/selected/);
  await expect(cell(page, '2026-10-22')).toHaveClass(/full/);
});
