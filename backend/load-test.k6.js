// backend/load-test.k6.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // ramp-up to 20 virtual users
    { duration: '2m', target: 20 }, // stay at 20
    { duration: '30s', target: 0 }, // ramp-down
  ],
  thresholds: {
    // 95% of response times should be below 500ms
    'http_req_duration{scenario:default}': ['p(95)<500'],
    // No more than 1% of requests should fail
    'http_req_failed{scenario:default}': ['rate<0.01'],
  },
  // generate an HTML report when run with `--out html=load-report.html`
  // (k6 v0.48+ supports this output format)
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  // Check liveness and readiness on the backend API.
  let res = http.get(`${BASE_URL}/health`);
  check(res, { 'GET /health status 200': (r) => r.status === 200 });
  sleep(0.5);

  res = http.get(`${BASE_URL}/ready`);
  check(res, { 'GET /ready status 200': (r) => r.status === 200 });
  sleep(0.5);

  // API root is a cheap check that the router is mounted correctly.
  res = http.get(`${BASE_URL}/api/v1`);
  check(res, { 'GET /api/v1 status 200': (r) => r.status === 200 });
  sleep(0.5);
}

function metricValue(metrics, metricName, valueName, fallback) {
  if (!metrics || !metrics[metricName] || !metrics[metricName].values) {
    return fallback;
  }
  const values = metrics[metricName].values;
  if (typeof values[valueName] === 'undefined' || values[valueName] === null) {
    return fallback;
  }
  return values[valueName];
}

export function handleSummary(data) {
  const checksRate = metricValue(data.metrics, 'checks', 'rate', 0);
  const failedRate = metricValue(data.metrics, 'http_req_failed', 'rate', 0);
  const durationP95 = metricValue(data.metrics, 'http_req_duration', 'p(95)', 0);
  const totalReqs = metricValue(data.metrics, 'http_reqs', 'count', 0);

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Ethio Chain Load Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; background: #0f172a; color: #e2e8f0; }
    .wrap { max-width: 960px; margin: 0 auto; padding: 32px 20px; }
    .card { background: #111827; border: 1px solid #334155; border-radius: 16px; padding: 20px; margin-top: 16px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .metric { background: #0b1220; border: 1px solid #1f2937; border-radius: 12px; padding: 14px; }
    .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; }
    .value { font-size: 28px; font-weight: 700; margin-top: 6px; }
    .muted { color: #94a3b8; }
    code { background: #0b1220; padding: 2px 6px; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Ethio Chain Logistics Load Test</h1>
    <p class="muted">Backend target: <code>${BASE_URL}</code></p>
    <div class="card">
      <div class="grid">
        <div class="metric"><div class="label">Check pass rate</div><div class="value">${(checksRate * 100).toFixed(2)}%</div></div>
        <div class="metric"><div class="label">Request failure rate</div><div class="value">${(failedRate * 100).toFixed(2)}%</div></div>
        <div class="metric"><div class="label">p95 latency</div><div class="value">${durationP95.toFixed(2)} ms</div></div>
        <div class="metric"><div class="label">Total requests</div><div class="value">${totalReqs}</div></div>
      </div>
    </div>
    <div class="card">
      <h2>What this shows</h2>
      <p>This is a browser-openable summary of the k6 run. It is generated automatically at the end of the test and is suitable for a demo or defense presentation.</p>
    </div>
  </div>
</body>
</html>`;

  return {
    'load-report.html': html,
    'summary.json': JSON.stringify(data, null, 2),
  };
}
