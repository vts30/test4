import type { User } from '../src/helper/types/user';

export const userPassword: string = process.env.USER_PASSWORD ?? 'Start12345';

export const configuredUser: User = {
  bankENV: process.env.BANK_ENV ?? 'SATU',
  bankNumber: process.env.BANK_NUMBER ?? process.env.ENV?.split('.').pop() ?? '8620',
  userID: process.env.LOGIN_USER_ID ?? 'YC8DCZA',
  name: process.env.USER_NAME ?? 'User001 M365 Egbert Karmann',
  rolles: process.env.USER_ROLES
    ? process.env.USER_ROLES.split(',')
    : [
        'Service-Catalogue und Service-Level-Management',
        'Workflowservice – Business-Analyst',
        'Service-Configuration-Management',
        'Service-Desk-Agent',
        'Security-Incident-Prozessmitarbeiter',
        'Knowledge-Manager',
        'Arbeitsanweisungen-Manager',
        'ESM – Service-Operator',
        'Aktivitäten-Manager',
        'Genehmigung-Manager',
      ],
  serviceCenter: process.env.SERVICE_CENTER ?? 'Service Center IT',
  job: process.env.USER_JOB ?? 'Leiter IT',
  modul: process.env.USER_MODUL ?? 'ESM',
  eMail: process.env.USER_EMAIL ?? 'User001.m365@ait-8620-prim.de',
};
