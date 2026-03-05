import { useState } from 'react';
import Shop from './pages/Shop';
import AdminTables from './pages/AdminTables';
import AdminCanary from './pages/AdminCanary';

type Page = 'shop' | 'admin-tables' | 'admin-canary';

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
        <button className={page === 'admin-tables' ? 'active' : ''} onClick={() => setPage('admin-tables')}>DB Viewer</button>
        <button className={page === 'admin-canary' ? 'active' : ''} onClick={() => setPage('admin-canary')}>Canary</button>
      </nav>
      <main>
        {page === 'shop' && <Shop onCartCountChange={setCartCount} />}
        {page === 'admin-tables' && <AdminTables />}
        {page === 'admin-canary' && <AdminCanary />}
      </main>
    </>
  );
}
