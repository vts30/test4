# reg-test-performance-fixture

A Playwright fixture that automatically captures HTTP performance metrics during regression tests and stores them in a Postgres timeseries database or CSV file.

---

## Purpose

Track HTTP response times across test runs, environments, and software versions — without changing individual tests. Answers the question: *did our last deployment make anything slower?*

---

## Architecture

```
Browser (Playwright)
  │
  ├── page.on('request')  ──► recorder.ts   captures start time
  └── page.on('response') ──► recorder.ts   captures end time, headers
                                   │
                                   ▼
                             fixture.ts     attaches recorder to every test
                                   │
                                   ▼
                              queue.ts      in-memory buffer, flushes per test
                                   │
                          ┌────────┴────────┐
                          ▼                 ▼
                        db.ts           CSV file
                     (Postgres)      (PERF_CSV_PATH)
```

---

## Source Files

| File | Responsibility |
|---|---|
| `src/fixture.ts` | Extends Playwright `test` — auto-attaches recorder, enqueues records, flushes after each test |
| `src/recorder.ts` | Intercepts `request`/`response` page events, calculates `response_time_ms` |
| `src/context.ts` | `usePerfContext()` — lets tests set `name`, `env`, `version` metadata |
| `src/queue.ts` | In-memory write buffer; flushes to Postgres or CSV |
| `src/db.ts` | Postgres connection pool (`pg`) |
| `src/config.ts` | Resolves config from env vars → `perf.config.json` → defaults |
| `src/schema.ts` | Script to create the database table (`npm run db:init`) |
| `src/globalTeardown.ts` | Closes the DB pool after all tests |
| `db/init.sql` | DDL for `performance_measurements` table and indexes |

---

## Data Model

Table: `performance_measurements`

| Column | Type | Description |
|---|---|---|
| `id` | BIGSERIAL | Primary key |
| `recorded_at` | TIMESTAMPTZ | When the response was captured |
| `test_name` | TEXT | From `usePerfContext()` or Playwright test title |
| `environment` | TEXT | From `usePerfContext()` or config |
| `version` | TEXT | Software version under test |
| `url` | TEXT | Full request URL |
| `method` | TEXT | HTTP method (GET, POST, …) |
| `status_code` | INTEGER | HTTP response status |
| `response_time_ms` | INTEGER | Time from request to response in ms |
| `response_size_bytes` | INTEGER | From `content-length` header (nullable) |
| `content_type` | TEXT | Response content type (nullable) |
| `assertions` | JSONB | Captured headers: `x-request-id`, `x-trace-id`, `cache-control`, `etag` |

Indexes on `recorded_at`, `test_name`, `environment` for fast time-series queries.

---

## Configuration

Priority order: **environment variables → perf.config.json → defaults**

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | Full Postgres connection string | — |
| `PG_HOST` | Postgres host | `localhost` |
| `PG_PORT` | Postgres port | `5432` |
| `PG_USER` | Postgres user | `perf` |
| `PG_PASSWORD` | Postgres password | `perf` |
| `PG_DB` | Database name | `perf_metrics` |
| `PERF_ENV` | Default environment tag | `local` |
| `PERF_VERSION` | Default version tag | `unknown` |
| `PERF_CSV_PATH` | Write to CSV instead of Postgres | — |
| `PERF_VERBOSE` | Print per-request summary to console | `false` |

---

## Setup & Running

### 1. Install dependencies

```bash
npm install
npx playwright install chromium
```

### 2a. Run with CSV (no database needed)

```bash
PERF_CSV_PATH=./perf-results.csv npx playwright test
```

### 2b. Run with Postgres

```bash
cp perf.config.example.json perf.config.json
# edit perf.config.json with your credentials

createdb perf_metrics
npm run db:init

npx playwright test
```

### Verbose output

```bash
PERF_VERBOSE=true npx playwright test
```

Output example:
```
[perf] homepage (prod@2.1.0)
  GET    https://your-service.example.com/          200  312ms  14.2kb
  GET    https://your-service.example.com/api/user  200   88ms   1.1kb
```

---

## Tests

```bash
# Unit tests (vitest)
npm run test:unit

# E2E tests (playwright, requires network)
npm run test:e2e

# All
npm test
```

Unit tests cover: `recorder.ts`, `queue.ts`, `config.ts`

---

## Usage in Your Tests

```typescript
import { test, expect } from './src/fixture';

test('homepage loads', async ({ page, usePerfContext }) => {
  usePerfContext({ name: 'homepage', env: 'prod', version: '2.1.0' });

  await page.goto('https://your-service.example.com');
  await expect(page.locator('h1')).toBeVisible();
  // All HTTP responses recorded automatically
});
```

---

## Querying Results

```sql
-- Slowest requests in the last 24 hours
SELECT test_name, url, method, status_code, response_time_ms, recorded_at
FROM performance_measurements
WHERE recorded_at > NOW() - INTERVAL '24 hours'
ORDER BY response_time_ms DESC
LIMIT 20;

-- Average response time per version
SELECT version, ROUND(AVG(response_time_ms)) AS avg_ms, COUNT(*) AS requests
FROM performance_measurements
GROUP BY version
ORDER BY version DESC;
```

---

## TimescaleDB (optional)

After running `npm run db:init`, convert to a hypertable for better time-series performance:

```sql
SELECT create_hypertable('performance_measurements', 'recorded_at');
```

---

## Known Issues & Notes

- **CSV mode**: `globalTeardown` runs in a separate Playwright process and cannot access the worker's in-memory queue. The fixture flushes records immediately after each test to avoid data loss.
- **Graceful degradation**: If Postgres is unreachable, a warning is printed and the batch is discarded. Tests continue normally.
- `response_size_bytes` is null when the server omits the `content-length` header.
