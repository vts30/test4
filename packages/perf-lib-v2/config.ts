import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface PerfConfigV2 {
  environment: string;
  version: string;
  buildId: string | null;
  gitHash: string | null;
  branch: string | null;
  testSuite: string | null;
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

export function resolveConfig(): PerfConfigV2 {
  const json = loadJsonConfig();
  const jsonDb = json.database ?? {};

  return {
    environment: process.env.PERF_ENV ?? json.environment ?? 'local',
    version:     process.env.PERF_VERSION ?? json.version ?? 'unknown',
    buildId:     process.env.BUILD_NUMBER ?? null,
    gitHash:     process.env.GIT_COMMIT ?? null,
    branch:      process.env.GIT_BRANCH ?? null,
    testSuite:   process.env.PERF_TEST_SUITE ?? null,
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
