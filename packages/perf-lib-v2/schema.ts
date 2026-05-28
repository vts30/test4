import { getPool, closePool } from './db';

const SQL = `
CREATE TABLE IF NOT EXISTS test_runs (
  run_number   BIGSERIAL    PRIMARY KEY,
  id           UUID         UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  build_id     TEXT,
  git_hash     TEXT,
  branch       TEXT,
  environment  TEXT         NOT NULL,
  test_suite   TEXT,
  started_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  finished_at  TIMESTAMPTZ,
  status       TEXT         NOT NULL DEFAULT 'running',
  tags         JSONB,
  version      TEXT,
  CONSTRAINT test_runs_status_check CHECK (status IN ('running', 'complete', 'partial'))
);

CREATE TABLE IF NOT EXISTS observations (
  id           BIGSERIAL    PRIMARY KEY,
  run_number   BIGINT       NOT NULL REFERENCES test_runs(run_number) ON DELETE CASCADE,
  metric_name  TEXT         NOT NULL,
  value        NUMERIC      NOT NULL,
  recorded_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  attributes   JSONB
);

CREATE INDEX IF NOT EXISTS idx_observations_run_number ON observations(run_number);
CREATE INDEX IF NOT EXISTS idx_observations_metric     ON observations(metric_name);
CREATE INDEX IF NOT EXISTS idx_observations_recorded   ON observations(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_runs_environment   ON test_runs(environment);
CREATE INDEX IF NOT EXISTS idx_test_runs_started       ON test_runs(started_at DESC);
`;

async function initSchema(): Promise<void> {
  const pool = getPool();
  try {
    await pool.query(SQL);
    console.log('[perf-v2] Schema initialized successfully');
  } finally {
    await closePool();
  }
}

initSchema().catch((err) => {
  console.error('[perf-v2] Schema initialization failed:', err.message);
  process.exit(1);
});
