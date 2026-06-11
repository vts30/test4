import { BeforeAll, Before, After, AfterAll, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, Browser, Request, Response } from '@playwright/test';
import { createRecorder, type PerfRecord } from '../core/recorder';
import { getQueue, type ObservationRecord } from '../core/queue';
import { createContextSetter } from '../core/context';
import { createRunManager, type RunManager } from '../core/run';
import { closePool } from '../core/db';
import type { PerfWorld } from './world';

export function registerPerfHooks(timeoutMs = 60_000): void {
  setDefaultTimeout(timeoutMs);

  let browser: Browser;
  let runManager: RunManager;

  BeforeAll(async function () {
    browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
      executablePath: process.env.CHROME_PATH || undefined,
    });
    runManager = createRunManager();
    runManager.start();
  });

  Before(async function (this: PerfWorld, { pickle }) {
    this.scenarioName = pickle.name;
    this.browserContext = await browser.newContext();
    this.page = await this.browserContext.newPage();
    this.recorder = createRecorder();

    const { usePerfContext, getContext } = createContextSetter();
    this.usePerfContext = usePerfContext;
    this.getContext = getContext;

    this.onRequest  = (req: Request) => this.recorder.onRequest(req, Date.now());
    this.onResponse = (res: Response) => this.recorder.onResponse(res, Date.now());
    this.page.on('request',  this.onRequest);
    this.page.on('response', this.onResponse);
  });

  After(async function (this: PerfWorld) {
    this.page.off('request',  this.onRequest);
    this.page.off('response', this.onResponse);

    const ctx = this.getContext();
    const metricName = ctx?.name ?? this.scenarioName;

    const observations: ObservationRecord[] = this.recorder.records.map((r: PerfRecord) => ({
      ...r,
      metricName,
    }));
    getQueue().enqueue(observations);

    await this.page.close();
    await this.browserContext.close();
  });

  AfterAll(async function () {
    const observations = getQueue().drain();
    await runManager.finish(observations);
    await closePool();
    await browser?.close();
  });
}
