import { useState, useEffect } from 'react';
import { get, patch } from '../api';

interface Order {
  order_id: string;
  user_id: string;
  status: string;
  total_amount: number;
  shipping_address: string;
  created_at: string;
}

interface OrderItem {
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface OrderDetail {
  order: Order;
  items: OrderItem[];
}

const USER_ID = 'user-demo-1';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: '処理中', color: '#e67e22' },
  paid:      { label: '支払済', color: '#2980b9' },
  shipped:   { label: '発送済', color: '#27ae60' },
  cancelled: { label: 'キャンセル', color: '#e74c3c' },
};

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, OrderDetail>>({});
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    get<Order[]>(`/orders?user_id=${USER_ID}`)
      .then((data) => setOrders([...data].sort((a, b) => b.created_at.localeCompare(a.created_at))))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(order_id: string, status: string) {
    setUpdatingStatus(order_id);
    try {
      await patch(`/orders/${order_id}`, { status });
      setOrders((prev) => prev.map((o) => o.order_id === order_id ? { ...o, status } : o));
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingStatus(null);
    }
  }

  async function toggleDetail(order_id: string) {
    if (expanded === order_id) {
      setExpanded(null);
      return;
    }
    setExpanded(order_id);
    if (!details[order_id]) {
      const d = await get<OrderDetail>(`/orders/${order_id}`).catch(() => null);
      if (d) setDetails((prev) => ({ ...prev, [order_id]: d }));
    }
  }

  if (loading) return <p className="loading">読み込み中...</p>;

  return (
    <>
      <h2>注文履歴</h2>
      <p className="muted" style={{ marginBottom: 16 }}>ユーザー: {USER_ID}</p>

      {orders.length === 0 ? (
        <p className="muted">注文履歴がありません</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 700 }}>
          {orders.map((o) => {
            const st = STATUS_LABEL[o.status] ?? { label: o.status, color: '#888' };
            const isOpen = expanded === o.order_id;
            const detail = details[o.order_id];
            return (
              <div key={o.order_id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', cursor: 'pointer' }}
                  onClick={() => toggleDetail(o.order_id)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#a0aec0', marginBottom: 2 }}>
                      {new Date(o.created_at).toLocaleString('ja-JP')}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>¥{o.total_amount.toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>{o.shipping_address}</div>
                  </div>
                  <span style={{ background: st.color + '22', color: st.color, fontWeight: 700, fontSize: 12, padding: '3px 10px', borderRadius: 12 }}>
                    {st.label}
                  </span>
                  <span style={{ color: '#a0aec0', fontSize: 18 }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {isOpen && (
                  <div style={{ borderTop: '1px solid #f0f0f0', padding: '14px 20px', background: '#fafbfc' }}>
                    <div style={{ fontSize: 11, color: '#a0aec0', marginBottom: 8 }}>
                      注文ID: <code style={{ fontSize: 11 }}>{o.order_id}</code>
                    </div>
                    {/* Status control */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                      {(['pending', 'paid', 'shipped', 'cancelled'] as const).map((s) => (
                        <button key={s} className="small"
                          disabled={o.status === s || updatingStatus === o.order_id}
                          style={{ fontWeight: o.status === s ? 700 : 400, background: o.status === s ? '#e2e8f0' : undefined }}
                          onClick={() => updateStatus(o.order_id, s)}
                        >
                          {STATUS_LABEL[s]?.label ?? s}
                        </button>
                      ))}
                    </div>
                    {!detail ? (
                      <p className="loading">読み込み中...</p>
                    ) : (
                      <table style={{ marginTop: 0 }}>
                        <thead>
                          <tr>
                            <th>商品ID</th>
                            <th>数量</th>
                            <th>単価</th>
                            <th>小計</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.items.map((item) => (
                            <tr key={item.product_id}>
                              <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{item.product_id}</td>
                              <td>{item.quantity}</td>
                              <td>¥{item.unit_price.toLocaleString()}</td>
                              <td>¥{item.subtotal.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 24, padding: 16, background: '#f7fafc', borderRadius: 8, fontSize: 13, color: '#718096', maxWidth: 700 }}>
        <strong>補足:</strong> API: <code style={{ background: '#e2e8f0', padding: '1px 6px', borderRadius: 4 }}>GET /orders?user_id={USER_ID}</code>、
        詳細: <code style={{ background: '#e2e8f0', padding: '1px 6px', borderRadius: 4 }}>GET /orders/{'{id}'}</code>
      </div>
    </>
  );
}
