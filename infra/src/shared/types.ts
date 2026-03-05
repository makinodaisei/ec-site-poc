export interface Product {
  product_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  stock: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  user_id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
}

export interface Order {
  order_id: string;
  user_id: string;
  status: 'pending' | 'paid' | 'shipped' | 'cancelled';
  total_amount: number;
  shipping_address: string;
  created_at: string;
}

export interface OrderItem {
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface CartItem {
  user_id: string;
  product_id: string;
  quantity: number;
  added_at: string;
}
