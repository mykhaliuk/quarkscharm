import { expect, test, type Page } from '@playwright/test';
import { installQsFixtures, type QsFixtures } from './fixtures/qs';
import { buildToken } from './fixtures/token';
import previewSplit from '../tests/fixtures/qs/preview-split.json' with { type: 'json' };
import createdFixture from '../tests/fixtures/qs/create.json' with { type: 'json' };
import requestsFixture from '../tests/fixtures/qs/requests.json' with { type: 'json' };
import entitlementsFixture from '../tests/fixtures/qs/entitlements.json' with { type: 'json' };

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

test('a click without a brush paints nothing and highlights the chips', async ({
  page,
}) => {
  await connect(page);
  await cell(page, '2026-11-02').click();
  await expect(cell(page, '2026-11-02')).not.toHaveClass(/selected/);
  await expect(page.getByTestId('brush-bar')).toHaveClass(/highlighted/);
});

test('the brush key again or Escape on an empty selection drops the brush', async ({
  page,
}) => {
  await connect(page);
  const chip = page.getByTestId('brush-bar').locator('[data-nature-id="17"]');
  await page.keyboard.press('f');
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('f');
  await expect(chip).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('f');
  await page.keyboard.press('Escape');
  await expect(chip).toHaveAttribute('aria-pressed', 'false');
});

test('drag Monday to Friday paints five days and the panel lists one run', async ({
  page,
}) => {
  const qs = await connect(page);
  await page.keyboard.press('f');
  await expect(
    page.getByTestId('brush-bar').locator('[data-nature-id="17"]'),
  ).toHaveAttribute('aria-pressed', 'true');
  const from = await cell(page, '2026-11-02').boundingBox();
  const to = await cell(page, '2026-11-06').boundingBox();
  await page.mouse.move(from!.x + 10, from!.y + 10);
  await page.mouse.down();
  await page.mouse.move(to!.x + 10, to!.y + 10, { steps: 8 });
  await page.mouse.up();
  for (const day of ['02', '03', '04', '05', '06']) {
    await expect(cell(page, `2026-11-${day}`)).toHaveClass(/selected/);
    await expect(
      cell(page, `2026-11-${day}`).locator('[data-half="pm"]'),
    ).toHaveAttribute('style', /--nature-foff/);
  }
  const panel = page.getByTestId('review-panel');
  const rows = panel.getByTestId('run-row');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Fulll Off');
  await expect(rows.first()).toContainText('2–6 Nov 2026');
  await expect(rows.first().getByTestId('segment')).toHaveCount(1);
  await expect(rows.first()).toContainText('3 days');
  await expect(rows.first().getByTestId('balance-after')).toHaveText('6 → 3');
  await expect(rows.first().getByTestId('overlap')).toHaveCount(0);
  await expect(panel.getByRole('button', { name: 'Submit 1' })).toBeEnabled();
  await expect
    .poll(() =>
      qs
        .callsTo(/requests\/preview$/)
        .map((c) => `${c.query.beginDate}..${c.query.endDate}`),
    )
    .toEqual(['2026-11-02T00:00:00Z..2026-11-06T23:00:00Z']);
});

test('a shift-click on the afternoon paints one half and the run shows 0.5 day', async ({
  page,
}) => {
  const qs = await connect(page);
  qs.override('GET', /requests\/preview$/, () => ({
    status: 200,
    body: {
      natures: [
        { id: 14, reference: 'CP', entitlement: { id: 388, balance: 4.82 } },
      ],
      segments: [
        {
          beginDate: '2026-11-03T13:00:00Z',
          endDate: '2026-11-03T23:00:00Z',
          duration: 0.5,
          natureId: 14,
        },
      ],
      overlappingRequests: [],
      conflictingEvents: [],
      warnings: [],
    },
  }));
  await page.keyboard.press('c');
  await cell(page, '2026-11-03')
    .locator('[data-half="pm"]')
    .click({ modifiers: ['Shift'] });
  const target = cell(page, '2026-11-03');
  await expect(target).toHaveClass(/selected/);
  await expect(target).not.toHaveClass(/full/);
  await expect(target.locator('[data-half="pm"]')).toHaveAttribute(
    'style',
    /--nature-cp/,
  );
  const row = page.getByTestId('run-row').first();
  await expect(row).toContainText('0.5 day');
  await expect(row.getByTestId('balance-after')).toHaveText('4.82 → 4.32');
  await expect
    .poll(() => qs.callsTo(/requests\/preview$/).map((c) => c.query.beginDate))
    .toContain('2026-11-03T13:00:00Z');
});

