import { useState } from 'react';
import { post, getUploadUrl, uploadImageToS3 } from '../api';

const CATEGORIES = ['electronics', 'accessories', 'clothing', 'food', 'books', 'other'];

export default function ProductAdd() {
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: 'electronics',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [msg, setMsg] = useState('');
  const [isErr, setIsErr] = useState(false);
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!form.name.trim()) { setMsg('商品名を入力してください'); setIsErr(true); return; }
    if (isNaN(price) || price <= 0) { setMsg('価格は正の数で入力してください'); setIsErr(true); return; }
    if (isNaN(stock) || stock < 0) { setMsg('在庫数は0以上で入力してください'); setIsErr(true); return; }

    setLoading(true);
    setMsg('');
    try {
      // 1. Create product
      const product = await post<{ product_id: string; name: string }>('/products', {
        name: form.name.trim(),
        description: form.description.trim(),
        price,
        stock,
        category: form.category,
        image_url: '',
      });

      // 2. Upload image if selected
      if (imageFile) {
        setMsg('画像をアップロード中...');
        const uploadUrl = await getUploadUrl(product.product_id);
        await uploadImageToS3(uploadUrl, imageFile);
        setMsg('画像処理中（サムネイルLambdaが実行されます）...');
      }

      setMsg(`商品「${product.name}」を登録しました${imageFile ? '（画像は数秒後に反映）' : ''} (ID: ${product.product_id})`);
      setIsErr(false);
      setForm({ name: '', description: '', price: '', stock: '', category: 'electronics' });
      setImageFile(null);
    } catch (e) {
      setMsg('登録失敗: ' + String(e));
      setIsErr(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h2>商品追加</h2>
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: 28, maxWidth: 480 }}>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={labelStyle}>
            商品名 <span style={{ color: '#e74c3c' }}>*</span>
            <input
              style={inputStyle}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="例: ワイヤレスイヤホン"
            />
          </label>

          <label style={labelStyle}>
            説明
            <textarea
              style={{ ...inputStyle, height: 80, resize: 'vertical' }}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="商品の説明を入力してください"
            />
          </label>

          <div style={{ display: 'flex', gap: 16 }}>
            <label style={{ ...labelStyle, flex: 1 }}>
              価格（円） <span style={{ color: '#e74c3c' }}>*</span>
              <input
                style={inputStyle}
                type="number"
                min="1"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                placeholder="例: 8800"
              />
            </label>
            <label style={{ ...labelStyle, flex: 1 }}>
              在庫数 <span style={{ color: '#e74c3c' }}>*</span>
              <input
                style={inputStyle}
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => set('stock', e.target.value)}
                placeholder="例: 50"
              />
            </label>
          </div>

          <label style={labelStyle}>
            カテゴリ
            <select
              style={{ ...inputStyle, marginTop: 6 }}
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            商品画像（任意）
            <div style={{ marginTop: 6 }}>
              <input
                type="file"
                accept="image/*"
                style={{ fontSize: 13, color: '#4a5568' }}
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
              {imageFile && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img
                    src={URL.createObjectURL(imageFile)}
                    alt="preview"
                    style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <span style={{ fontSize: 12, color: '#718096' }}>{imageFile.name}</span>
                </div>
              )}
            </div>
          </label>

          <button
            type="submit"
            className="primary"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? '登録中...' : '商品を登録'}
          </button>
        </form>

        {msg && <p className={`msg ${isErr ? 'err' : ''}`} style={{ marginTop: 16 }}>{msg}</p>}
      </div>

      <div style={{ marginTop: 24, padding: 16, background: '#f7fafc', borderRadius: 8, fontSize: 13, color: '#718096', maxWidth: 480 }}>
        <strong>画像パイプライン:</strong> 画像選択 → S3 presigned URL取得 → S3直接アップロード → サムネイルLambda自動起動 → DynamoDB更新<br />
        API: <code style={{ background: '#e2e8f0', padding: '1px 6px', borderRadius: 4 }}>POST /products/{'{id}'}/upload-url</code>
      </div>
    </>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 14,
  fontWeight: 600,
  color: '#4a5568',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: 14,
  border: '1px solid #d0d7e2',
  borderRadius: 8,
  outline: 'none',
  fontFamily: 'inherit',
};
