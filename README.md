# reg-test-performance-fixture

A Playwright fixture that automatically captures HTTP performance metrics for every regression test and writes them to a Postgres timeseries database.

## How it works

Import `test` from this fixture instead of `@playwright/test`. Every HTTP response made by the browser is intercepted and recorded — no manual instrumentation needed. Call `usePerfContext()` once per test to attach metadata (test name, environment, software version). Results are buffered in memory and flushed to Postgres asynchronously.

```typescript
import { test, expect } from './src/fixture';

test('homepage loads', async ({ page, usePerfContext }) => {
  usePerfContext({ name: 'homepage', env: 'prod', version: '2.1.0' });

  await page.goto('https://your-service.example.com');
  await expect(page.locator('h1')).toBeVisible();
  // All HTTP responses are recorded automatically — nothing else to do
});
```

After the test run, query your database:

```sql
SELECT test_name, url, method, status_code, response_time_ms, recorded_at
FROM performance_measurements
WHERE test_name = 'homepage'
ORDER BY recorded_at DESC;
```

## What gets recorded

Every HTTP response on the page — navigation requests, API calls, static assets, third-party scripts — is captured with:

| Column | Description |
|---|---|
| `test_name` | From `usePerfContext()` or falls back to the Playwright test title |
| `environment` | From `usePerfContext()` or config |
| `version` | Software version under test |
| `url` | Full request URL |
| `method` | HTTP method (GET, POST, …) |
| `status_code` | HTTP response status |
| `response_time_ms` | Time from request to response (ms) |
| `response_size_bytes` | Response size from `content-length` header (nullable) |
| `content_type` | Response content type (nullable) |
| `assertions` | JSONB blob of selected headers: `x-request-id`, `x-trace-id`, `cache-control`, `etag` |
| `recorded_at` | Wall-clock timestamp of the response |

## Setup

### 1. Install dependencies

```bash
npm install
npx playwright install chromium
```

### 2. Configure the database connection

Copy the example config and fill in your credentials:

```bash
cp perf.config.example.json perf.config.json
```

```json
{
  "environment": "local",
  "version": "unknown",
  "database": {
    "host": "localhost",
    "port": 5432,
    "user": "perf",
    "password": "your-password",
    "dbName": "perf_metrics"
  }
}
```

Or use environment variables (these take priority over `perf.config.json`):

| Variable | Description |
|---|---|
| `DATABASE_URL` | Full Postgres connection string (overrides all individual fields) |
| `PG_HOST` | Postgres host |
| `PG_PORT` | Postgres port |
| `PG_USER` | Postgres user |
| `PG_PASSWORD` | Postgres password |
| `PG_DB` | Database name |
| `PERF_ENV` | Default environment tag for all tests |
| `PERF_VERSION` | Default version tag for all tests |
| `PERF_CSV_PATH` | Write results to this CSV file instead of Postgres (e.g. `./perf-results.csv`) |

### 3. Create the database schema

```bash
createdb perf_metrics   # or create the database however you prefer
npm run db:init
```

This runs `db/init.sql` which creates the `performance_measurements` table and indexes.

> **TimescaleDB:** The schema is compatible. After creating the table, convert it to a hypertable:
> ```sql
> SELECT create_hypertable('performance_measurements', 'recorded_at');
> ```

## Running tests

```bash
# Unit tests only
npm run test:unit

# E2E tests only (requires network access)
npm run test:e2e

# All tests
npm test
```

### Running without Postgres (CSV mode)

Set `PERF_CSV_PATH` to write results to a CSV file instead of Postgres. Useful for local development and CI environments where a database isn't available.

```bash
PERF_CSV_PATH=./perf-results.csv npx playwright test
```

The file is created on first write with a header row; subsequent runs append rows. The columns match the database schema exactly, so data is portable between the two modes.

### Verbose output

Set `PERF_VERBOSE=true` to print a per-request summary to the console after each test:

```
PERF_VERBOSE=true npx playwright test
```

```
[perf] homepage (prod@2.1.0)
  GET    https://your-service.example.com/          200  312ms  14.2kb
  GET    https://your-service.example.com/api/user  200   88ms   1.1kb
  GET    https://your-service.example.com/style.css 200   44ms   3.4kb
```

## Graceful degradation

If Postgres is unreachable, a single warning is printed and the batch is discarded — your regression tests still pass or fail on their own merits. Performance recording is best-effort.

```
[perf] Failed to write 3 record(s) to database: ECONNREFUSED
```

## Project structure

```
src/
  fixture.ts         # Extended Playwright test — import this instead of @playwright/test
  context.ts         # usePerfContext() implementation
  recorder.ts        # page.on('request'/'response') interception
  queue.ts           # Async write queue, 5s flush interval
  db.ts              # Postgres connection pool
  config.ts          # Config resolution (env vars → perf.config.json → defaults)
  schema.ts          # db:init script
  globalTeardown.ts  # Drains queue and closes pool after all tests

db/
  init.sql           # Schema DDL

tests/
  example.spec.ts    # Example regression test against example.com
  unit/              # Vitest unit tests for recorder, queue, config
```

## Example test

See [`tests/example.spec.ts`](tests/example.spec.ts) for a working end-to-end example against `https://example.com`.
