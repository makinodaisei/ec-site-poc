import { useState, useEffect } from 'react';
import { get } from '../api';

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
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div>
      <h2>DB Viewer</h2>
      <select value={selected} onChange={(e) => loadTable(e.target.value)}>
        <option value="">テーブルを選択</option>
        {tables.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      {loading && <p>Loading...</p>}
      {!loading && rows.length > 0 && (
        <table>
          <thead>
            <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => <td key={c}>{String(row[c] ?? '')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && selected && rows.length === 0 && <p style={{ color: '#888' }}>データなし</p>}
    </div>
  );
}
