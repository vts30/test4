/**
 * Copy this file to: src/test/steps/login.steps.ts
 */

import { Given, setDefaultTimeout } from '@cucumber/cucumber';
import { fixture } from '../../hooks/pageFixture';
import LoginPage from '../pages/loginPage';
import { getUser, userPassword } from '../../helper/util/test-data/users';
import type { User } from '../../helper/types/user';
import StartseitePage from '../pages/startseitePage';

setDefaultTimeout(60 * 1000 * 2);

let user: User;
let loginPage: LoginPage;
let startseitePage: StartseitePage;

Given('User logs in {string} as {string}', async (module, userID) => {
  let baseURL: string;
  user = getUser(userID); // returns configuredUser from .env.satu regardless of userID
  switch (module) {
    case 'ESM':
      baseURL = process.env.BASEURLESM || '';
      break;
    case 'ITAdmin':
      baseURL = process.env.BASEURLESMITADMIN || '';
      break;
    default:
      throw new Error(`Unknown module: "${module}", please define a correct one.`);
  }
  loginPage = new LoginPage(fixture.page);
  await fixture.page.goto(baseURL.toString());
  await loginPage.login(user.userID, userPassword);

  startseitePage = new StartseitePage(fixture.page);
  startseitePage.validateStartseitePageIsVisible();
});
