import { useState } from 'react';
import Shop from './pages/Shop';
import ProductAdd from './pages/ProductAdd';
import OrderHistory from './pages/OrderHistory';
import AdminTables from './pages/AdminTables';
import AdminCanary from './pages/AdminCanary';

type Page = 'shop' | 'product-add' | 'orders' | 'admin-tables' | 'admin-canary';

export default function App() {
  const [page, setPage] = useState<Page>('shop');
  const [cartCount, setCartCount] = useState(0);

  return (
    <>
      <nav>
        <span className="nav-brand">EC<span>Shop</span></span>
        <button className={page === 'shop' ? 'active' : ''} onClick={() => setPage('shop')}>
          ショップ
          {cartCount > 0 && <span className="badge">{cartCount}</span>}
        </button>
        <button className={page === 'product-add' ? 'active' : ''} onClick={() => setPage('product-add')}>
          商品追加
        </button>
        <button className={page === 'orders' ? 'active' : ''} onClick={() => setPage('orders')}>
          注文履歴
        </button>
        <button className={page === 'admin-tables' ? 'active' : ''} onClick={() => setPage('admin-tables')}>
          DB Viewer
        </button>
        <button className={page === 'admin-canary' ? 'active' : ''} onClick={() => setPage('admin-canary')}>
          カナリア
        </button>
      </nav>
      <main>
        {page === 'shop'         && <Shop onCartCountChange={setCartCount} />}
        {page === 'product-add'  && <ProductAdd />}
        {page === 'orders'       && <OrderHistory />}
        {page === 'admin-tables' && <AdminTables />}
        {page === 'admin-canary' && <AdminCanary />}
      </main>
    </>
  );
}
