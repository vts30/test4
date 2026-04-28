import { test, expect } from '../packages/perf-playwright/fixture';

test('example.com homepage loads with correct content', async ({ page, usePerfContext }) => {
  usePerfContext({ name: 'example-com-homepage', env: 'prod', version: '1.0.0' });

  await page.goto('https://example.com');

  await expect(page.locator('h1')).toHaveText('Example Domain');
  await expect(page.locator('p a')).toHaveAttribute('href', 'https://iana.org/domains/example');
});

test('login and check app', async ({ page, usePerfContext }) => {
  const loginUrl = process.env.LOGIN_URL!;
  const appsUrl  = process.env.APPS_URL!;
  const user     = process.env.LOGIN_USER!;
  const password = process.env.LOGIN_PASSWORD!;

  const authDone = page.waitForResponse(
    res => res.url().includes('/nf/auth/doAuthentication.do') && res.request().method() === 'POST'
  );

  await page.goto(loginUrl);
  await page.locator('#login').fill(user);
  await page.locator('#passwd').fill(password);
  await page.locator('#submit-button').click();
  await authDone;

  await page.goto(appsUrl);

  await expect(page.frameLocator('#hlpInnerIframe').locator('.mx-scrollcontainer-left').getByText('Startseite')).toBeVisible({ timeout: 20000 });

  await expect(page.frameLocator('#hlpInnerIframe').locator('.mx-scrollcontainer-center').getByText('Benutzer Einstellungen')).toBeVisible({ timeout: 20000 });
  await page.frameLocator('#hlpInnerIframe').locator('.mx-scrollcontainer-center').getByText('Benutzer Einstellungen').click();

  await page.frameLocator('#hlpInnerIframe').locator('.mx-name-staticImage2').click();

  const softwareVersion = await page.frameLocator('#hlpInnerIframe')
    .locator('h4.mx-name-text1')
    .textContent();

  const browserVersion = page.context().browser()?.version() ?? 'unknown';

  usePerfContext({
    name: 'login-esm',
    env: process.env.PERF_ENV ?? 'prod',
    version: `app:${softwareVersion?.trim()} browser:${browserVersion}`,
  });
});
