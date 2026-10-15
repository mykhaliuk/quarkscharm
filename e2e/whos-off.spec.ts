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
  const remote = column.getByTestId('whos-off-remote');
  const away = column.getByTestId('whos-off-away');
  await expect(remote).toContainText('On remote today');
  await expect(away).toContainText('Off today');
  await expect(remote.getByTestId('person')).toHaveCount(1);
  await expect(remote.getByTestId('person')).toContainText('Cyr Demo');
  await expect(remote.getByTestId('mark')).toHaveText('pm');
  await expect(remote.getByTestId('nature')).toHaveCount(0);
  await expect(away.getByTestId('person')).toHaveCount(2);
  const bea = away.getByTestId('person').filter({ hasText: 'Bea Sample' });
  await expect(bea).toContainText('TECH');
  await expect(bea.getByTestId('mark')).toHaveCount(0);
  await expect(bea.getByTestId('nature')).toHaveText('Congés Payés');
  const eve = away.getByTestId('person').filter({ hasText: 'Eve Product' });
  await expect(eve).toContainText('PRODUIT');
  await expect(eve.getByTestId('nature')).toHaveText('Fulll Off');
  await expect(column).not.toContainText('Alex Example');
  await expect(column).not.toContainText('Finn Other');
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
  await expect(column).toContainText('All your favorites are in');
  await expect.poll(() => qs.callsTo(/planners\/service$/).length).toBe(2);
  await page.locator('[data-date="2026-12-23"]').click();
  await expect(column).toContainText('23 Dec 2026');
  expect(qs.callsTo(/planners\/service$/)).toHaveLength(2);
  await column.getByRole('button', { name: 'Today' }).click();
  await expect(column).toContainText('12 Oct 2026');
  await expect(column.getByTestId('person')).toHaveCount(3);
});

test('a click with a brush paints the day and focuses it', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-12T09:00:00+02:00'));
  await connect(page);
  await page.keyboard.press('t');
  await page.locator('[data-date="2026-11-02"]').click();
  await expect(page.getByTestId('whos-off')).toContainText('2 Nov 2026');
  await expect(page.locator('[data-date="2026-11-02"]')).toHaveClass(
    /selected/,
  );
});

test('a long remote list scrolls inside its section and keeps the off section', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-10-12T09:00:00+02:00'));
  const qs = await installQsFixtures(page);
  qs.override('GET', /planners\/service$/, () => ({
    status: 200,
    body: [{ id: 42, label: 'TECH', employees: crowd(40, 3) }],
  }));
  qs.override('GET', /people\/directories$/, () => ({
    status: 200,
    body: crowd(40, 3).map((person) => ({ id: person.id, pinned: true })),
  }));
  await page.goto('/connect');
  await page.getByLabel('Tenant').fill('fulll');
  await page.getByLabel('Token').fill(buildToken());
  await page.getByRole('button', { name: 'Connect' }).click();
  const column = page.getByTestId('whos-off');
  const remote = column.getByTestId('whos-off-remote');
  const away = column.getByTestId('whos-off-away');
  await expect(remote.getByTestId('person')).toHaveCount(40);
  await expect(away.getByTestId('person')).toHaveCount(3);
  const viewport = page.viewportSize()!.height;
  const box = (await column.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(viewport);
  const scrolls = async (section: typeof remote) =>
    section
      .locator('.list')
      .evaluate((list) => list.scrollHeight > list.clientHeight);
  expect(await scrolls(remote)).toBe(true);
  expect(await scrolls(away)).toBe(false);
});

function crowd(remoteCount: number, awayCount: number) {
  const me = { id: 9001, firstName: 'Alex', lastName: 'Example', absences: [] };
  const person = (index: number, periodId: number | null) => ({
    id: 10000 + index,
    firstName: 'Person',
    lastName: `${index}`,
    absences: [
      {
        id: 20000 + index,
        segments: [
          {
            id: 30000 + index,
            beginDate: '2026-10-12T00:00:00.000Z',
            endDate: '2026-10-12T23:00:00.000Z',
            duration: 1,
            periodId,
            validated: true,
          },
        ],
      },
    ],
  });
  const remote = Array.from({ length: remoteCount }, (_, i) => person(i, null));
  const away = Array.from({ length: awayCount }, (_, i) =>
    person(remoteCount + i, 38),
  );
  return [me, ...remote, ...away];
}

test('without favorites the column asks to pin people', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-12T09:00:00+02:00'));
  const qs = await installQsFixtures(page);
  qs.override('GET', /people\/directories$/, () => ({ status: 200, body: [] }));
  await page.goto('/connect');
  await page.getByLabel('Tenant').fill('fulll');
  await page.getByLabel('Token').fill(buildToken());
  await page.getByRole('button', { name: 'Connect' }).click();
  await expect(page.getByTestId('no-favorites')).toBeVisible();
  const calls = qs.callsTo(/people\/directories$/);
  expect(calls).toHaveLength(1);
  expect(calls[0]!.query).toMatchObject({ pinned: 'true' });
});
