/**
 * Merged hooks v2: test team hooks + perf recording (two-table DB design)
 *
 * Copy this file to their project: src/hooks/hooks.ts
 * Adjust import paths for perf-lib-v2 to match where packages/ is placed.
 *
 * DB schema: test_runs (one per Jenkins build) + observations (one per HTTP call)
 * Run status: 'running' → 'complete' (all ok) or 'partial' (some flushes failed)
 */

import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { BeforeAll, BeforeStep, Before, After, AfterAll, Status, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, Browser, BrowserContext, Request, Response } from '@playwright/test';
import { fixture } from './pageFixture';
import { createLogger } from 'winston';
import { options } from '../helper/util/logger';
import { createRecorder, type PerfRecord } from '../../packages/perf-lib-v2/recorder';
import { getQueue, type ObservationRecord } from '../../packages/perf-lib-v2/queue';
import { createContextSetter } from '../../packages/perf-lib-v2/context';
import { createRunManager, type RunManager } from '../../packages/perf-lib-v2/run';
import { closePool } from '../../packages/perf-lib-v2/db';

const fs = require('fs-extra');

if (existsSync('.env.satu')) dotenv.config({ path: '.env.satu' });

setDefaultTimeout(60 * 1000);

let browser: Browser;
let context: BrowserContext;
let runManager: RunManager;
let runId: string;
let hasFlushError = false;

// perf recording — one recorder per scenario
let recorder: ReturnType<typeof createRecorder>;
let onRequest: (req: Request) => void;
let onResponse: (res: Response) => void;
let usePerfContext: ReturnType<typeof createContextSetter>['usePerfContext'];
let getContext: ReturnType<typeof createContextSetter>['getContext'];
let scenarioName: string;

BeforeAll(async function () {
  browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false',
    executablePath: process.env.CHROME_PATH || undefined,
  });

  // create one test_run row for this entire Jenkins build
  runManager = createRunManager();
  runId = await runManager.start();

  getQueue().start();
});

BeforeStep(async function () {
  await fixture.page.waitForLoadState('domcontentloaded');
  await fixture.page.waitForLoadState('networkidle');
});

Before(async function ({ pickle }) {
  scenarioName = pickle.name;
  const headless = process.env.HEADLESS !== 'false';
  context = await browser.newContext({
    recordVideo: headless ? undefined : { dir: 'test-results/videos' },
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
  fixture.usePerfContext = usePerfContext;

  usePerfContext({
    name: pickle.name,
    env: process.env.PERF_ENV ?? 'local',
    version: process.env.PERF_VERSION ?? 'unknown',
  });

  onRequest = (req: Request) => recorder.onRequest(req, Date.now());
  onResponse = (res: Response) => recorder.onResponse(res, Date.now());
  fixture.page.on('request', onRequest);
  fixture.page.on('response', onResponse);
});

After(async function ({ pickle, result }) {
  fixture.page.off('request', onRequest);
  fixture.page.off('response', onResponse);

  // flush observations for this scenario
  const ctx = getContext();
  const metricName = ctx?.name ?? scenarioName;

  const queue = getQueue();
  const observations: ObservationRecord[] = recorder.records.map((r: PerfRecord) => ({
    ...r,
    metricName,
  }));
  queue.enqueue(observations);

  const success = await queue.flush(runId);
  if (!success) hasFlushError = true;

  // screenshot, video, trace
  let videoPath: string | undefined;
  let img: Buffer | undefined;
  const path = `./test-results/trace/${pickle.id}.zip`;
  if (result?.status === Status.PASSED) {
    img = await fixture.page.screenshot({
      path: `./test-results/screenshots/${pickle.name}.png`,
      type: 'png',
    });
    // @ts-ignore
    videoPath = fixture.page.video() ? await fixture.page.video().path() : undefined;
  }
  await context.tracing.stop({ path });
  await fixture.page.close();
  await context.close();
  if (result?.status === Status.PASSED) {
    // @ts-ignore
    if (img) this.attach(img, 'image/png');
    // @ts-ignore
    if (videoPath) this.attach(fs.readFileSync(videoPath), 'video/webm');
    const traceFileLink = `<a href="https://trace.playwright.dev/">Open ${path}</a>`;
    this.attach(`Trace file: ${traceFileLink}`, 'text/html');
  }
});

AfterAll(async function () {
  const queue = getQueue();
  queue.stop();

  // final flush in case anything remains
  if (queue.size() > 0) {
    const success = await queue.flush(runId);
    if (!success) hasFlushError = true;
  }

  // update test_run status — compensating: mark partial if any flush failed
  await runManager.finish(hasFlushError ? 'partial' : 'complete');

  await closePool();
  if (browser) await browser.close();
});
