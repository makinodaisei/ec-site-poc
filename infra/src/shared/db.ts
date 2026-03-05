import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const rawClient = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'ap-northeast-1' });
export const db = DynamoDBDocumentClient.from(rawClient);
