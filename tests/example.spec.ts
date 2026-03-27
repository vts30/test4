import { test, expect } from '../src/fixture';

test('example.com homepage loads with correct content', async ({ page, usePerfContext }) => {
  usePerfContext({ name: 'example-com-homepage', env: 'prod', version: '1.0.0' });

  await page.goto('https://example.com');

  await expect(page.locator('h1')).toHaveText('Example Domain');
  await expect(page.locator('p a')).toHaveAttribute('href', 'https://iana.org/domains/example');
});

test('login and navigate to ESM', async ({ page, usePerfContext }) => {
  usePerfContext({ name: 'login-esm', env: 'prod', version: '1.0.0' });

  const loginUrl = process.env.LOGIN_URL!;
  const appsUrl  = process.env.APPS_URL!;
  const user     = process.env.LOGIN_USER!;
  const password = process.env.LOGIN_PASSWORD!;

  await page.goto(loginUrl);
  await page.locator('#login').fill(user);
  await page.locator('#passwd').fill(password);
  await Promise.all([
    page.waitForLoadState('domcontentloaded'),
    page.locator('#submit-button').click(),
  ]);

  await page.goto(appsUrl);
  await expect(page.locator('text=Meine Anwendungen')).toBeVisible();

  await page.getByText('ESM', { exact: true }).first().dblclick();
});
