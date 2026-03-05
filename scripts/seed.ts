/**
 * Seed script — calls API endpoints to populate DynamoDB with test data.
 * Usage: npx ts-node --esm scripts/seed.ts
 *        (run from project root)
 */

const API = 'https://x1cgaflari.execute-api.ap-northeast-1.amazonaws.com/prod';

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${await res.text()}`);
  return res.json() as Promise<T>;
}

interface Product { product_id: string; name: string; }
interface Order { order_id: string; total_amount: number; }

async function main() {
  console.log('=== Seed Start ===');

  // 1. Products
  console.log('\n[1] Creating products...');
  const products: Product[] = await Promise.all([
    post('/products', { name: 'ワイヤレスイヤホン',    description: 'ノイズキャンセリング搭載の高音質イヤホン', price: 8800,  category: 'electronics',  image_url: '', stock: 50 }),
    post('/products', { name: 'メカニカルキーボード',  description: '打鍵感抜群のゲーミングキーボード',         price: 12800, category: 'electronics',  image_url: '', stock: 30 }),
    post('/products', { name: 'USBハブ 7ポート',       description: 'USB-C接続の多機能ハブ',                   price: 3200,  category: 'electronics',  image_url: '', stock: 100 }),
    post('/products', { name: 'ノートPCスタンド',      description: 'アルミ製 高さ調節可能',                   price: 4500,  category: 'accessories',  image_url: '', stock: 60 }),
    post('/products', { name: 'ケーブル収納ボックス',  description: '配線をすっきりまとめるケーブルボックス',   price: 1980,  category: 'accessories',  image_url: '', stock: 200 }),
    post('/products', { name: 'ウェブカメラ HD',        description: '1080p 広角レンズ搭載',                    price: 6800,  category: 'electronics',  image_url: '', stock: 40 }),
  ]);
  products.forEach(p => console.log(`  ✓ ${p.name} (${p.product_id})`));

  // 2. Cart + Order for demo user
  const userId = 'user-demo-1';
  console.log(`\n[2] Adding items to cart for ${userId}...`);
  await post('/cart', { user_id: userId, product_id: products[0].product_id, quantity: 1 });
  await post('/cart', { user_id: userId, product_id: products[2].product_id, quantity: 2 });
  console.log('  ✓ 2 items added to cart');

  console.log('\n[3] Placing sample order...');
  const order: Order = await post('/orders', {
    user_id: userId,
    shipping_address: '東京都渋谷区1-1-1 テスト太郎',
  });
  console.log(`  ✓ Order: ${order.order_id}  total: ¥${order.total_amount.toLocaleString()}`);

  // 3. Verify
  console.log('\n[4] Verification...');
  const allProducts: Product[] = await get('/products');
  const orders: Order[] = await get(`/orders?user_id=${userId}`);
  console.log(`  Products in DB : ${allProducts.length}`);
  console.log(`  Orders for ${userId}: ${orders.length}`);

  console.log('\n=== Seed Complete ===');
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
