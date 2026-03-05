import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as productRepo from '../repositories/productRepository';
import { ok, created, error } from '../shared/response';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod;
  const productId = event.pathParameters?.id;

  if (method === 'OPTIONS') return ok({});

  if (method === 'GET' && productId) {
    const product = await productRepo.getById(productId);
    if (!product) return error('Product not found', 404);
    return ok(product);
  }

  if (method === 'GET') {
    const products = await productRepo.list();
    return ok(products);
  }

  if (method === 'POST') {
    const body = JSON.parse(event.body ?? '{}');
    const product = await productRepo.create(body);
    return created(product);
  }

  return error('Method not allowed', 405);
};
