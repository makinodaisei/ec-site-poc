import { useState, useEffect } from 'react';
import { get, post, del } from '../api';

interface Product {
  product_id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
}

interface CartItem {
  user_id: string;
  product_id: string;
  quantity: number;
}

const USER_ID = 'user-demo-1';

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [msg, setMsg] = useState('');
  const [isErr, setIsErr] = useState(false);

  const fetchCart = () =>
    get<CartItem[]>(`/cart?user_id=${USER_ID}`).then(setCart).catch(console.error);

  useEffect(() => {
    get<Product[]>('/products').then(setProducts).catch(console.error);
    fetchCart();
  }, []);

  async function addToCart(product_id: string) {
    await post('/cart', { user_id: USER_ID, product_id, quantity: 1 });
    await fetchCart();
  }

  async function removeFromCart(product_id: string) {
    await del(`/cart/${product_id}?user_id=${USER_ID}`);
    await fetchCart();
  }

  async function placeOrder() {
    try {
      await post('/orders', { user_id: USER_ID, shipping_address: '東京都渋谷区1-1-1' });
      setMsg('注文が完了しました！');
      setIsErr(false);
      await fetchCart();
    } catch (e) {
      setMsg('注文失敗: ' + String(e));
      setIsErr(true);
    }
  }

  const cartIds = new Set(cart.map((c) => c.product_id));

  return (
    <div>
      <h2>商品一覧</h2>
      {products.length === 0 && <p style={{ color: '#888' }}>商品がありません（Seed data を実行してください）</p>}
      <div className="cards">
        {products.map((p) => (
          <div key={p.product_id} className="card">
            <strong>{p.name}</strong>
            <p style={{ fontSize: 12, color: '#555', margin: '6px 0' }}>{p.description}</p>
            <p style={{ margin: '4px 0' }}>¥{p.price.toLocaleString()}</p>
            <p style={{ fontSize: 12, color: '#888', margin: '4px 0' }}>在庫: {p.stock}</p>
            {cartIds.has(p.product_id) ? (
              <button className="small" onClick={() => removeFromCart(p.product_id)}>カートから削除</button>
            ) : (
              <button className="small" onClick={() => addToCart(p.product_id)}>カートに追加</button>
            )}
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 32 }}>カート ({cart.length}点)</h2>
      {cart.length === 0 && <p style={{ color: '#888' }}>カートは空です</p>}
      {cart.length > 0 && (
        <>
          <ul>
            {cart.map((c) => (
              <li key={c.product_id}>
                {products.find((p) => p.product_id === c.product_id)?.name ?? c.product_id} × {c.quantity}
              </li>
            ))}
          </ul>
          <button className="primary" onClick={placeOrder}>注文する</button>
        </>
      )}
      {msg && <p className={`msg ${isErr ? 'err' : ''}`}>{msg}</p>}
    </div>
  );
}
