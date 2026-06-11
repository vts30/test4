import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface PerfConfig {
  environment: string;
  version: string;
  buildId: string;
  gitRepo: string | null;
  gitHash: string | null;
  branch: string | null;
  testGitRepo: string | null;
  testGitHash: string | null;
  testGitBranch: string | null;
  testSuite: string | null;
  sprint: string | null;
  database: {
    connectionString?: string;
    host: string;
    port: number;
    user: string;
    password: string;
    dbName: string;
  };
}

interface JsonConfig {
  environment?: string;
  version?: string;
  database?: {
    connectionString?: string;
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    dbName?: string;
  };
}

function loadJsonConfig(): JsonConfig {
  const configPath = join(process.cwd(), 'perf.config.json');
  if (!existsSync(configPath)) return {};
  try {
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch {
    return {};
  }
}

export function resolveConfig(): PerfConfig {
  const json = loadJsonConfig();
  const jsonDb = json.database ?? {};

  return {
    environment:   process.env.PERF_ENV ?? json.environment ?? 'local',
    version:       process.env.PERF_VERSION ?? json.version ?? 'unknown',
    buildId:       process.env.BUILD_NUMBER ?? `local-${Date.now()}`,
    gitRepo:       process.env.GIT_URL ?? null,
    gitHash:       process.env.GIT_COMMIT ?? null,
    branch:        process.env.GIT_BRANCH ?? null,
    testGitRepo:   process.env.TEST_GIT_REPO ?? null,
    testGitHash:   process.env.TEST_GIT_HASH ?? null,
    testGitBranch: process.env.TEST_GIT_BRANCH ?? null,
    testSuite:     process.env.PERF_TEST_SUITE ?? null,
    sprint:        process.env.SPRINT ?? null,
    database: {
      connectionString: process.env.DATABASE_URL,
      host:     process.env.PG_HOST ?? jsonDb.host ?? 'localhost',
      port:     parseInt(process.env.PG_PORT ?? String(jsonDb.port ?? 5432), 10),
      user:     process.env.PG_USER ?? jsonDb.user ?? 'perf',
      password: process.env.PG_PASSWORD ?? jsonDb.password ?? 'perf',
      dbName:   process.env.PG_DB ?? jsonDb.dbName ?? 'perf_metrics',
    },
  };
}