test('a split preview lists every segment and keeps one run', async ({
  page,
}) => {
  const qs = await connect(page);
  qs.override('GET', /requests\/preview$/, () => ({
    status: 200,
    body: previewSplit,
  }));
  await page.keyboard.press('c');
  const from = await cell(page, '2026-11-10').boundingBox();
  const to = await cell(page, '2026-11-12').boundingBox();
  await page.mouse.move(from!.x + 10, from!.y + 10);
  await page.mouse.down();
  await page.mouse.move(to!.x + 10, to!.y + 10, { steps: 5 });
  await page.mouse.up();
  const rows = page.getByTestId('run-row');
  await expect(rows).toHaveCount(1);
  await expect(rows.first().getByTestId('segment')).toHaveCount(2);
  await expect(rows.first()).toContainText('Le solde sera insuffisant');
  await expect(page.getByRole('button', { name: 'Submit 1' })).toBeEnabled();
});

test('a rejected preview shows its message and disables submit; Escape clears', async ({
  page,
}) => {
  const qs = await connect(page);
  qs.override('GET', /requests\/preview$/, () => ({
    status: 400,
    body: { errors: [{ message: 'Chevauchement avec une absence existante' }] },
  }));
  await page.keyboard.press('t');
  await cell(page, '2026-11-02').click();
  const row = page.getByTestId('run-row').first();
  await expect(row).toContainText('Chevauchement avec une absence existante');
  await expect(page.getByRole('button', { name: 'Submit 1' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('run-row')).toHaveCount(0);
  await expect(cell(page, '2026-11-02')).not.toHaveClass(/selected/);
});

test('an unavailable preview offers a retry', async ({ page }) => {
  const qs = await connect(page);
  qs.failNext('GET', /requests\/preview$/, 503, { message: 'down' });
  await page.keyboard.press('t');
  await cell(page, '2026-11-02').click();
  const row = page.getByTestId('run-row').first();
  const retry = row.getByRole('button', { name: 'Retry' });
  await expect(retry).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit 1' })).toBeDisabled();
  await retry.click();
  await expect(retry).toBeHidden();
  await expect(page.getByRole('button', { name: 'Submit 1' })).toBeEnabled();
});

const paintDay = async (page: Page, date: string) => {
  await cell(page, date).click();
  await expect(cell(page, date)).toHaveClass(/selected/);
};

test('three runs, the second fails: two are drawn, one stays with its error', async ({
  page,
}) => {
  const qs = await connect(page);
  qs.override('POST', /times\/v3\/requests$/, () => ({
    status: 201,
    body: createdFixture,
  }));
  let attempt = 0;
  qs.override('POST', /times\/v3\/requests$/, () => {
    attempt++;
    if (attempt === 2) {
      return { status: 400, body: { errors: [{ message: 'Chevauchement' }] } };
    }
    return { status: 201, body: createdFixture };
  });
  await page.keyboard.press('t');
  await paintDay(page, '2026-11-02');
  await paintDay(page, '2026-11-04');
  await paintDay(page, '2026-11-06');
  await expect(page.getByTestId('run-row')).toHaveCount(3);
  const submit = page.getByRole('button', { name: 'Submit 3' });
  await expect(submit).toBeEnabled();
  qs.override('GET', /odata\/requests$/, () => ({
    status: 200,
    body: {
      '@odata.count': 2,
      value: [
        ...requestsFixture.value,
        {
          ...createdFixture.result[0]!.result,
          id: 181,
          beginDate: '2026-11-02T00:00:00+01:00',
          endDate: '2026-11-02T23:00:00+01:00',
          segments: [
            {
              id: 501,
              beginDate: '2026-11-02T00:00:00+01:00',
              endDate: '2026-11-02T23:00:00+01:00',
              duration: 1,
              natureId: 75,
            },
          ],
        },
        {
          ...createdFixture.result[0]!.result,
          id: 182,
          beginDate: '2026-11-06T00:00:00+01:00',
          endDate: '2026-11-06T23:00:00+01:00',
          segments: [
            {
              id: 502,
              beginDate: '2026-11-06T00:00:00+01:00',
              endDate: '2026-11-06T23:00:00+01:00',
              duration: 1,
              natureId: 75,
            },
          ],
        },
      ],
    },
  }));
  await submit.click();
  await expect(page.getByTestId('run-row')).toHaveCount(1);
  await expect(page.getByTestId('run-row').first()).toContainText(
    'Chevauchement',
  );
  await expect(page.getByRole('button', { name: 'Submit 1' })).toBeVisible();
  await expect(cell(page, '2026-11-02')).toHaveClass(/pending/);
  await expect(cell(page, '2026-11-02')).not.toHaveClass(/selected/);
  await expect(cell(page, '2026-11-06')).toHaveClass(/pending/);
  await expect(cell(page, '2026-11-04')).toHaveClass(/selected/);
  const posts = qs
    .callsTo(/times\/v3\/requests$/)
    .filter((c) => c.method === 'POST');
  expect(posts).toHaveLength(3);
  expect(posts[0]!.query.workflowSequenceId).toBe('11281');
  expect(posts[0]!.headers['prefer']).toBe('return=representation');
  expect(posts[0]!.body).toMatchObject({
    duration: 3,
    employeeId: 9001,
    segments: [{ entitlementId: null, duration: 3, natureId: 75, id: null }],
    comment: null,
  });
});

test('Enter submits every previewed run', async ({ page }) => {
  const qs = await connect(page);
  await page.keyboard.press('t');
  await paintDay(page, '2026-11-02');
  await paintDay(page, '2026-11-04');
  await expect(page.getByRole('button', { name: 'Submit 2' })).toBeEnabled();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('run-row')).toHaveCount(0);
  await expect
    .poll(
      () =>
        qs.callsTo(/times\/v3\/requests$/).filter((c) => c.method === 'POST')
          .length,
    )
    .toBe(2);
});

test('Enter on a request day opens its card and submits nothing', async ({
  page,
}) => {
  const qs = await connect(page);
  await page.keyboard.press('t');
  await paintDay(page, '2026-11-02');
  await expect(page.getByRole('button', { name: 'Submit 1' })).toBeEnabled();
  for (const key of ['k', 'k', 'l', 'l', 'l']) await page.keyboard.press(key);
  await expect(cell(page, '2026-10-22')).toHaveClass(/cursor/);
  await page.keyboard.press('Enter');
  const card = page.getByTestId('request-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Télétravail');
  await expect(page.getByTestId('run-row')).toHaveCount(1);
  expect(
    qs.callsTo(/times\/v3\/requests$/).filter((c) => c.method === 'POST'),
  ).toHaveLength(0);
});

test('painting two CP days shows the projected balance in the counter', async ({
  page,
}) => {
  const qs = await connect(page);
  qs.override('GET', /requests\/preview$/, () => ({
    status: 200,
    body: {
      natures: [
        { id: 14, reference: 'CP', entitlement: { id: 388, balance: 4.82 } },
      ],
      segments: [
        {
          beginDate: '2026-11-02T00:00:00Z',
          endDate: '2026-11-03T23:00:00Z',
          duration: 2,
          natureId: 14,
        },
      ],
      overlappingRequests: [],
      conflictingEvents: [],
      warnings: [],
    },
  }));
  const cp = page.locator('[data-entitlement-id="388"]');
  await expect(cp.getByTestId('balance')).toHaveText('4.82');
  await page.keyboard.press('c');
  const from = await cell(page, '2026-11-02').boundingBox();
  const to = await cell(page, '2026-11-03').boundingBox();
  await page.mouse.move(from!.x + 10, from!.y + 10);
  await page.mouse.down();
  await page.mouse.move(to!.x + 10, to!.y + 10, { steps: 4 });
  await page.mouse.up();
  await expect(cp.getByTestId('balance')).toHaveText('4.82 → 2.82');
  await expect(
    page.locator('[data-entitlement-id="656"]').getByTestId('balance'),
  ).toHaveText('6');
  await page.keyboard.press('Escape');
  await expect(cp.getByTestId('balance')).toHaveText('4.82');
});

test('counters reload after a cancel', async ({ page }) => {
  const qs = await connect(page);
  await expect(
    page.locator('[data-entitlement-id="388"]').getByTestId('balance'),
  ).toHaveText('4.82');
  qs.override('GET', /times\/v3\/entitlements$/, () => ({
    status: 200,
    body: [{ ...entitlementsFixture[0]!, balance: 5.32, used: 3 }],
  }));
  await cell(page, '2026-10-22').click();
  const card = page.getByTestId('request-card');
  await card.getByRole('button', { name: 'Cancel' }).click();
  await card.getByRole('button', { name: 'Yes' }).click();
  await expect(
    page.locator('[data-entitlement-id="388"]').getByTestId('balance'),
  ).toHaveText('5.32');
});
