import { DeleteCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { db } from '../shared/db';
import { config } from '../shared/config';
import type { CartItem } from '../shared/types';

const table = config.tables.cartItems;

export async function getByUser(user_id: string): Promise<CartItem[]> {
  const result = await db.send(
    new QueryCommand({
      TableName: table,
      KeyConditionExpression: 'user_id = :uid',
      ExpressionAttributeValues: { ':uid': user_id },
    })
  );
  return (result.Items ?? []) as CartItem[];
}

export async function add(user_id: string, product_id: string, quantity: number): Promise<CartItem> {
  const item: CartItem = {
    user_id,
    product_id,
    quantity,
    added_at: new Date().toISOString(),
  };
  await db.send(new PutCommand({ TableName: table, Item: item }));
  return item;
}

export async function remove(user_id: string, product_id: string): Promise<void> {
  await db.send(new DeleteCommand({ TableName: table, Key: { user_id, product_id } }));
}

export async function clear(user_id: string, items: CartItem[]): Promise<void> {
  await Promise.all(
    items.map((item) =>
      db.send(new DeleteCommand({ TableName: table, Key: { user_id, product_id: item.product_id } }))
    )
  );
}
