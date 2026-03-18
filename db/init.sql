CREATE TABLE IF NOT EXISTS performance_measurements (
  id                    BIGSERIAL PRIMARY KEY,
  recorded_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  test_name             TEXT NOT NULL,
  environment           TEXT NOT NULL,
  version               TEXT NOT NULL,
  url                   TEXT NOT NULL,
  method                TEXT NOT NULL,
  status_code           INTEGER NOT NULL,
  response_time_ms      INTEGER NOT NULL,
  response_size_bytes   INTEGER,
  content_type          TEXT,
  assertions            JSONB
);

CREATE INDEX IF NOT EXISTS idx_perf_recorded_at ON performance_measurements (recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_test_name   ON performance_measurements (test_name);
CREATE INDEX IF NOT EXISTS idx_perf_environment  ON performance_measurements (environment);
