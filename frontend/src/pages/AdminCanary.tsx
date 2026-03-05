import { useState, useEffect } from 'react';
import { get } from '../api';

interface CanaryResult {
  check_id: string;
  timestamp: string;
  status: string;
  endpoint: string;
  response_time_ms: number;
  status_code?: number;
  error?: string;
}

export default function AdminCanary() {
  const [results, setResults] = useState<CanaryResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get<CanaryResult[]>('/admin/tables/canary_results')
      .then(setResults)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="loading">読み込み中...</p>;

  const sorted = [...results].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Latest result per endpoint
  const latestByEndpoint = new Map<string, CanaryResult>();
  for (const r of sorted) {
    if (!latestByEndpoint.has(r.endpoint)) latestByEndpoint.set(r.endpoint, r);
  }

  const allOk = [...latestByEndpoint.values()].every((r) => r.status === 'ok');

  return (
    <>
      <section>
        <h2>Canary Status</h2>
        {results.length === 0 ? (
          <p className="muted">データなし（Canary Lambda が最初の実行を完了するまでお待ちください）</p>
        ) : (
          <>
            <span className={`status-badge ${allOk ? 'status-ok' : 'status-err'}`}>
              {allOk ? '● HEALTHY' : '● UNHEALTHY'}
            </span>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 20 }}>
              {[...latestByEndpoint.values()].map((r) => (
                <div key={r.endpoint} className="card" style={{ width: 240 }}>
                  <p className="card-name" style={{ fontSize: 13, fontFamily: 'monospace' }}>{r.endpoint}</p>
                  <span className={`status-badge ${r.status === 'ok' ? 'status-ok' : 'status-err'}`} style={{ fontSize: 13 }}>
                    {r.status === 'ok' ? '● OK' : '● ERROR'}
                  </span>
                  <table style={{ marginTop: 10, fontSize: 12, width: '100%' }}>
                    <tbody>
                      <tr><th>HTTP</th><td>{r.status_code ?? '—'}</td></tr>
                      <tr><th>応答</th><td>{r.response_time_ms} ms</td></tr>
                      <tr><th>時刻</th><td>{new Date(r.timestamp).toLocaleString('ja-JP')}</td></tr>
                      {r.error && <tr><th>Error</th><td style={{ color: '#c0392b' }}>{r.error}</td></tr>}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {sorted.length > 0 && (
        <section>
          <h3>直近の結果（最大 30件）</h3>
          <table>
            <thead>
              <tr>
                <th>時刻</th>
                <th>エンドポイント</th>
                <th>ステータス</th>
                <th>HTTP</th>
                <th>応答 (ms)</th>
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, 30).map((r) => (
                <tr key={r.check_id}>
                  <td>{new Date(r.timestamp).toLocaleString('ja-JP')}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.endpoint}</td>
                  <td>
                    <span style={{
                      color: r.status === 'ok' ? '#1e7e34' : '#9b2335',
                      fontWeight: 700,
                    }}>
                      {r.status.toUpperCase()}
                    </span>
                  </td>
                  <td>{r.status_code ?? '—'}</td>
                  <td>{r.response_time_ms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
