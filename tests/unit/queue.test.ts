import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('queue', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts empty', async () => {
    const { getQueue } = await import('../../src/queue');
    const q = getQueue();
    expect(q.size()).toBe(0);
  });

  it('enqueue increases size', async () => {
    const { getQueue } = await import('../../src/queue');
    const q = getQueue();
    q.enqueue([{
      testName: 'test', environment: 'local', version: '1.0',
      url: 'https://example.com', method: 'GET', statusCode: 200,
      responseTimeMs: 100, responseSizeBytes: null, contentType: null, assertions: {}
    }]);
    expect(q.size()).toBe(1);
  });

  it('flush empties the queue and calls insert', async () => {
    const mockInsert = vi.fn().mockResolvedValue(undefined);
    vi.doMock('../../src/db', () => ({ getPool: () => ({ query: mockInsert }) }));
    const { getQueue } = await import('../../src/queue');
    const q = getQueue();
    q.enqueue([{
      testName: 'test', environment: 'local', version: '1.0',
      url: 'https://example.com', method: 'GET', statusCode: 200,
      responseTimeMs: 100, responseSizeBytes: null, contentType: null, assertions: {}
    }]);
    await q.flush();
    expect(q.size()).toBe(0);
    expect(mockInsert).toHaveBeenCalledOnce();
  });

  it('flush warns and continues if DB is unavailable', async () => {
    vi.doMock('../../src/db', () => ({ getPool: () => ({ query: vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) }) }));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getQueue } = await import('../../src/queue');
    const q = getQueue();
    q.enqueue([{
      testName: 'test', environment: 'local', version: '1.0',
      url: 'https://example.com', method: 'GET', statusCode: 200,
      responseTimeMs: 100, responseSizeBytes: null, contentType: null, assertions: {}
    }]);
    await q.flush();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[perf]'));
    expect(q.size()).toBe(0);
    warnSpy.mockRestore();
  });
});
