import { expect, test, type Page } from '@playwright/test';
import { installQsFixtures, type QsFixtures } from './fixtures/qs';
import { buildToken } from './fixtures/token';

const connect = async (page: Page): Promise<QsFixtures> => {
  const qs = await installQsFixtures(page);
  await page.goto('/connect');
  await page.getByLabel('Tenant').fill('fulll');
  await page.getByLabel('Token').fill(buildToken());
  await page.getByRole('button', { name: 'Connect' }).click();
  await expect(page.locator('[data-date="2026-10-22"]')).toHaveClass(/full/);
  return qs;
};

test('the column lists the colleagues off today with am/pm marks', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-10-12T09:00:00+02:00'));
  const qs = await connect(page);
  const column = page.getByTestId('whos-off');
  await expect(column).toContainText('12 Oct 2026');
  const people = column.getByTestId('person');
  await expect(people).toHaveCount(2);
  await expect(people.nth(0)).toContainText('Bea Sample');
  await expect(people.nth(0)).toContainText('TECH');
  await expect(people.nth(0).getByTestId('mark')).toHaveCount(0);
  await expect(people.nth(1)).toContainText('Cyr Demo');
  await expect(people.nth(1).getByTestId('mark')).toHaveText('pm');
  await expect(column).not.toContainText('Alex Example');
  const service = qs.callsTo(/planners\/service$/);
  expect(service).toHaveLength(1);
  expect(service[0]!.query).toMatchObject({
    beginDate: '2026-10-01T00:00:00Z',
    endDate: '2026-10-31T23:00:00Z',
    top: '500',
    thumbnails: 'medium',
  });
});

test('a click on a day without a brush focuses it, Today returns', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-10-12T09:00:00+02:00'));
  const qs = await connect(page);
  const column = page.getByTestId('whos-off');
  await page.locator('[data-date="2026-12-24"]').click();
  await expect(column).toContainText('24 Dec 2026');
  await expect(column).toContainText('Everyone is in');
  await expect.poll(() => qs.callsTo(/planners\/service$/).length).toBe(2);
  await page.locator('[data-date="2026-12-23"]').click();
  await expect(column).toContainText('23 Dec 2026');
  expect(qs.callsTo(/planners\/service$/)).toHaveLength(2);
  await column.getByRole('button', { name: 'Today' }).click();
  await expect(column).toContainText('12 Oct 2026');
  await expect(column.getByTestId('person')).toHaveCount(2);
});

test('Alt-click focuses a day even while a brush is active', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-10-12T09:00:00+02:00'));
  await connect(page);
  await page.keyboard.press('t');
  await page.locator('[data-date="2026-11-03"]').click({ modifiers: ['Alt'] });
  await expect(page.getByTestId('whos-off')).toContainText('3 Nov 2026');
  await expect(page.locator('[data-date="2026-11-03"]')).not.toHaveClass(
    /selected/,
  );
});
