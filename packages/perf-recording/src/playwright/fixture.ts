import { test as base, expect } from '@playwright/test';
import { createRecorder } from '../core/recorder';
import { getQueue, type ObservationRecord } from '../core/queue';
import { createContextSetter, type UsePerfContext } from '../core/context';

type PerfFixtures = {
  usePerfContext: UsePerfContext;
};

export const test = base.extend<PerfFixtures>({
  usePerfContext: [
    async ({ page }, use, testInfo) => {
      const recorder = createRecorder();
      const { usePerfContext, getContext } = createContextSetter();

      const onRequest  = (req: Parameters<typeof recorder.onRequest>[0])  => recorder.onRequest(req, Date.now());
      const onResponse = (res: Parameters<typeof recorder.onResponse>[0]) => recorder.onResponse(res, Date.now());

      page.on('request',  onRequest);
      page.on('response', onResponse);

      await use(usePerfContext);

      page.off('request',  onRequest);
      page.off('response', onResponse);

      const ctx = getContext();
      const metricName = ctx?.name ?? testInfo.title;

      const observations: ObservationRecord[] = recorder.records.map((r) => ({
        ...r,
        metricName,
      }));

      getQueue().enqueue(observations);
    },
    { auto: true },
  ],
});

export { expect };
