import { useState, useEffect } from 'react';
import { get, post, del } from '../api';

interface Product {
  product_id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category?: string;
}

interface CartItem {
  user_id: string;
  product_id: string;
  quantity: number;
}

const USER_ID = 'user-demo-1';

function categoryClass(cat?: string) {
  if (cat === 'electronics') return 'cat-electronics';
  if (cat === 'accessories') return 'cat-accessories';
  return 'cat-default';
}

function categoryLabel(cat?: string) {
  if (cat === 'electronics') return '電子機器';
  if (cat === 'accessories') return 'アクセサリー';
  return cat ?? 'その他';
}

interface Props {
  onCartCountChange: (n: number) => void;
}

export default function Shop({ onCartCountChange }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [msg, setMsg] = useState('');
  const [isErr, setIsErr] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCart = async () => {
    const items = await get<CartItem[]>(`/cart?user_id=${USER_ID}`).catch(() => [] as CartItem[]);
    setCart(items);
    onCartCountChange(items.length);
  };

  useEffect(() => {
    Promise.all([
      get<Product[]>('/products').then(setProducts).catch(console.error),
      fetchCart(),
    ]).finally(() => setLoading(false));
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
      setMsg('注文が完了しました！ご購入ありがとうございます。');
      setIsErr(false);
      await fetchCart();
    } catch (e) {
      setMsg('注文失敗: ' + String(e));
      setIsErr(true);
    }
  }

  const cartIds = new Set(cart.map((c) => c.product_id));
  const cartTotal = cart.reduce((sum, c) => {
    const p = products.find((p) => p.product_id === c.product_id);
    return sum + (p ? p.price * c.quantity : 0);
  }, 0);

  if (loading) return <p className="loading">読み込み中...</p>;

  return (
    <>
      <section>
        <h2>商品一覧</h2>
        {products.length === 0 && (
          <p className="muted">商品がありません（Seed data を実行してください）</p>
        )}
        <div className="cards">
          {products.map((p) => (
            <div key={p.product_id} className="card">
              <span className={`card-category ${categoryClass(p.category)}`}>
                {categoryLabel(p.category)}
              </span>
              <p className="card-name">{p.name}</p>
              <p className="card-desc">{p.description}</p>
              <p className="card-price">¥{p.price.toLocaleString()}</p>
              <p className="card-stock">在庫 {p.stock} 点</p>
              {cartIds.has(p.product_id) ? (
                <>
                  <p className="in-cart">✓ カートに追加済み</p>
                  <button className="small danger" onClick={() => removeFromCart(p.product_id)}>
                    削除
                  </button>
                </>
              ) : (
                <button
                  className="small"
                  onClick={() => addToCart(p.product_id)}
                  disabled={p.stock === 0}
                >
                  {p.stock === 0 ? '在庫なし' : 'カートに追加'}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>カート ({cart.length} 点)</h2>
        {cart.length === 0 ? (
          <p className="muted">カートは空です</p>
        ) : (
          <div className="cart-box">
            {cart.map((c) => {
              const p = products.find((pr) => pr.product_id === c.product_id);
              return (
                <div key={c.product_id} className="cart-item">
                  <span className="cart-item-name">{p?.name ?? c.product_id}</span>
                  <div className="cart-item-right">
                    <span className="cart-item-price">
                      ¥{p ? (p.price * c.quantity).toLocaleString() : '—'}
                    </span>
                    <button className="small danger" onClick={() => removeFromCart(c.product_id)}>
                      削除
                    </button>
                  </div>
                </div>
              );
            })}
            <div className="cart-total">
              <span className="cart-total-label">合計</span>
              <span className="cart-total-price">¥{cartTotal.toLocaleString()}</span>
            </div>
            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button className="primary" onClick={placeOrder}>
                注文する
              </button>
            </div>
          </div>
        )}
        {msg && <p className={`msg ${isErr ? 'err' : ''}`}>{msg}</p>}
      </section>
    </>
  );
}
