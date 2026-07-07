#!/usr/bin/env node
// Lightweight load test, no new dependency: fires concurrent requests at a
// running dev/prod server using Node's built-in fetch, then reports latency
// and error-rate stats. Run the app first (`npm run dev`), then:
//
//   node scripts/load-test.mjs                          # defaults below
//   node scripts/load-test.mjs --url http://localhost:3000 --concurrency 20 --requests 200 --path /api/menu
//
// ponytail: no percentile/histogram library, just a sorted-array p95. Swap
// for k6/autocannon if you need proper ramping, thresholds, or CI reporting.

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith('--')) pairs.push([arg.slice(2), all[i + 1]]);
    return pairs;
  }, [])
);

const BASE_URL    = args.url         ?? 'http://localhost:3000';
const CONCURRENCY = Number(args.concurrency ?? 10);
const TOTAL       = Number(args.requests    ?? 100);
const PATH        = args.path        ?? '/api/menu';
const METHOD      = args.method      ?? 'GET';
const BODY        = args.body ? JSON.parse(args.body) : undefined;

async function timedRequest() {
  const start = performance.now();
  try {
    const res = await fetch(`${BASE_URL}${PATH}`, {
      method: METHOD,
      headers: BODY ? { 'Content-Type': 'application/json' } : undefined,
      body: BODY ? JSON.stringify(BODY) : undefined,
    });
    const ms = performance.now() - start;
    return { ok: res.ok, status: res.status, ms };
  } catch (err) {
    const ms = performance.now() - start;
    return { ok: false, status: 0, ms, error: String(err) };
  }
}

async function runBatch(count) {
  return Promise.all(Array.from({ length: count }, timedRequest));
}

function percentile(sorted, p) {
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function main() {
  console.log(`Load testing ${METHOD} ${BASE_URL}${PATH}`);
  console.log(`  ${TOTAL} requests, concurrency ${CONCURRENCY}\n`);

  const results = [];
  let remaining = TOTAL;
  while (remaining > 0) {
    const batchSize = Math.min(CONCURRENCY, remaining);
    results.push(...(await runBatch(batchSize)));
    remaining -= batchSize;
  }

  const durations = results.map((r) => r.ms).sort((a, b) => a - b);
  const errors    = results.filter((r) => !r.ok);
  const statusCounts = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  console.log('Status codes:', statusCounts);
  console.log(`Errors: ${errors.length}/${results.length} (${((errors.length / results.length) * 100).toFixed(1)}%)`);
  console.log(`Latency (ms): min=${durations[0].toFixed(1)} p50=${percentile(durations, 50).toFixed(1)} p95=${percentile(durations, 95).toFixed(1)} max=${durations[durations.length - 1].toFixed(1)}`);

  if (errors.length > 0) {
    console.log('\nSample errors:');
    for (const e of errors.slice(0, 5)) console.log(' ', e.error ?? `HTTP ${e.status}`);
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

main();
