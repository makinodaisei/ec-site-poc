import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { db } from '../shared/db';
import { config } from '../shared/config';
import { decreaseStock } from './productRepository';
import type { CartItem, Order, OrderItem } from '../shared/types';

export async function create(
  user_id: string,
  cartItems: CartItem[],
  shipping_address: string
): Promise<Order> {
  const order_id = randomUUID();
  const now = new Date().toISOString();

  const orderItems: OrderItem[] = [];
  let total_amount = 0;

  for (const cartItem of cartItems) {
    const productResult = await db.send(
      new GetCommand({ TableName: config.tables.products, Key: { product_id: cartItem.product_id } })
    );
    const product = productResult.Item;
    if (!product) continue;

    const subtotal = product.price * cartItem.quantity;
    total_amount += subtotal;
    orderItems.push({
      order_id,
      product_id: cartItem.product_id,
      quantity: cartItem.quantity,
      unit_price: product.price,
      subtotal,
    });
  }

  const order: Order = {
    order_id,
    user_id,
    status: 'pending',
    total_amount,
    shipping_address,
    created_at: now,
  };

  await db.send(new PutCommand({ TableName: config.tables.orders, Item: order }));
  for (const item of orderItems) {
    await db.send(new PutCommand({ TableName: config.tables.orderItems, Item: item }));
  }
  // Decrease stock for each ordered item (best-effort)
  await Promise.allSettled(orderItems.map((item) => decreaseStock(item.product_id, item.quantity)));

  return order;
}

export async function updateStatus(order_id: string, status: string): Promise<void> {
  await db.send(
    new UpdateCommand({
      TableName: config.tables.orders,
      Key: { order_id },
      UpdateExpression: 'SET #s = :status',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':status': status },
    })
  );
}

export async function getById(
  order_id: string
): Promise<{ order: Order; items: OrderItem[] } | undefined> {
  const orderResult = await db.send(
    new GetCommand({ TableName: config.tables.orders, Key: { order_id } })
  );
  if (!orderResult.Item) return undefined;

  const itemsResult = await db.send(
    new QueryCommand({
      TableName: config.tables.orderItems,
      KeyConditionExpression: 'order_id = :oid',
      ExpressionAttributeValues: { ':oid': order_id },
    })
  );

  return {
    order: orderResult.Item as Order,
    items: (itemsResult.Items ?? []) as OrderItem[],
  };
}

export async function listByUser(user_id: string): Promise<Order[]> {
  const result = await db.send(
    new QueryCommand({
      TableName: config.tables.orders,
      IndexName: 'user_id-index',
      KeyConditionExpression: 'user_id = :uid',
      ExpressionAttributeValues: { ':uid': user_id },
    })
  );
  return (result.Items ?? []) as Order[];
}
