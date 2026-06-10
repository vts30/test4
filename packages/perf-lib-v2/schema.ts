import { getPool, closePool } from './db';

function buildSQL(s: string): string {
  return `
CREATE TABLE IF NOT EXISTS ${s}.test_runs (
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

CREATE TABLE IF NOT EXISTS ${s}.observations (
  id           BIGINT       GENERATED ALWAYS AS IDENTITY,
  run_id       UUID         NOT NULL REFERENCES ${s}.test_runs(id) ON DELETE CASCADE,
  metric_name  TEXT         NOT NULL,
  value        DOUBLE PRECISION NOT NULL,
  recorded_at  TIMESTAMPTZ  NOT NULL,
  attributes   JSONB        NOT NULL DEFAULT '{}',
  PRIMARY KEY (run_id, id)
) PARTITION BY HASH (run_id);

CREATE TABLE IF NOT EXISTS ${s}.observations_p0 PARTITION OF ${s}.observations FOR VALUES WITH (modulus 8, remainder 0);
CREATE TABLE IF NOT EXISTS ${s}.observations_p1 PARTITION OF ${s}.observations FOR VALUES WITH (modulus 8, remainder 1);
CREATE TABLE IF NOT EXISTS ${s}.observations_p2 PARTITION OF ${s}.observations FOR VALUES WITH (modulus 8, remainder 2);
CREATE TABLE IF NOT EXISTS ${s}.observations_p3 PARTITION OF ${s}.observations FOR VALUES WITH (modulus 8, remainder 3);
CREATE TABLE IF NOT EXISTS ${s}.observations_p4 PARTITION OF ${s}.observations FOR VALUES WITH (modulus 8, remainder 4);
CREATE TABLE IF NOT EXISTS ${s}.observations_p5 PARTITION OF ${s}.observations FOR VALUES WITH (modulus 8, remainder 5);
CREATE TABLE IF NOT EXISTS ${s}.observations_p6 PARTITION OF ${s}.observations FOR VALUES WITH (modulus 8, remainder 6);
CREATE TABLE IF NOT EXISTS ${s}.observations_p7 PARTITION OF ${s}.observations FOR VALUES WITH (modulus 8, remainder 7);

CREATE INDEX IF NOT EXISTS idx_observations_metric     ON ${s}.observations(metric_name);
CREATE INDEX IF NOT EXISTS idx_observations_recorded   ON ${s}.observations(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_test_runs_environment   ON ${s}.test_runs(environment);
CREATE INDEX IF NOT EXISTS idx_test_runs_started       ON ${s}.test_runs(started_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_test_runs_golden
  ON ${s}.test_runs (test_suite, environment)
  WHERE tags->>'golden' = 'true';
`;
}

async function initSchema(): Promise<void> {
  const schema = process.env.PG_SCHEMA;
  if (!schema) {
    throw new Error('PG_SCHEMA env var is required to initialize the schema');
  }
  const pool = getPool();
  try {
    await pool.query(buildSQL(schema));
    console.log(`[perf-v2] Schema initialized successfully in ${schema}`);
  } finally {
    await closePool();
  }
}

initSchema().catch((err) => {
  console.error('[perf-v2] Schema initialization failed:', err.message);
  process.exit(1);
});
