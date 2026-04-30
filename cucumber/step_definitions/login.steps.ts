import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { PerfWorld } from '../../packages/perf-cucumber/world';

Given('the login page is open', async function (this: PerfWorld) {
  await this.page.goto(process.env.LOGIN_URL!);
});

When('the user logs in with valid credentials', async function (this: PerfWorld) {
  const authDone = this.page.waitForResponse(
    (res) =>
      res.url().includes('/nf/auth/doAuthentication.do') && res.request().method() === 'POST',
  );
  await this.page.locator('#login').fill(process.env.LOGIN_USER!);
  await this.page.locator('#passwd').fill(process.env.LOGIN_PASSWORD!);
  await this.page.locator('#submit-button').click();
  await authDone;
});

When('the user navigates to the apps page', async function (this: PerfWorld) {
  await this.page.goto(process.env.APPS_URL!);
});

Then('the Startseite navigation item is visible', async function (this: PerfWorld) {
  await expect(
    this.page
      .frameLocator('#ihpInnerIframe')
      .locator('.mx-scrollcontainer-left')
      .getByText('Startseite'),
  ).toBeVisible({ timeout: 20000 });
});

When('the user opens Benutzer Einstellungen', async function (this: PerfWorld) {
  const frame = this.page.frameLocator('#ihpInnerIframe');
  await expect(
    frame.locator('.mx-scrollcontainer-center').getByText('Benutzer Einstellungen'),
  ).toBeVisible({ timeout: 20000 });
  await frame.locator('.mx-scrollcontainer-center').getByText('Benutzer Einstellungen').click();
  await frame.locator('.mx-name-staticImage2').click();
});

Then('the software version and browser version are recorded', async function (this: PerfWorld) {
  const softwareVersion = await this.page
    .frameLocator('#ihpInnerIframe')
    .locator('h4.mx-name-text1')
    .textContent();

  const browserVersion = this.page.context().browser()?.version() ?? 'unknown';

  this.usePerfContext({
    name: 'login-esm',
    env: process.env.PERF_ENV ?? 'prod',
    version: `app:${softwareVersion?.trim()} browser:${browserVersion}`,
  });
});
