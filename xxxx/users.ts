import type { User } from '../src/helper/types/user';

export const userPassword: string = 'Start12345';

// bankNumber is derived from BANK_NUMBER env var, or parsed from ENV (e.g. SATU.8620 → 8620)
const bankNumber = process.env.BANK_NUMBER ?? process.env.ENV?.split('.').pop() ?? '8620';

export const users: Record<string, User> = {
  YC8DCZA: {
    bankENV: 'SATU',
    bankNumber,
    userID: 'YC8DCZA',
    name: 'User001 M365 Egbert Karmann',
    rolles: [
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
    serviceCenter: 'Service Center IT',
    job: 'Leiter IT',
    modul: 'ESM',
    eMail: 'User001.m365@ait-8620-prim.de',
  },
  YC8DCZG: {
    bankENV: 'SATU',
    bankNumber,
    userID: 'YC8DCZG',
    name: 'User007 M365 Helmar Biskup',
    rolles: [
      'Service-Desk-Agent',
      'Security-Incident-Prozessmitarbeiter',
      'Knowledge-Prozessmitarbeiter',
      'Arbeitsanweisungen-Prozessmitarbeiter',
      'Aktivitäten-Manager',
      'Genehmigung-Manager',
    ],
    serviceCenter: 'Service Center IT',
    job: 'Service Desk IT',
    modul: 'ESM',
    eMail: 'user007.m365@ait-8620-prim.de',
  },
  // add remaining users here following the same pattern
};
