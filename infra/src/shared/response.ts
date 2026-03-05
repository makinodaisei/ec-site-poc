import type { APIGatewayProxyResult } from 'aws-lambda';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function ok(body: unknown): APIGatewayProxyResult {
  return { statusCode: 200, headers, body: JSON.stringify(body) };
}

export function created(body: unknown): APIGatewayProxyResult {
  return { statusCode: 201, headers, body: JSON.stringify(body) };
}

export function error(message: string, code: number): APIGatewayProxyResult {
  return { statusCode: code, headers, body: JSON.stringify({ error: message, code }) };
}
