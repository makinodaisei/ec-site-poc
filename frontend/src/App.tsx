import { useState } from 'react';
import Shop from './pages/Shop';
import AdminTables from './pages/AdminTables';
import AdminCanary from './pages/AdminCanary';

type Page = 'shop' | 'admin-tables' | 'admin-canary';

export default function App() {
  const [page, setPage] = useState<Page>('shop');

  return (
    <>
      <nav>
        <button className={page === 'shop' ? 'active' : ''} onClick={() => setPage('shop')}>Shop</button>
        <button className={page === 'admin-tables' ? 'active' : ''} onClick={() => setPage('admin-tables')}>DB Viewer</button>
        <button className={page === 'admin-canary' ? 'active' : ''} onClick={() => setPage('admin-canary')}>Canary</button>
      </nav>
      <main>
        {page === 'shop' && <Shop />}
        {page === 'admin-tables' && <AdminTables />}
        {page === 'admin-canary' && <AdminCanary />}
      </main>
    </>
  );
}
