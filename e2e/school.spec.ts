import { expect, test, type Page } from '@playwright/test';
import { installQsFixtures } from './fixtures/qs';
import { buildToken } from './fixtures/token';

const connect = async (page: Page) => {
  await page.clock.setFixedTime(new Date('2026-10-12T09:00:00+02:00'));
  await installQsFixtures(page);
  await page.goto('/connect');
  await page.getByLabel('Tenant').fill('fulll');
  await page.getByLabel('Token').fill(buildToken());
  await page.getByRole('button', { name: 'Connect' }).click();
  await expect(page.locator('[data-date="2026-10-22"]')).toHaveClass(/full/);
};

const dot = (page: Page, date: string) =>
  page.locator(`[data-date="${date}"] [data-testid="school-dot"]`);

test('school holidays are off by default with Zone B selected', async ({
  page,
}) => {
  await connect(page);
  await expect(page.getByTestId('school-toggle')).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(page.getByTestId('school-zone')).toHaveValue('Zone B');
  await expect(page.getByTestId('school-dot')).toHaveCount(0);
});

test('the toggle shows the dots of the zone and the zone select follows', async ({
  page,
}) => {
  await connect(page);
  await page.getByTestId('school-toggle').click();
  await expect(dot(page, '2027-02-20')).toBeVisible();
  await expect(dot(page, '2027-03-07')).toBeVisible();
  await expect(dot(page, '2027-03-08')).toHaveCount(0);
  await expect(dot(page, '2027-02-06')).toHaveCount(0);
  await expect(page.locator('[data-date="2027-02-22"]')).toHaveAttribute(
    'aria-label',
    "22 Feb 2027, Vacances d'Hiver (Zone B)",
  );
  await page.getByTestId('school-zone').selectOption('Zone C');
  await expect(dot(page, '2027-02-06')).toBeVisible();
  await expect(dot(page, '2027-03-07')).toHaveCount(0);
});

test('a school holiday day can be painted and shows its label on hover', async ({
  page,
}) => {
  await connect(page);
  await page.getByTestId('school-toggle').click();
  const day = page.locator('[data-date="2027-02-22"]');
  await day.hover();
  await expect(page.getByTestId('day-tooltip')).toHaveText(
    "Vacances d'Hiver (Zone B)",
  );
  await page.keyboard.press('f');
  await day.click();
  await expect(day).toHaveClass(/selected/);
  await expect(dot(page, '2027-02-22')).toBeVisible();
});

test('s switches the toggle and a reload keeps the choice', async ({
  page,
}) => {
  await connect(page);
  await page.keyboard.press('s');
  await expect(page.getByTestId('school-toggle')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByTestId('school-zone').selectOption('Zone A');
  await page.locator('[data-date="2026-10-12"]').click();
  await page.reload();
  await expect(page.getByTestId('school-toggle')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByTestId('school-zone')).toHaveValue('Zone A');
  await expect(dot(page, '2027-02-13')).toBeVisible();
  await page.keyboard.press('s');
  await expect(page.getByTestId('school-dot')).toHaveCount(0);
});
