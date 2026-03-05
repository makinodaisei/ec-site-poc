import { GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { db } from '../shared/db';
import { config } from '../shared/config';
import type { Product } from '../shared/types';

const table = config.tables.products;

export async function list(): Promise<Product[]> {
  const result = await db.send(new ScanCommand({ TableName: table }));
  return (result.Items ?? []) as Product[];
}

export async function getById(product_id: string): Promise<Product | undefined> {
  const result = await db.send(new GetCommand({ TableName: table, Key: { product_id } }));
  return result.Item as Product | undefined;
}

export async function create(data: Partial<Product>): Promise<Product> {
  const now = new Date().toISOString();
  const product: Product = {
    product_id: randomUUID(),
    name: data.name ?? '',
    description: data.description ?? '',
    price: data.price ?? 0,
    category: data.category ?? '',
    image_url: data.image_url ?? '',
    stock: data.stock ?? 0,
    created_at: now,
    updated_at: now,
  };
  await db.send(new PutCommand({ TableName: table, Item: product }));
  return product;
}
