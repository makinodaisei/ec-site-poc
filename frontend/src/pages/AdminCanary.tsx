import { useState, useEffect } from 'react';
import { get } from '../api';

interface CanaryResult {
  check_id: string;
  timestamp: string;
  status: string;
  endpoint: string;
  response_time_ms: number;
  details: string;
}

export default function AdminCanary() {
  const [results, setResults] = useState<CanaryResult[]>([]);

  useEffect(() => {
    get<CanaryResult[]>('/admin/tables/canary_results').then(setResults).catch(console.error);
  }, []);

  const sorted = [...results].sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''));
  const latest = sorted[0];

  return (
    <div>
      <h2>Canary Status</h2>
      {!latest && <p style={{ color: '#888' }}>データなし（Phase 6 で Monitoring を設定後に表示されます）</p>}
      {latest && (
        <div>
          <p className={latest.status === 'ok' ? 'green' : 'red'}>
            {latest.status === 'ok' ? '✅ HEALTHY' : '❌ UNHEALTHY'}
          </p>
          <table style={{ width: 'auto' }}>
            <tbody>
              <tr><th>Endpoint</th><td>{latest.endpoint}</td></tr>
              <tr><th>Timestamp</th><td>{latest.timestamp}</td></tr>
              <tr><th>Response Time</th><td>{latest.response_time_ms} ms</td></tr>
              <tr><th>Details</th><td>{latest.details}</td></tr>
            </tbody>
          </table>
          <h3 style={{ marginTop: 24 }}>最近の結果</h3>
          <table>
            <thead>
              <tr><th>Time</th><th>Endpoint</th><th>Status</th><th>ms</th></tr>
            </thead>
            <tbody>
              {sorted.slice(0, 20).map((r) => (
                <tr key={r.check_id}>
                  <td>{r.timestamp}</td>
                  <td>{r.endpoint}</td>
                  <td style={{ color: r.status === 'ok' ? 'green' : 'red' }}>{r.status}</td>
                  <td>{r.response_time_ms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
