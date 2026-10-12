import { expect, test, type Page } from '@playwright/test';
import { installQsFixtures, type QsFixtures } from './fixtures/qs';
import { buildToken } from './fixtures/token';

const connect = async (page: Page): Promise<QsFixtures> => {
  await page.clock.setFixedTime(new Date('2026-10-12T09:00:00+02:00'));
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

const expectCursor = async (page: Page, date: string) => {
  await expect(page.locator('.cell.cursor')).toHaveCount(1);
  await expect(cell(page, date)).toHaveClass(/cursor/);
};

const press = async (page: Page, ...keys: string[]) => {
  for (const key of keys) await page.keyboard.press(key);
};

test('the cursor starts on today and a click moves it', async ({ page }) => {
  await connect(page);
  await expectCursor(page, '2026-10-12');
  await expect(cell(page, '2026-10-12')).toHaveAttribute(
    'aria-label',
    '12 Oct 2026',
  );
  await cell(page, '2026-11-05').click();
  await expectCursor(page, '2026-11-05');
});

test('j moves a week and the who-is-off column follows the cursor', async ({
  page,
}) => {
  await connect(page);
  const column = page.getByTestId('whos-off');
  await cell(page, '2026-10-28').click();
  await expect(column).toContainText('28 Oct 2026');
  await press(page, 'j');
  await expectCursor(page, '2026-11-04');
  await expect(column).toContainText('4 Nov 2026');
  await press(page, 'k', 'h', 'ArrowDown', 'ArrowRight');
  await expectCursor(page, '2026-11-04');
  await press(page, 'Shift+H');
  await expectCursor(page, '2026-10-04');
  await press(page, 'Shift+J');
  await expectCursor(page, '2027-02-04');
  await expect(page.getByTestId('year')).toHaveText('2027');
  await press(page, 'Shift+K', 'Shift+L');
  await expectCursor(page, '2026-11-04');
  await press(page, '.');
  await expectCursor(page, '2026-10-12');
  await expect(column).toContainText('12 Oct 2026');
});

test('l on 31 December shows the next year and its first day', async ({
  page,
}) => {
  const qs = await connect(page);
  await cell(page, '2026-12-31').click();
  await press(page, 'l');
  await expect(page.getByTestId('year')).toHaveText('2027');
  await expectCursor(page, '2027-01-01');
  await expect
    .poll(() => qs.callsTo(/odata\/requests$/).map((c) => c.query.beginDate))
    .toContain('2027-01-01T00:00:00Z');
  await press(page, 'ArrowLeft');
  await expect(page.getByTestId('year')).toHaveText('2026');
  await expectCursor(page, '2026-12-31');
});

test('] and [ switch the year, the arrow keys keep it', async ({ page }) => {
  await connect(page);
  await press(page, 'ArrowRight');
  await expect(page.getByTestId('year')).toHaveText('2026');
  await expectCursor(page, '2026-10-13');
  await press(page, ']');
  await expect(page.getByTestId('year')).toHaveText('2027');
  await expectCursor(page, '2027-10-13');
  await press(page, '[');
  await expect(page.getByTestId('year')).toHaveText('2026');
});

test('the physical J key moves the cursor on a Russian layout', async ({
  page,
}) => {
  await connect(page);
  await page.evaluate(() =>
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'о', code: 'KeyJ', bubbles: true }),
    ),
  );
  await expectCursor(page, '2026-10-19');
  await page.evaluate(() =>
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'а', code: 'KeyF', bubbles: true }),
    ),
  );
  await expect(
    page.getByTestId('brush-bar').locator('[data-nature-id="17"]'),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('Space paints a free day, not a Saturday, and p paints the afternoon', async ({
  page,
}) => {
  await connect(page);
  await press(page, 'Space');
  await expect(page.getByTestId('brush-bar')).toHaveClass(/highlighted/);
  await expect(cell(page, '2026-10-12')).not.toHaveClass(/selected/);
  await press(page, 't', 'j', 'j', 'j', 'Space');
  await expect(cell(page, '2026-11-02')).toHaveClass(/selected/);
  await expect(page.getByTestId('run-row')).toHaveCount(1);
  await expect(page.getByTestId('run-row').first()).toContainText('2 Nov 2026');
  await press(page, 'k', 'h', 'h', 'Space');
  await expectCursor(page, '2026-10-24');
  await expect(cell(page, '2026-10-24')).not.toHaveClass(/selected/);
  await press(page, 'j', 'l', 'l', 'l', 'p');
  await expectCursor(page, '2026-11-03');
  const pm = cell(page, '2026-11-03');
  await expect(pm).toHaveClass(/selected/);
  await expect(pm).not.toHaveClass(/full/);
  await expect(pm.locator('[data-half="pm"]')).toHaveAttribute(
    'style',
    /--nature-tt/,
  );
  await expect(pm.locator('[data-half="am"]')).not.toHaveAttribute(
    'style',
    /nature/,
  );
});

test('v, four l and Space paint Monday to Friday as one run', async ({
  page,
}) => {
  await connect(page);
  await press(page, 'f', 'j', 'j', 'j', 'v', 'l', 'l', 'l', 'l');
  await expect(cell(page, '2026-11-04')).toHaveClass(/ranged/);
  await press(page, 'Space');
  for (const day of ['02', '03', '04', '05', '06']) {
    await expect(cell(page, `2026-11-${day}`)).toHaveClass(/selected/);
    await expect(cell(page, `2026-11-${day}`)).not.toHaveClass(/ranged/);
  }
  await expect(page.getByTestId('run-row')).toHaveCount(1);
  await expect(page.getByTestId('run-row').first()).toContainText(
    '2–6 Nov 2026',
  );
});

test('Escape leaves a range without painting', async ({ page }) => {
  await connect(page);
  await press(page, 'f', 'v', 'l', 'l');
  await expect(cell(page, '2026-10-13')).toHaveClass(/ranged/);
  await press(page, 'Escape');
  await expect(page.locator('.cell.ranged')).toHaveCount(0);
  await expect(page.getByTestId('run-row')).toHaveCount(0);
  await expect(
    page.getByTestId('brush-bar').locator('[data-nature-id="17"]'),
  ).toHaveAttribute('aria-pressed', 'true');
});

test('u undoes the last paint and U redoes it', async ({ page }) => {
  await connect(page);
  await press(page, 't', 'j', 'j', 'j', 'Space');
  await expect(page.getByTestId('run-row')).toHaveCount(1);
  await press(page, 'u');
  await expect(page.getByTestId('run-row')).toHaveCount(0);
  await expect(cell(page, '2026-11-02')).not.toHaveClass(/selected/);
  await press(page, 'Shift+U');
  await expect(page.getByTestId('run-row')).toHaveCount(1);
  await expect(cell(page, '2026-11-02')).toHaveClass(/selected/);
});

test('Space on the focused Clear button clears and paints nothing', async ({
  page,
}) => {
  await connect(page);
  await press(page, 't', 'Space', 'l');
  await expect(page.getByTestId('run-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear' }).focus();
  await press(page, 'Space');
  await expect(page.getByTestId('run-row')).toHaveCount(0);
  await expect(cell(page, '2026-10-13')).not.toHaveClass(/selected/);
});

test('? opens the sheet, other keys wait until it closes', async ({ page }) => {
  await connect(page);
  await press(page, 'Shift+Slash');
  const sheet = page.getByTestId('shortcut-sheet');
  await expect(sheet).toBeVisible();
  for (const text of [
    'One week',
    'Paint',
    'Change',
    'Undo',
    'Redo',
    'next year',
  ])
    await expect(sheet).toContainText(text);
  await press(page, 'j');
  await expectCursor(page, '2026-10-12');
  await press(page, 'Escape');
  await expect(sheet).toBeHidden();
  await press(page, 'j');
  await expectCursor(page, '2026-10-19');
  await press(page, 'Shift+Slash', 'Shift+Slash');
  await expect(sheet).toBeHidden();
});
