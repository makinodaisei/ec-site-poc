import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as orderRepo from '../repositories/orderRepository';
import * as cartRepo from '../repositories/cartRepository';
import { ok, created, error } from '../shared/response';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod;
  const orderId = event.pathParameters?.id;

  if (method === 'OPTIONS') return ok({});

  if (method === 'GET' && orderId) {
    const result = await orderRepo.getById(orderId);
    if (!result) return error('Order not found', 404);
    return ok(result);
  }

  if (method === 'GET') {
    const user_id = event.queryStringParameters?.user_id;
    if (!user_id) return error('user_id required', 400);
    const orders = await orderRepo.listByUser(user_id);
    return ok(orders);
  }

  if (method === 'POST') {
    const body = JSON.parse(event.body ?? '{}');
    const { user_id, shipping_address } = body;
    if (!user_id) return error('user_id required', 400);

    const cartItems = await cartRepo.getByUser(user_id);
    if (cartItems.length === 0) return error('Cart is empty', 400);

    const order = await orderRepo.create(user_id, cartItems, shipping_address ?? '');
    await cartRepo.clear(user_id, cartItems);
    return created(order);
  }

  return error('Method not allowed', 405);
};
