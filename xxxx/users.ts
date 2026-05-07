import type { User } from '../src/helper/types/user';

export const userPassword: string = process.env.USER_PASSWORD ?? 'Start12345';

export const configuredUser: User = {
  bankENV: process.env.BANK_ENV ?? 'SATU',
  bankNumber: process.env.BANK_NUMBER ?? process.env.ENV?.split('.').pop() ?? '8620',
  userID: process.env.LOGIN_USER_ID ?? 'YC8DCZA',
  name: process.env.USER_NAME ?? '',
  rolles: [],
  serviceCenter: process.env.SERVICE_CENTER ?? '',
  job: process.env.USER_JOB ?? '',
  modul: process.env.USER_MODUL ?? 'ESM',
  eMail: process.env.USER_EMAIL ?? '',
};
