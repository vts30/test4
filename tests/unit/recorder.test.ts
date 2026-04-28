import { describe, it, expect } from 'vitest';
import { createRecorder } from '../../packages/perf-lib/recorder';

describe('createRecorder', () => {
  it('returns an empty records array initially', () => {
    const recorder = createRecorder();
    expect(recorder.records).toEqual([]);
  });

  it('onRequest + onResponse pair produces a record', async () => {
    const recorder = createRecorder();

    const fakeRequest = {
      url: () => 'https://example.com/api',
      method: () => 'GET',
    };

    const fakeResponse = {
      request: () => fakeRequest,
      status: () => 200,
      headers: () => ({ 'content-type': 'application/json', 'content-length': '512' }),
    };

    const startTime = Date.now();
    recorder.onRequest(fakeRequest as any, startTime);

    await new Promise((r) => setTimeout(r, 10));

    recorder.onResponse(fakeResponse as any, Date.now());

    expect(recorder.records).toHaveLength(1);
    const rec = recorder.records[0];
    expect(rec.url).toBe('https://example.com/api');
    expect(rec.method).toBe('GET');
    expect(rec.statusCode).toBe(200);
    expect(rec.responseTimeMs).toBeGreaterThanOrEqual(10);
    expect(rec.responseSizeBytes).toBe(512);
    expect(rec.contentType).toBe('application/json');
    expect(rec.assertions).toBeDefined();
  });

  it('ignores responses with no matching request', () => {
    const recorder = createRecorder();
    const fakeResponse = {
      request: () => ({ url: () => 'https://example.com', method: () => 'GET' }),
      status: () => 200,
      headers: () => ({}),
    };
    recorder.onResponse(fakeResponse as any, Date.now());
    expect(recorder.records).toHaveLength(0);
  });
});
