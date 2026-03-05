import { ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { rawClient, db } from '../shared/db';

export async function listTables(): Promise<string[]> {
  const result = await rawClient.send(new ListTablesCommand({}));
  return result.TableNames ?? [];
}

export async function scanTable(tableName: string): Promise<unknown[]> {
  const result = await db.send(new ScanCommand({ TableName: tableName }));
  return result.Items ?? [];
}
