import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

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

  it('flush does not call DB when PERF_CSV_PATH is set', async () => {
    const csvPath = join(tmpdir(), `perf-test-${Date.now()}.csv`);
    process.env.PERF_CSV_PATH = csvPath;
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
    expect(mockInsert).not.toHaveBeenCalled();
    delete process.env.PERF_CSV_PATH;
    if (existsSync(csvPath)) unlinkSync(csvPath);
  });

  it('flush writes CSV header and row when PERF_CSV_PATH is set', async () => {
    const csvPath = join(tmpdir(), `perf-test-${Date.now()}.csv`);
    process.env.PERF_CSV_PATH = csvPath;
    const { getQueue } = await import('../../src/queue');
    const q = getQueue();
    q.enqueue([{
      testName: 'my-test', environment: 'ci', version: '2.0',
      url: 'https://example.com/api', method: 'GET', statusCode: 200,
      responseTimeMs: 123, responseSizeBytes: 456, contentType: 'application/json', assertions: { 'cache-control': 'no-cache' }
    }]);
    await q.flush();
    const contents = readFileSync(csvPath, 'utf-8');
    const lines = contents.trim().split('\n');
    expect(lines[0]).toBe('test_name,environment,version,url,method,status_code,response_time_ms,response_size_bytes,content_type,assertions,recorded_at');
    expect(lines[1]).toContain('my-test,ci,2.0,https://example.com/api,GET,200,123,456,application/json');
    delete process.env.PERF_CSV_PATH;
    unlinkSync(csvPath);
  });

  it('flush appends rows without repeating header when file already exists', async () => {
    const csvPath = join(tmpdir(), `perf-test-${Date.now()}.csv`);
    process.env.PERF_CSV_PATH = csvPath;
    const { getQueue } = await import('../../src/queue');
    const q = getQueue();
    const record = {
      testName: 'test', environment: 'local', version: '1.0',
      url: 'https://example.com', method: 'GET', statusCode: 200,
      responseTimeMs: 100, responseSizeBytes: null, contentType: null, assertions: {}
    };
    q.enqueue([record]);
    await q.flush();
    q.enqueue([record]);
    await q.flush();
    const lines = readFileSync(csvPath, 'utf-8').trim().split('\n');
    const headerLines = lines.filter(l => l.startsWith('test_name,'));
    expect(headerLines).toHaveLength(1);
    expect(lines).toHaveLength(3); // header + 2 data rows
    delete process.env.PERF_CSV_PATH;
    unlinkSync(csvPath);
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
