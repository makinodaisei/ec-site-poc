import { useState, useEffect, useMemo } from 'react';
import { get, post, put, del } from '../api';

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

const CATEGORY_LABELS: Record<string, string> = {
  electronics: '電子機器',
  accessories: 'アクセサリー',
  clothing: '衣類',
  food: '食品',
  books: '書籍',
  other: 'その他',
};

function categoryClass(cat?: string) {
  if (cat === 'electronics') return 'cat-electronics';
  if (cat === 'accessories') return 'cat-accessories';
  return 'cat-default';
}

interface Props {
  onCartCountChange: (n: number) => void;
}

type SortKey = 'default' | 'price-asc' | 'price-desc' | 'name';

export default function Shop({ onCartCountChange }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [isErr, setIsErr] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sort, setSort] = useState<SortKey>('default');

  // Detail modal
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  // Order flow
  const [orderStep, setOrderStep] = useState<'cart' | 'confirm' | 'done'>('cart');
  const [address, setAddress] = useState('東京都渋谷区1-1-1');
  const [ordering, setOrdering] = useState(false);

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
    const existing = cart.find((c) => c.product_id === product_id);
    if (existing) {
      await put(`/cart/${product_id}`, { user_id: USER_ID, quantity: existing.quantity + 1 });
    } else {
      await post('/cart', { user_id: USER_ID, product_id, quantity: 1 });
    }
    await fetchCart();
  }

  async function updateQuantity(product_id: string, quantity: number) {
    if (quantity <= 0) {
      await del(`/cart/${product_id}?user_id=${USER_ID}`);
    } else {
      await put(`/cart/${product_id}`, { user_id: USER_ID, quantity });
    }
    await fetchCart();
  }

  async function removeFromCart(product_id: string) {
    await del(`/cart/${product_id}?user_id=${USER_ID}`);
    await fetchCart();
  }

  async function placeOrder() {
    if (!address.trim()) { setMsg('配送先住所を入力してください'); setIsErr(true); return; }
    setOrdering(true);
    try {
      await post('/orders', { user_id: USER_ID, shipping_address: address });
      setOrderStep('done');
      setMsg('');
      await fetchCart();
    } catch (e) {
      setMsg('注文失敗: ' + String(e));
      setIsErr(true);
      setOrderStep('cart');
    } finally {
      setOrdering(false);
    }
  }

  // Derived data
  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category ?? 'other'));
    return ['all', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.description ?? '').toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
      return matchSearch && matchCat;
    });
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
    if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    return list;
  }, [products, search, categoryFilter, sort]);

  const cartIds = new Set(cart.map((c) => c.product_id));
  const cartTotal = cart.reduce((sum, c) => {
    const p = products.find((p) => p.product_id === c.product_id);
    return sum + (p ? p.price * c.quantity : 0);
  }, 0);

  if (loading) return <p className="loading">読み込み中...</p>;

  // Order done state
  if (orderStep === 'done') {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 48 }}>✅</div>
        <h2 style={{ marginTop: 16 }}>ご注文ありがとうございます</h2>
        <p style={{ color: '#718096' }}>注文が完了しました。</p>
        <button className="primary" style={{ marginTop: 24 }} onClick={() => setOrderStep('cart')}>
          ショップに戻る
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Product detail modal */}
      {detailProduct && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setDetailProduct(null)}
        >
          <div
            style={{ background: 'white', borderRadius: 16, padding: 32, maxWidth: 480, width: '90%', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setDetailProduct(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
            <span className={`card-category ${categoryClass(detailProduct.category)}`}>
              {CATEGORY_LABELS[detailProduct.category ?? ''] ?? detailProduct.category}
            </span>
            <h2 style={{ marginTop: 8, marginBottom: 8 }}>{detailProduct.name}</h2>
            <p style={{ color: '#4a5568', marginBottom: 16, lineHeight: 1.6 }}>{detailProduct.description || '説明なし'}</p>
            <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: '#a0aec0' }}>価格</div>
                <div className="card-price">¥{detailProduct.price.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#a0aec0' }}>在庫</div>
                <div style={{ fontWeight: 700, color: detailProduct.stock > 0 ? '#27ae60' : '#e74c3c' }}>
                  {detailProduct.stock > 0 ? `${detailProduct.stock} 点` : '在庫なし'}
                </div>
              </div>
            </div>
            {cartIds.has(detailProduct.product_id) ? (
              <button className="small danger" onClick={() => { removeFromCart(detailProduct.product_id); setDetailProduct(null); }}>
                カートから削除
              </button>
            ) : (
              <button className="primary" disabled={detailProduct.stock === 0}
                onClick={() => { addToCart(detailProduct.product_id); setDetailProduct(null); }}>
                カートに追加
              </button>
            )}
          </div>
        </div>
      )}

      {/* Product list */}
      <section>
        <h2>商品一覧</h2>

        {/* Search, filter, sort controls */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
          <input
            style={{ padding: '8px 14px', border: '1px solid #d0d7e2', borderRadius: 8, fontSize: 14, width: 220, outline: 'none' }}
            placeholder="商品を検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>{c === 'all' ? '全カテゴリ' : (CATEGORY_LABELS[c] ?? c)}</option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="default">並び順: デフォルト</option>
            <option value="price-asc">価格: 安い順</option>
            <option value="price-desc">価格: 高い順</option>
            <option value="name">名前順</option>
          </select>
          <span style={{ fontSize: 13, color: '#a0aec0' }}>{filteredProducts.length} 件</span>
        </div>

        {filteredProducts.length === 0 && (
          <p className="muted">{products.length === 0 ? '商品がありません（Seed data を実行してください）' : '該当商品なし'}</p>
        )}
        <div className="cards">
          {filteredProducts.map((p) => (
            <div key={p.product_id} className="card" onClick={() => setDetailProduct(p)} style={{ cursor: 'pointer' }}>
              <span className={`card-category ${categoryClass(p.category)}`}>
                {CATEGORY_LABELS[p.category ?? ''] ?? p.category}
              </span>
              <p className="card-name">{p.name}</p>
              <p className="card-desc">{p.description}</p>
              <p className="card-price">¥{p.price.toLocaleString()}</p>
              <p className="card-stock" style={{ color: p.stock === 0 ? '#e74c3c' : undefined }}>
                在庫 {p.stock} 点{p.stock === 0 ? '（在庫なし）' : ''}
              </p>
              {cartIds.has(p.product_id) ? (
                <p className="in-cart" onClick={(e) => e.stopPropagation()}>✓ カート追加済み</p>
              ) : (
                <button className="small" disabled={p.stock === 0}
                  onClick={(e) => { e.stopPropagation(); addToCart(p.product_id); }}>
                  {p.stock === 0 ? '在庫なし' : 'カートに追加'}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Cart */}
      <section>
        <h2>カート ({cart.length} 点)</h2>

        {orderStep === 'confirm' ? (
          /* Confirmation step */
          <div className="cart-box" style={{ maxWidth: 600 }}>
            <h3 style={{ margin: '0 0 16px' }}>注文内容の確認</h3>
            {cart.map((c) => {
              const p = products.find((pr) => pr.product_id === c.product_id);
              return (
                <div key={c.product_id} className="cart-item">
                  <span className="cart-item-name">{p?.name ?? c.product_id} × {c.quantity}</span>
                  <span className="cart-item-price">¥{p ? (p.price * c.quantity).toLocaleString() : '—'}</span>
                </div>
              );
            })}
            <div className="cart-total">
              <span className="cart-total-label">合計</span>
              <span className="cart-total-price">¥{cartTotal.toLocaleString()}</span>
            </div>
            <div style={{ marginTop: 20 }}>
              <label style={{ fontSize: 14, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 6 }}>
                配送先住所 <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                style={{ width: '100%', padding: '10px 14px', border: '1px solid #d0d7e2', borderRadius: 8, fontSize: 14, outline: 'none', marginBottom: 16 }}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="例: 東京都渋谷区1-1-1"
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="primary" onClick={placeOrder} disabled={ordering}>
                {ordering ? '処理中...' : '注文を確定する'}
              </button>
              <button className="small" onClick={() => setOrderStep('cart')}>戻る</button>
            </div>
            {msg && <p className={`msg ${isErr ? 'err' : ''}`}>{msg}</p>}
          </div>
        ) : cart.length === 0 ? (
          <p className="muted">カートは空です</p>
        ) : (
          <div className="cart-box" style={{ maxWidth: 600 }}>
            {cart.map((c) => {
              const p = products.find((pr) => pr.product_id === c.product_id);
              return (
                <div key={c.product_id} className="cart-item">
                  <span className="cart-item-name">{p?.name ?? c.product_id}</span>
                  <div className="cart-item-right">
                    <span className="cart-item-price">
                      ¥{p ? (p.price * c.quantity).toLocaleString() : '—'}
                    </span>
                    {/* Quantity control */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button className="small" style={{ padding: '3px 9px', minWidth: 28 }}
                        onClick={() => updateQuantity(c.product_id, c.quantity - 1)}>−</button>
                      <span style={{ fontSize: 14, fontWeight: 600, minWidth: 20, textAlign: 'center' }}>{c.quantity}</span>
                      <button className="small" style={{ padding: '3px 9px', minWidth: 28 }}
                        onClick={() => updateQuantity(c.product_id, c.quantity + 1)}>＋</button>
                    </div>
                    <button className="small danger" onClick={() => removeFromCart(c.product_id)}>削除</button>
                  </div>
                </div>
              );
            })}
            <div className="cart-total">
              <span className="cart-total-label">合計</span>
              <span className="cart-total-price">¥{cartTotal.toLocaleString()}</span>
            </div>
            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button className="primary" onClick={() => setOrderStep('confirm')}>
                注文手続きへ →
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
