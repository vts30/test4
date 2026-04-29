import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { Before, After, BeforeAll, AfterAll, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, Browser, Request, Response } from '@playwright/test';
import { createRecorder, type PerfRecord } from '../perf-lib/recorder';
import { getQueue } from '../perf-lib/queue';
import { createContextSetter } from '../perf-lib/context';
import { resolveConfig } from '../perf-lib/config';
import { closePool } from '../perf-lib/db';
import { PerfWorld } from './world';

if (existsSync('.env.satu')) dotenv.config({ path: '.env.satu' });

setDefaultTimeout(60 * 1000);

let browser: Browser;

BeforeAll(async function () {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || undefined,
  });
  getQueue().start();
});

AfterAll(async function () {
  const queue = getQueue();
  queue.stop();
  await queue.flush();
  await closePool();
  await browser?.close();
});

Before(async function (this: PerfWorld, { pickle }) {
  this.scenarioName = pickle.name;
  this.browserContext = await browser.newContext();
  this.page = await this.browserContext.newPage();
  this.recorder = createRecorder();

  const { usePerfContext, getContext } = createContextSetter();
  this.usePerfContext = usePerfContext;
  this.getContext = getContext;

  this.onRequest = (req: Request) => this.recorder.onRequest(req, Date.now());
  this.onResponse = (res: Response) => this.recorder.onResponse(res, Date.now());
  this.page.on('request', this.onRequest);
  this.page.on('response', this.onResponse);
});

After(async function (this: PerfWorld) {
  this.page.off('request', this.onRequest);
  this.page.off('response', this.onResponse);

  const config = resolveConfig();
  const ctx = this.getContext();
  const testName = ctx?.name ?? this.scenarioName;
  const environment = ctx?.env ?? config.environment;
  const version = ctx?.version ?? config.version;

  const queue = getQueue();
  const records = this.recorder.records.map((r: PerfRecord) => ({ ...r, testName, environment, version }));
  queue.enqueue(records);
  await queue.flush();

  await this.page.close();
  await this.browserContext.close();
});
