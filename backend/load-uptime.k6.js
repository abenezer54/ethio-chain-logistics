import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const POLL_SECONDS = Number(__ENV.POLL_INTERVAL_SECONDS || 5);
const TEST_DURATION = __ENV.DURATION || '2m';

export const options = {
  scenarios: {
    uptime_check: {
      executor: 'constant-vus',
      vus: 1,
      duration: TEST_DURATION,
      gracefulStop: '5s',
    },
  },
  thresholds: {
    checks: ['rate>0.9'],
    http_req_failed: ['rate<0.1'],
    http_req_duration: ['p(95)<1000'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/ready`);
  check(res, { 'GET /ready status 200': (r) => r.status === 200 });
  sleep(POLL_SECONDS);
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
  <title>Ethio Chain Uptime Report</title>
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
    <h1>Ethio Chain Logistics Uptime Check</h1>
    <p class="muted">Poll interval: <code>${POLL_SECONDS}s</code> | Target availability: <code>90%</code>+</p>
    <div class="card">
      <div class="grid">
        <div class="metric"><div class="label">Check pass rate</div><div class="value">${(checksRate * 100).toFixed(2)}%</div></div>
        <div class="metric"><div class="label">Request failure rate</div><div class="value">${(failedRate * 100).toFixed(2)}%</div></div>
        <div class="metric"><div class="label">p95 latency</div><div class="value">${durationP95.toFixed(2)} ms</div></div>
        <div class="metric"><div class="label">Total requests</div><div class="value">${totalReqs}</div></div>
      </div>
    </div>
    <div class="card">
      <h2>What this demonstrates</h2>
      <p>This run polls <code>/ready</code> every <code>${POLL_SECONDS}</code> seconds and proves the API stays available during the test window. It is a demo artifact for the defense, not a long-term production uptime monitor.</p>
    </div>
  </div>
</body>
</html>`;

  return {
    'uptime-report.html': html,
    'summary.json': JSON.stringify(data, null, 2),
  };
}