import { getPool, closePool } from './db';

const SQL = `
CREATE TABLE IF NOT EXISTS test_runs (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id        TEXT,
  git_repo        TEXT,
  git_hash        TEXT,
  git_branch      TEXT,
  test_git_repo   TEXT,
  test_git_hash   TEXT,
  test_git_branch TEXT,
  environment     TEXT         NOT NULL,
  test_suite      TEXT         NOT NULL,
  sprint          TEXT,
  started_at      TIMESTAMPTZ  NOT NULL,
  finished_at     TIMESTAMPTZ  NOT NULL,
  tags            JSONB        NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uq_run_identity UNIQUE (build_id, test_suite, environment)
);

CREATE TABLE IF NOT EXISTS observations (
  id           BIGINT       GENERATED ALWAYS AS IDENTITY,
  run_id       UUID         NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
  metric_name  TEXT         NOT NULL,
  value        DOUBLE PRECISION NOT NULL,
  recorded_at  TIMESTAMPTZ  NOT NULL,
  attributes   JSONB        NOT NULL DEFAULT '{}',
  PRIMARY KEY (run_id, id)
) PARTITION BY HASH (run_id);

CREATE TABLE IF NOT EXISTS observations_p0 PARTITION OF observations FOR VALUES WITH (modulus 8, remainder 0);
CREATE TABLE IF NOT EXISTS observations_p1 PARTITION OF observations FOR VALUES WITH (modulus 8, remainder 1);
CREATE TABLE IF NOT EXISTS observations_p2 PARTITION OF observations FOR VALUES WITH (modulus 8, remainder 2);
CREATE TABLE IF NOT EXISTS observations_p3 PARTITION OF observations FOR VALUES WITH (modulus 8, remainder 3);
CREATE TABLE IF NOT EXISTS observations_p4 PARTITION OF observations FOR VALUES WITH (modulus 8, remainder 4);
CREATE TABLE IF NOT EXISTS observations_p5 PARTITION OF observations FOR VALUES WITH (modulus 8, remainder 5);
CREATE TABLE IF NOT EXISTS observations_p6 PARTITION OF observations FOR VALUES WITH (modulus 8, remainder 6);
CREATE TABLE IF NOT EXISTS observations_p7 PARTITION OF observations FOR VALUES WITH (modulus 8, remainder 7);

CREATE INDEX IF NOT EXISTS idx_observations_metric     ON observations(metric_name);
CREATE INDEX IF NOT EXISTS idx_observations_recorded   ON observations(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_runs_environment   ON test_runs(environment);
CREATE INDEX IF NOT EXISTS idx_test_runs_started       ON test_runs(started_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_test_runs_golden
  ON test_runs (test_suite, environment)
  WHERE tags->>'golden' = 'true';
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
