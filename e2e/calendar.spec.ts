import { expect, test, type Page } from '@playwright/test';
import { installQsFixtures, type QsFixtures } from './fixtures/qs';
import { buildToken } from './fixtures/token';

const connect = async (page: Page): Promise<QsFixtures> => {
  const qs = await installQsFixtures(page);
  await page.goto('/connect');
  await page.getByLabel('Tenant').fill('fulll');
  await page.getByLabel('Token').fill(buildToken());
  await page.getByRole('button', { name: 'Connect' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('[data-date="2026-10-22"]')).toBeVisible();
  return qs;
};

test('the fixture year renders painted halves, holidays and pending dots', async ({
  page,
}) => {
  await connect(page);
  const tt = page.locator('[data-date="2026-10-22"]');
  await expect(tt).toHaveClass(/full/);
  await expect(tt).toHaveClass(/pending/);
  await expect(tt.locator('[data-half="pm"]')).toHaveAttribute(
    'style',
    /--nature-tt/,
  );
  const half = page.locator('[data-date="2026-10-14"]');
  await expect(half).not.toHaveClass(/full/);
  await expect(half.locator('[data-half="am"]')).not.toHaveAttribute(
    'style',
    /nature/,
  );
  await expect(half.locator('[data-half="pm"]')).toHaveAttribute(
    'style',
    /--nature-cp/,
  );
  await expect(half).not.toHaveClass(/pending/);
  const holiday = page.locator('[data-date="2026-11-11"]');
  await expect(holiday).toHaveClass(/muted/);
  await expect(holiday).toHaveAttribute('title', 'Armistice 1918');
  await expect(page.locator('[data-date="2026-10-03"]')).toHaveClass(/muted/);
  await expect(page.locator('[data-date="2026-10-12"]')).toHaveClass(/today/);
});

test('hover shows the request card, click pins it, Escape unpins', async ({
  page,
}) => {
  await connect(page);
  await page.locator('[data-date="2026-10-22"]').hover();
  const card = page.getByTestId('request-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Télétravail');
  await expect(card).toContainText('22–23 Oct 2026');
  await expect(card).toContainText('2 days');
  await expect(card).toContainText('pending');
  await expect(card.getByRole('button', { name: 'Change' })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Cancel' })).toBeVisible();
  await page.locator('[data-date="2026-10-22"]').click();
  await page.mouse.move(5, 5);
  await expect(card).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card).toBeHidden();
});

test('a request without a cancel workflow shows no cancel control', async ({
  page,
}) => {
  await connect(page);
  await page.locator('[data-date="2026-10-14"]').hover();
  const card = page.getByTestId('request-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Congés Payés');
  await expect(card).toContainText('0.5 day');
  await expect(card.getByRole('button', { name: 'Cancel' })).toHaveCount(0);
});

test('arrow keys change the year and refetch', async ({ page }) => {
  const qs = await connect(page);
  await page.keyboard.press('ArrowRight');
  await expect(page.getByTestId('year')).toHaveText('2027');
  await expect(page.locator('[data-year="2027"]')).toBeVisible();
  await expect
    .poll(() => qs.callsTo(/odata\/requests$/).map((c) => c.query.beginDate))
    .toContain('2027-01-01T00:00:00Z');
  await expect(page.locator('[data-date="2027-01-02"]')).not.toHaveClass(
    /full/,
  );
  await expect(
    page.locator('[data-date="2027-01-02"] [data-half="am"]'),
  ).toHaveAttribute('style', /--nature-cp/);
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByTestId('year')).toHaveText('2026');
});

test('a failed part shows a retry control that reloads it', async ({
  page,
}) => {
  const qs = await installQsFixtures(page);
  qs.failNext('GET', /planners\/holidays$/, 503, { message: 'down' });
  await page.goto('/connect');
  await page.getByLabel('Tenant').fill('fulll');
  await page.getByLabel('Token').fill(buildToken());
  await page.getByRole('button', { name: 'Connect' }).click();
  await expect(page.locator('[data-date="2026-10-22"]')).toHaveClass(/full/);
  await expect(page.locator('[data-date="2026-11-11"]')).not.toHaveClass(
    /muted/,
  );
  const retry = page.getByRole('button', { name: 'Retry holidays' });
  await expect(retry).toBeVisible();
  await retry.click();
  await expect(page.locator('[data-date="2026-11-11"]')).toHaveClass(/muted/);
  await expect(retry).toBeHidden();
});
