# EC Site PoC - API Specification

Base URL: `https://x1cgaflari.execute-api.ap-northeast-1.amazonaws.com/prod`

All responses include CORS headers. Request/response bodies are JSON.

---

## Products

### GET /products

List all products.

**Response 200**
```json
[
  {
    "product_id": "string",
    "name": "string",
    "price": 1000,
    "description": "string",
    "stock": 10,
    "category": "string",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

### GET /products/{id}

Get a single product by ID.

**Response 200** — Product object (same schema as above)

**Response 404**
```json
{ "error": "Product not found" }
```

### POST /products

Create a new product.

**Request body**
```json
{
  "name": "string",
  "price": 1000,
  "description": "string",
  "stock": 10,
  "category": "string"
}
```

**Response 201** — Created product object

---

## Cart

### GET /cart?user_id={user_id}

Get cart items for a user.

**Response 200**
```json
[
  {
    "user_id": "string",
    "product_id": "string",
    "quantity": 1,
    "added_at": "2024-01-01T00:00:00.000Z"
  }
]
```

### POST /cart

Add item to cart.

**Request body**
```json
{
  "user_id": "string",
  "product_id": "string",
  "quantity": 1
}
```

**Response 201** — Cart item object

### DELETE /cart/{product_id}?user_id={user_id}

Remove item from cart.

**Response 200** `{ "ok": true }`

---

## Orders

### GET /orders?user_id={user_id}

List orders for a user.

**Response 200**
```json
[
  {
    "order_id": "string",
    "user_id": "string",
    "status": "pending",
    "total_amount": 5000,
    "shipping_address": "string",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

### GET /orders/{id}

Get a single order with its items.

**Response 200**
```json
{
  "order": { ... },
  "items": [ { "order_id": "...", "product_id": "...", "quantity": 1, "unit_price": 1000 } ]
}
```

**Response 404** `{ "error": "Order not found" }`

### POST /orders

Place an order from the user's current cart.

**Request body**
```json
{
  "user_id": "string",
  "shipping_address": "string"
}
```

**Response 201** — Order object (cart is cleared after order creation)

**Response 400** `{ "error": "Cart is empty" }`

---

## Admin

### GET /admin/tables

List all DynamoDB table names.

**Response 200**
```json
{ "tables": ["products", "users", "orders", "order_items", "cart_items", "canary_results"] }
```

### GET /admin/tables/{name}

Scan all items from a DynamoDB table.

**Response 200**
```json
{ "items": [ ... ], "count": 6 }
```
