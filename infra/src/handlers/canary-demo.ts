import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { db } from '../shared/db';
import { ok, created, error } from '../shared/response';
import { config } from '../shared/config';

const CONFIG_KEY = 'CONFIG#canary_weight';
const table = config.tables.canaryResults;

async function getWeight(): Promise<number> {
  const result = await db.send(new GetCommand({ TableName: table, Key: { check_id: CONFIG_KEY } }));
  return (result.Item?.weight as number) ?? 50;
}

const VERSIONS = {
  stable: {
    label: 'stable',
    color: '#27ae60',
    message: '通常バージョン（安定版）- 既存のコードパスを使用しています',
    feature_flags: { new_ui: false, improved_search: false, beta_checkout: false },
  },
  canary: {
    label: 'canary',
    color: '#e67e22',
    message: '新バージョン（カナリア）- 新機能を含む候補バージョンです',
    feature_flags: { new_ui: true, improved_search: true, beta_checkout: false },
  },
} as const;

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod;
  const sub = event.pathParameters?.sub;

  if (method === 'OPTIONS') return ok({});

  // POST /canary-demo/weight — update routing weight
  if (method === 'POST' && sub === 'weight') {
    const body = JSON.parse(event.body ?? '{}');
    const weight = Number(body.weight);
    if (isNaN(weight) || weight < 0 || weight > 100) {
      return error('weight must be 0–100', 400);
    }
    await db.send(
      new PutCommand({
        TableName: table,
        Item: { check_id: CONFIG_KEY, weight, updated_at: new Date().toISOString() },
      })
    );
    return ok({ weight, message: `カナリア比率を ${weight}% に更新しました` });
  }

  // GET /canary-demo — route based on weight
  if (method === 'GET') {
    const weight = await getWeight();
    const useCanary = Math.random() * 100 < weight;
    const version = useCanary ? VERSIONS.canary : VERSIONS.stable;
    const timestamp = new Date().toISOString();
    const requestId = event.requestContext?.requestId ?? timestamp;

    // Store result for history
    await db.send(
      new PutCommand({
        TableName: table,
        Item: {
          check_id: `DEMO#${timestamp}#${requestId}`,
          timestamp,
          endpoint: '/canary-demo',
          status: 'ok',
          response_time_ms: 0,
          version: version.label,
          weight_at_request: weight,
        },
      })
    );

    return ok({ version: version.label, weight, color: version.color, message: version.message, feature_flags: version.feature_flags, timestamp });
  }

  return error('Method not allowed', 405);
};
