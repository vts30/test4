import { World, setWorldConstructor, IWorldOptions } from '@cucumber/cucumber';
import { BrowserContext, Page, Request, Response } from '@playwright/test';
import { Recorder } from '../perf-lib/recorder';
import { UsePerfContext, PerfContext } from '../perf-lib/context';

export class PerfWorld extends World {
  browserContext!: BrowserContext;
  page!: Page;
  recorder!: Recorder;
  usePerfContext!: UsePerfContext;
  getContext!: () => PerfContext | null;
  scenarioName = '';
  onRequest!: (req: Request) => void;
  onResponse!: (res: Response) => void;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(PerfWorld);
