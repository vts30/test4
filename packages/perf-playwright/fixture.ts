import { test as base, expect } from '@playwright/test';
import { createRecorder } from '../perf-lib/recorder';
import { getQueue } from '../perf-lib/queue';
import { resolveConfig } from '../perf-lib/config';
import { createContextSetter, type UsePerfContext } from '../perf-lib/context';

type PerfFixtures = {
  usePerfContext: UsePerfContext;
};

export const test = base.extend<PerfFixtures>({
  usePerfContext: [
    async ({ page }, use, testInfo) => {
      const recorder = createRecorder();
      const { usePerfContext, getContext } = createContextSetter();
      const queue = getQueue();
      const config = resolveConfig();

      queue.start();

      // Attach recorder to page events
      const onRequest = (req: Parameters<typeof recorder.onRequest>[0]) =>
        recorder.onRequest(req, Date.now());
      const onResponse = (res: Parameters<typeof recorder.onResponse>[0]) =>
        recorder.onResponse(res, Date.now());

      page.on('request', onRequest);
      page.on('response', onResponse);

      // Expose usePerfContext to the test
      await use(usePerfContext);

      // Teardown: flush records to queue
      page.off('request', onRequest);
      page.off('response', onResponse);

      const ctx = getContext();
      const testName = ctx?.name ?? testInfo.title;
      const environment = ctx?.env ?? config.environment;
      const version = ctx?.version ?? config.version;

      const queueRecords = recorder.records.map((r) => ({
        ...r,
        testName,
        environment,
        version,
      }));

      queue.enqueue(queueRecords);
      await queue.flush();

      // Optional verbose output
      if (process.env.PERF_VERBOSE === 'true') {
        console.log(`\n[perf] ${testName} (${environment}@${version})`);
        for (const r of recorder.records) {
          const size = r.responseSizeBytes ? `${(r.responseSizeBytes / 1024).toFixed(1)}kb` : '-';
          console.log(`  ${r.method.padEnd(6)} ${r.url.substring(0, 80).padEnd(80)} ${r.statusCode}  ${r.responseTimeMs}ms  ${size}`);
        }
      }
    },
    { auto: true },
  ],
});

export { expect };
