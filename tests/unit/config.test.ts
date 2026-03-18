import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('resolveConfig', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.PERF_ENV;
    delete process.env.PERF_VERSION;
    delete process.env.DATABASE_URL;
    delete process.env.PG_HOST;
  });

  it('returns defaults when no env vars or config file', async () => {
    vi.mock('fs', async (importOriginal) => {
      const actual = await importOriginal<typeof import('fs')>();
      return { ...actual, existsSync: () => false };
    });
    const { resolveConfig } = await import('../../src/config');
    const cfg = resolveConfig();
    expect(cfg.environment).toBe('local');
    expect(cfg.version).toBe('unknown');
    expect(cfg.database.host).toBe('localhost');
    expect(cfg.database.port).toBe(5432);
  });

  it('env vars take priority over defaults', async () => {
    process.env.PERF_ENV = 'staging';
    process.env.PERF_VERSION = '2.0.0';
    process.env.PG_HOST = 'db.example.com';
    vi.mock('fs', async (importOriginal) => {
      const actual = await importOriginal<typeof import('fs')>();
      return { ...actual, existsSync: () => false };
    });
    const { resolveConfig } = await import('../../src/config');
    const cfg = resolveConfig();
    expect(cfg.environment).toBe('staging');
    expect(cfg.version).toBe('2.0.0');
    expect(cfg.database.host).toBe('db.example.com');
  });
});
