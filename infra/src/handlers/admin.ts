import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as adminRepo from '../repositories/adminRepository';
import { ok, error } from '../shared/response';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod;
  const tableName = event.pathParameters?.name;

  if (method === 'OPTIONS') return ok({});

  if (method === 'GET' && tableName) {
    try {
      const items = await adminRepo.scanTable(tableName);
      return ok(items);
    } catch {
      return error('Table not found or scan failed', 404);
    }
  }

  if (method === 'GET') {
    const tables = await adminRepo.listTables();
    return ok(tables);
  }

  return error('Method not allowed', 405);
};
