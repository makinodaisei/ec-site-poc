export const config = {
  tables: {
    products: process.env.PRODUCTS_TABLE ?? 'products',
    users: process.env.USERS_TABLE ?? 'users',
    orders: process.env.ORDERS_TABLE ?? 'orders',
    orderItems: process.env.ORDER_ITEMS_TABLE ?? 'order_items',
    cartItems: process.env.CART_ITEMS_TABLE ?? 'cart_items',
    canaryResults: process.env.CANARY_RESULTS_TABLE ?? 'canary_results',
  },
};
