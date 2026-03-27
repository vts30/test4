import { test, expect } from '../src/fixture';

test('example.com homepage loads with correct content', async ({ page, usePerfContext }) => {
  usePerfContext({ name: 'example-com-homepage', env: 'prod', version: '1.0.0' });

  await page.goto('https://example.com');

  await expect(page.locator('h1')).toHaveText('Example Domain');
  await expect(page.locator('p a')).toHaveAttribute('href', 'https://iana.org/domains/example');
});

test('login and check app', async ({ page, usePerfContext }) => {
  usePerfContext({ name: 'login', env: 'prod', version: '1.0.0' });

  const loginUrl = process.env.LOGIN_URL!;
  const appsUrl  = process.env.APPS_URL!;
  const user     = process.env.LOGIN_USER!;
  const password = process.env.LOGIN_PASSWORD!;

  const authDone = page.waitForResponse(
    res => res.url().includes('/inf/auth/ddbAuthentication') && res.request().method() === 'POST'
  );

  await page.goto(`${loginUrl}?login=${user}`);
  await page.locator('#passwd').fill(password);
  await page.locator('#submit-button').click();
  await authDone;

  await page.goto(appsUrl);
  await expect(page.locator('text=ForumIdM')).toBeVisible();

  const startenBtn = page.locator('.btn.btn-primary', { hasText: 'Starten' });
  if (await startenBtn.count() > 0) {
    await startenBtn.first().click();
  }

  await page.waitForTimeout(2000);

  const updateBtn = page.locator('.btn.btn-primary', { hasText: 'Update starten' });
  if (await updateBtn.count() > 0) {
    await updateBtn.first().click();
  }

  await expect(page.locator('text=ForumIdM')).toBeVisible();
});
