import { useState, useEffect } from 'react';
import { get } from '../api';

const TABLE_META: Record<string, { label: string; description: string; pk: string }> = {
  products:       { label: '商品',         description: '商品情報。PK: product_id',                                    pk: 'product_id' },
  users:          { label: 'ユーザー',     description: 'ユーザー情報。PK: user_id、GSI: email-index',                  pk: 'user_id' },
  orders:         { label: '注文',         description: '注文ヘッダー。PK: order_id、GSI: user_id-index',              pk: 'order_id' },
  order_items:    { label: '注文明細',     description: '注文に紐づく商品明細。PK: order_id + SK: product_id',         pk: 'order_id' },
  cart_items:     { label: 'カート',       description: 'ユーザーのカート内アイテム。PK: user_id + SK: product_id',   pk: 'user_id' },
  canary_results: { label: 'カナリア結果', description: 'カナリア死活監視＆デモ結果。PK: check_id (種別プレフィックス付き)',  pk: 'check_id' },
};

export default function AdminTables() {
  const [tables, setTables] = useState<string[]>([]);
  const [selected, setSelected] = useState('');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    get<string[]>('/admin/tables').then(setTables).catch(console.error);
  }, []);

  async function loadTable(name: string) {
    setSelected(name);
    if (!name) { setRows([]); return; }
    setLoading(true);
    try {
      const data = await get<Record<string, unknown>[]>(`/admin/tables/${name}`);
      // Sort by PK for readability
      const meta = TABLE_META[name];
      if (meta) {
        data.sort((a, b) => String(a[meta.pk] ?? '').localeCompare(String(b[meta.pk] ?? '')));
      }
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const meta = selected ? TABLE_META[selected] : undefined;

  return (
    <>
      <h2>DB Viewer</h2>

      {/* Table list with descriptions */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        {tables.map((t) => {
          const m = TABLE_META[t];
          return (
            <button
              key={t}
              onClick={() => loadTable(t)}
              style={{
                background: selected === t ? '#1a1a2e' : 'white',
                color: selected === t ? '#fff' : '#1a1a2e',
                border: `1px solid ${selected === t ? '#1a1a2e' : '#d0d7e2'}`,
                borderRadius: 8,
                padding: '8px 14px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {m?.label ?? t}
              <span style={{ fontSize: 11, fontWeight: 400, display: 'block', color: selected === t ? '#aab4c8' : '#a0aec0' }}>
                {t}
              </span>
            </button>
          );
        })}
      </div>

      {meta && (
        <div style={{ background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#4a5568', maxWidth: 700 }}>
          <strong>{meta.label}テーブル</strong> — {meta.description}<br />
          {rows.length > 0 && <span style={{ color: '#a0aec0' }}>{rows.length} 件取得</span>}
        </div>
      )}

      {loading && <p className="loading">読み込み中...</p>}

      {!loading && rows.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c} style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: typeof row[c] === 'string' && (row[c] as string).includes('-') && (row[c] as string).length > 20 ? 'monospace' : undefined, fontSize: typeof row[c] === 'string' && (row[c] as string).length > 20 ? 11 : undefined }}>
                      {String(row[c] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && selected && rows.length === 0 && <p className="muted">データなし</p>}
    </>
  );
}
