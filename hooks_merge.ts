/**
 * Merged hooks: test team hooks + perf recording
 *
 * Copy this file to their project: src/hooks/hooks.ts
 * Adjust import paths for perf-lib to match where packages/ is placed:
 *   e.g. '../../packages/perf-lib/recorder'
 */

import { BeforeAll, BeforeStep, Before, After, AfterAll, Status, setDefaultTimeout } from '@cucumber/cucumber';
import { Browser, BrowserContext, Request, Response } from '@playwright/test';
import { fixture } from './pageFixture';
import { invokeBrowser } from '../helper/browsers/browserManager';
import { getEnv } from '../helper/env/env';
import { createLogger } from 'winston';
import { options } from '../helper/util/logger';
// perf-lib imports — adjust path if packages/ is placed elsewhere
import { createRecorder, type PerfRecord } from '../../packages/perf-lib/recorder';
import { getQueue } from '../../packages/perf-lib/queue';
import { createContextSetter } from '../../packages/perf-lib/context';
import { resolveConfig } from '../../packages/perf-lib/config';
import { closePool } from '../../packages/perf-lib/db';

const fs = require('fs-extra');

setDefaultTimeout(60 * 1000);

let browser: Browser;
let context: BrowserContext;

// perf recording — one recorder per scenario
let recorder: ReturnType<typeof createRecorder>;
let onRequest: (req: Request) => void;
let onResponse: (res: Response) => void;
let usePerfContext: ReturnType<typeof createContextSetter>['usePerfContext'];
let getContext: ReturnType<typeof createContextSetter>['getContext'];
let scenarioName: string;

BeforeAll(async function () {
  getEnv();
  browser = await invokeBrowser();
  getQueue().start();
});

BeforeStep(async function () {
  await fixture.page.waitForLoadState('domcontentloaded');
  await fixture.page.waitForLoadState('networkidle');
});

Before(async function ({ pickle }) {
  scenarioName = pickle.name;
  context = await browser.newContext({
    recordVideo: { dir: 'test-results/videos' },
  });
  await context.tracing.start({
    name: pickle.name + pickle.id,
    title: pickle.name,
    sources: true,
    screenshots: true,
    snapshots: true,
  });
  const page = await context.newPage();
  fixture.page = page;
  fixture.logger = createLogger(options(pickle.name + pickle.id));

  // perf recording setup
  recorder = createRecorder();
  const contextSetter = createContextSetter();
  usePerfContext = contextSetter.usePerfContext;
  getContext = contextSetter.getContext;
  fixture.usePerfContext = usePerfContext; // use in step definitions to set scenario name/version

  // auto-set perf context with browser version so version is never "unknown"
  const browserVersion = context.browser()?.version() ?? 'unknown';
  usePerfContext({
    name: pickle.name,
    env: process.env.PERF_ENV ?? 'local',
    version: `browser:${browserVersion}`,
  });

  onRequest = (req: Request) => recorder.onRequest(req, Date.now());
  onResponse = (res: Response) => recorder.onResponse(res, Date.now());
  fixture.page.on('request', onRequest);
  fixture.page.on('response', onResponse);
});

After(async function ({ pickle, result }) {
  // stop perf recording
  fixture.page.off('request', onRequest);
  fixture.page.off('response', onResponse);

  // flush perf records to DB/CSV
  const config = resolveConfig();
  const ctx = getContext();
  const testName = ctx?.name ?? scenarioName;
  const environment = ctx?.env ?? config.environment;
  const version = ctx?.version ?? config.version;

  const queue = getQueue();
  const records = recorder.records.map((r: PerfRecord) => ({ ...r, testName, environment, version }));
  queue.enqueue(records);
  await queue.flush();

  // their existing: screenshot, video, trace
  let videoPath: string;
  let img: Buffer;
  const path = `./test-results/trace/${pickle.id}.zip`;
  if (result?.status === Status.PASSED) {
    img = await fixture.page.screenshot({
      path: `./test-results/screenshots/${pickle.name}.png`,
      type: 'png',
    });
    // @ts-ignore
    videoPath = await fixture.page.video().path();
  }
  await context.tracing.stop({ path });
  await fixture.page.close();
  await context.close();
  if (result?.status === Status.PASSED) {
    // @ts-ignore
    this.attach(img, 'image/png');
    // @ts-ignore
    this.attach(fs.readFileSync(videoPath), 'video/webm');
    const traceFileLink = `<a href="https://trace.playwright.dev/">Open ${path}</a>`;
    this.attach(`Trace file: ${traceFileLink}`, 'text/html');
  }
});

AfterAll(async function () {
  const queue = getQueue();
  queue.stop();
  await queue.flush();
  await closePool();
  if (browser) {
    await browser.close();
  }
});
