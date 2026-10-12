# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: connect.spec.ts >> a 401 on a later call shows the token prompt and a new token resumes
- Location: e2e/connect.spec.ts:93:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('token-prompt')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByTestId('token-prompt') with timeout 5000ms
  - waiting for getByTestId('token-prompt')

```

```yaml
- banner:
    - img "Alex Example"
    - text: Alex Example
    - button "Previous year": ‹
    - text: '2027'
    - button "Next year": ›
    - text: token until 18:08
    - button "Forget token"
    - 'button "Theme: system"'
- main:
    - heading "quarksCharm" [level=1]
```

# Test source

```ts
  5   | test('an anonymous visit redirects to /connect', async ({ page }) => {
  6   |   await installQsFixtures(page);
  7   |   await page.goto('/');
  8   |   await expect(page).toHaveURL(/\/connect$/);
  9   |   await expect(page.getByRole('heading', { name: 'Connect' })).toBeVisible();
  10  | });
  11  |
  12  | test('a malformed token shows the inline error without a request', async ({
  13  |   page,
  14  | }) => {
  15  |   const qs = await installQsFixtures(page);
  16  |   await page.goto('/connect');
  17  |   await page.getByLabel('Tenant').fill('fulll');
  18  |   await page.getByLabel('Token').fill('this is not a jwt');
  19  |   await page.getByRole('button', { name: 'Connect' }).click();
  20  |   await expect(page.getByText('This is not a quarksUp token')).toBeVisible();
  21  |   expect(qs.calls).toHaveLength(0);
  22  |   await expect(page).toHaveURL(/\/connect$/);
  23  | });
  24  |
  25  | test('a rejected token stays on connect, keeps the tenant, clears the token', async ({
  26  |   page,
  27  | }) => {
  28  |   const qs = await installQsFixtures(page);
  29  |   qs.override('GET', /users\/me$/, () => ({
  30  |     status: 401,
  31  |     body: { message: 'unauthorized' },
  32  |   }));
  33  |   await page.goto('/connect');
  34  |   await page.getByLabel('Tenant').fill('fulll');
  35  |   await page.getByLabel('Token').fill(buildToken());
  36  |   await page.getByRole('button', { name: 'Connect' }).click();
  37  |   await expect(page.getByText('Token rejected')).toBeVisible();
  38  |   await expect(page.getByLabel('Tenant')).toHaveValue('fulll');
  39  |   await expect(page.getByLabel('Token')).toHaveValue('');
  40  |   await expect(page).toHaveURL(/\/connect$/);
  41  | });
  42  |
  43  | test('a valid token lands on / with the name and the expiry in the header', async ({
  44  |   page,
  45  | }) => {
  46  |   const qs = await installQsFixtures(page);
  47  |   const token = buildToken();
  48  |   await page.goto('/connect');
  49  |   await page.getByLabel('Tenant').fill('fulll');
  50  |   await page.getByLabel('Token').fill(`Bearer ${token}`);
  51  |   await page.getByRole('button', { name: 'Connect' }).click();
  52  |   await expect(page).toHaveURL(/\/$/);
  53  |   await expect(page.getByTestId('user-name')).toHaveText('Alex Example');
  54  |   await expect(page.getByTestId('token-until')).toHaveText(
  55  |     `token until ${tokenExpiryLabel(token)}`,
  56  |   );
  57  |   const me = qs.callsTo(/users\/me$/);
  58  |   expect(me).toHaveLength(1);
  59  |   expect(me[0]!.headers['authorization']).toBe(`Bearer ${token}`);
  60  |   expect(me[0]!.headers['x-qs-tenant']).toBe('fulll');
  61  |   await page.reload();
  62  |   await expect(page).toHaveURL(/\/$/);
  63  |   await expect(page.getByTestId('user-name')).toHaveText('Alex Example');
  64  | });
  65  |
  66  | test('forget token returns to connect with the tenant prefilled', async ({
  67  |   page,
  68  | }) => {
  69  |   await installQsFixtures(page);
  70  |   await page.goto('/connect');
  71  |   await page.getByLabel('Tenant').fill('fulll');
  72  |   await page.getByLabel('Token').fill(buildToken());
  73  |   await page.getByRole('button', { name: 'Connect' }).click();
  74  |   await expect(page).toHaveURL(/\/$/);
  75  |   await page.getByRole('button', { name: 'Forget token' }).click();
  76  |   await expect(page).toHaveURL(/\/connect$/);
  77  |   await expect(page.getByLabel('Tenant')).toHaveValue('fulll');
  78  |   const stored = await page.evaluate(() => localStorage.getItem('qc.token'));
  79  |   expect(stored).toBeNull();
  80  | });
  81  |
  82  | test('a connected user opening /connect is sent to /', async ({ page }) => {
  83  |   await installQsFixtures(page);
  84  |   await page.goto('/connect');
  85  |   await page.getByLabel('Tenant').fill('fulll');
  86  |   await page.getByLabel('Token').fill(buildToken());
  87  |   await page.getByRole('button', { name: 'Connect' }).click();
  88  |   await expect(page).toHaveURL(/\/$/);
  89  |   await page.goto('/connect');
  90  |   await expect(page).toHaveURL(/\/$/);
  91  | });
  92  |
  93  | test('a 401 on a later call shows the token prompt and a new token resumes', async ({
  94  |   page,
  95  | }) => {
  96  |   const qs = await installQsFixtures(page);
  97  |   await page.goto('/connect');
  98  |   await page.getByLabel('Tenant').fill('fulll');
  99  |   await page.getByLabel('Token').fill(buildToken());
  100 |   await page.getByRole('button', { name: 'Connect' }).click();
  101 |   await expect(page).toHaveURL(/\/$/);
  102 |   qs.failNext('GET', /planners\/me$/, 401, { message: 'expired' });
  103 |   await page.getByRole('button', { name: 'Next year' }).click();
  104 |   const prompt = page.getByTestId('token-prompt');
> 105 |   await expect(prompt).toBeVisible();
      |                        ^ Error: expect(locator).toBeVisible() failed
  106 |   await expect(page.getByTestId('user-name')).toHaveText('Alex Example');
  107 |   await prompt.getByLabel('Token').fill(buildToken(7200));
  108 |   await prompt.getByRole('button', { name: 'Connect' }).click();
  109 |   await expect(prompt).toBeHidden();
  110 |   expect(qs.callsTo(/planners\/me$/).length).toBeGreaterThanOrEqual(2);
  111 | });
  112 |
```
