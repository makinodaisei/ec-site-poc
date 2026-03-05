import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as cartRepo from '../repositories/cartRepository';
import { ok, created, error } from '../shared/response';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod;

  if (method === 'OPTIONS') return ok({});

  if (method === 'GET') {
    const user_id = event.queryStringParameters?.user_id;
    if (!user_id) return error('user_id required', 400);
    const items = await cartRepo.getByUser(user_id);
    return ok(items);
  }

  if (method === 'POST') {
    const body = JSON.parse(event.body ?? '{}');
    const { user_id, product_id, quantity } = body;
    if (!user_id || !product_id || !quantity) return error('user_id, product_id, quantity required', 400);
    const item = await cartRepo.add(user_id, product_id, Number(quantity));
    return created(item);
  }

  if (method === 'DELETE') {
    const product_id = event.pathParameters?.product_id;
    const user_id = event.queryStringParameters?.user_id;
    if (!user_id || !product_id) return error('user_id and product_id required', 400);
    await cartRepo.remove(user_id, product_id);
    return ok({ message: 'deleted' });
  }

  return error('Method not allowed', 405);
};
