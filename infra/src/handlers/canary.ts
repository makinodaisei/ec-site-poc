import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import * as https from 'https';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sns = new SNSClient({});

const TABLE = process.env.CANARY_RESULTS_TABLE ?? 'canary_results';
const API_BASE = process.env.API_BASE_URL ?? '';
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN ?? '';

interface CheckResult {
  endpoint: string;
  status: 'ok' | 'error';
  statusCode?: number;
  responseTimeMs: number;
  error?: string;
}

function httpGet(url: string): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = https.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode ?? 0, body }));
    });
    req.setTimeout(10000, () => {
      req.destroy(new Error('timeout'));
    });
    req.on('error', reject);
  });
}

async function checkEndpoint(path: string): Promise<CheckResult> {
  const url = `${API_BASE}${path}`;
  const start = Date.now();
  try {
    const { statusCode } = await httpGet(url);
    const responseTimeMs = Date.now() - start;
    return {
      endpoint: path,
      status: statusCode >= 200 && statusCode < 300 ? 'ok' : 'error',
      statusCode,
      responseTimeMs,
    };
  } catch (err) {
    return {
      endpoint: path,
      status: 'error',
      responseTimeMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export const handler = async (): Promise<void> => {
  const endpoints = ['/products', '/cart?user_id=canary-probe'];
  const results = await Promise.all(endpoints.map(checkEndpoint));

  const timestamp = new Date().toISOString();
  const allOk = results.every((r) => r.status === 'ok');

  await Promise.all(
    results.map((r) =>
      ddb.send(
        new PutCommand({
          TableName: TABLE,
          Item: {
            check_id: `${timestamp}#${r.endpoint}`,
            timestamp,
            endpoint: r.endpoint,
            status: r.status,
            status_code: r.statusCode,
            response_time_ms: r.responseTimeMs,
            error: r.error,
          },
        })
      )
    )
  );

  if (!allOk && SNS_TOPIC_ARN) {
    const failed = results.filter((r) => r.status === 'error');
    await sns.send(
      new PublishCommand({
        TopicArn: SNS_TOPIC_ARN,
        Subject: '[EC Site Canary] ALERT: endpoint failure detected',
        Message: JSON.stringify({ timestamp, failed }, null, 2),
      })
    );
  }
};
