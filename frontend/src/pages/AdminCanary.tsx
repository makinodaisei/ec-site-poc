import { useState, useEffect, useRef } from 'react';
import { get, post } from '../api';

interface DemoResult {
  version: 'stable' | 'canary';
  weight: number;
  color: string;
  message: string;
  feature_flags: Record<string, boolean>;
  timestamp: string;
}

interface HistoryRecord {
  check_id: string;
  timestamp: string;
  version?: string;
  weight_at_request?: number;
  endpoint: string;
  status: string;
  response_time_ms: number;
  error?: string;
}

export default function AdminCanary() {
  const [weight, setWeight] = useState(50);
  const [pendingWeight, setPendingWeight] = useState(50);
  const [results, setResults] = useState<DemoResult[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [running, setRunning] = useState(false);
  const [weightMsg, setWeightMsg] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const abortRef = useRef(false);

  useEffect(() => {
    // Load current weight and history
    get<{ weight?: number }>('/canary-demo').then((r) => {
      if (r.weight !== undefined) {
        setWeight(r.weight);
        setPendingWeight(r.weight);
      }
    }).catch(() => {});

    loadHistory();
  }, []);

  async function loadHistory() {
    setLoadingHistory(true);
    const rows = await get<HistoryRecord[]>('/admin/tables/canary_results').catch(() => [] as HistoryRecord[]);
    const demoRows = rows
      .filter((r) => r.check_id.startsWith('DEMO#'))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    setHistory(demoRows);
    setLoadingHistory(false);
  }

  async function runTest(times: number) {
    setRunning(true);
    setResults([]);
    abortRef.current = false;
    for (let i = 0; i < times; i++) {
      if (abortRef.current) break;
      try {
        const r = await get<DemoResult>('/canary-demo');
        setResults((prev) => [...prev, r]);
      } catch {
        // ignore
      }
      await new Promise((res) => setTimeout(res, 200));
    }
    setRunning(false);
    loadHistory();
  }

  async function applyWeight() {
    try {
      await post('/canary-demo/weight', { weight: pendingWeight });
      setWeight(pendingWeight);
      setWeightMsg(`カナリア比率を ${pendingWeight}% に更新しました`);
      setTimeout(() => setWeightMsg(''), 3000);
    } catch (e) {
      setWeightMsg('更新失敗: ' + String(e));
    }
  }

  const stableCount = results.filter((r) => r.version === 'stable').length;
  const canaryCount = results.filter((r) => r.version === 'canary').length;

  const histDemoRows = history.slice(0, 20);
  const histStable = history.filter((r) => r.version === 'stable').length;
  const histCanary = history.filter((r) => r.version === 'canary').length;

  return (
    <>
      {/* Concept explanation */}
      <section>
        <h2>カナリアリリース デモ</h2>
        <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 10, padding: '16px 20px', maxWidth: 700, fontSize: 14, lineHeight: 1.7 }}>
          <strong>カナリアリリースとは？</strong><br />
          新バージョンのコードを全ユーザーに一度に公開せず、一部のトラフィックだけ新バージョンへ流す手法です。
          問題があれば即座にロールバックできます。<br /><br />
          <strong>AWSでの実装:</strong> Lambda エイリアスの <em>weighted routing</em> を使い、
          同一エイリアス (例: <code style={{ background: '#ffe082', padding: '0 4px', borderRadius: 3 }}>live</code>) へのリクエストを
          stable バージョンと canary バージョンに指定の割合で分散します。<br /><br />
          <strong>このデモ:</strong> DynamoDB にカナリア比率を保存し、API リクエストをその割合で振り分けます。
          各バージョンには異なる機能フラグが設定されています。
        </div>
      </section>

      {/* Weight control */}
      <section>
        <h3>ルーティング設定</h3>
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px', maxWidth: 500 }}>
          <div style={{ marginBottom: 12, fontSize: 14, color: '#4a5568' }}>
            現在の設定: <strong>stable {100 - weight}%</strong> / <strong style={{ color: '#e67e22' }}>canary {weight}%</strong>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: '#27ae60', fontWeight: 600, minWidth: 60 }}>stable {100 - pendingWeight}%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={pendingWeight}
              onChange={(e) => setPendingWeight(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: 12, color: '#e67e22', fontWeight: 600, minWidth: 60, textAlign: 'right' }}>canary {pendingWeight}%</span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button className="primary" onClick={applyWeight} style={{ fontSize: 13, padding: '7px 18px' }}>
              設定を適用
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              {[0, 10, 50, 90, 100].map((v) => (
                <button key={v} className="small" onClick={() => setPendingWeight(v)} style={{ fontSize: 11 }}>{v}%</button>
              ))}
            </div>
          </div>
          {weightMsg && <p className="msg" style={{ marginTop: 12, padding: '8px 12px', fontSize: 13 }}>{weightMsg}</p>}
        </div>
      </section>

      {/* Test runner */}
      <section>
        <h3>テスト実行</h3>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          {[5, 10, 20].map((n) => (
            <button key={n} className="small" onClick={() => runTest(n)} disabled={running}>
              {n}回テスト
            </button>
          ))}
          {running && <button className="small danger" onClick={() => { abortRef.current = true; }}>停止</button>}
        </div>

        {results.length > 0 && (
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px', maxWidth: 600 }}>
            <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#27ae60' }}>{stableCount}</div>
                <div style={{ fontSize: 12, color: '#718096' }}>stable</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#e67e22' }}>{canaryCount}</div>
                <div style={{ fontSize: 12, color: '#718096' }}>canary</div>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '100%', height: 20, background: '#e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{
                    width: `${results.length > 0 ? (stableCount / results.length) * 100 : 50}%`,
                    height: '100%',
                    background: '#27ae60',
                    transition: 'width .3s',
                  }} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {results.map((r, i) => (
                <span key={i} title={r.version} style={{
                  width: 28, height: 28,
                  borderRadius: 6,
                  background: r.version === 'stable' ? '#e6f9ee' : '#fef3e2',
                  border: `2px solid ${r.color}`,
                  fontSize: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: r.color,
                }}>
                  {r.version === 'stable' ? 'S' : 'C'}
                </span>
              ))}
            </div>
            {results.length > 0 && (
              <div style={{ marginTop: 12, fontSize: 13, color: '#718096' }}>
                最後のレスポンス機能フラグ: {JSON.stringify(results[results.length - 1].feature_flags)}
              </div>
            )}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <h3>デモリクエスト履歴（最近20件）</h3>
        {loadingHistory ? (
          <p className="loading">読み込み中...</p>
        ) : histDemoRows.length === 0 ? (
          <p className="muted">テストを実行すると履歴が表示されます</p>
        ) : (
          <>
            <p style={{ fontSize: 13, color: '#718096', marginBottom: 8 }}>
              合計: stable {histStable}件 / canary {histCanary}件
            </p>
            <table style={{ maxWidth: 700 }}>
              <thead>
                <tr>
                  <th>時刻</th>
                  <th>バージョン</th>
                  <th>リクエスト時の比率</th>
                </tr>
              </thead>
              <tbody>
                {histDemoRows.map((r) => (
                  <tr key={r.check_id}>
                    <td style={{ fontSize: 12 }}>{new Date(r.timestamp).toLocaleString('ja-JP')}</td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: r.version === 'stable' ? '#27ae60' : '#e67e22',
                      }}>
                        {r.version ?? '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: '#718096' }}>
                      {r.weight_at_request !== undefined ? `canary ${r.weight_at_request}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
    </>
  );
}
