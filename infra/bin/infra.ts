#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { NetworkStack } from '../lib/network-stack';
import { DatabaseStack } from '../lib/database-stack';
import { StorageStack } from '../lib/storage-stack';
import { BudgetStack } from '../lib/budget-stack';
import { ApiStack } from '../lib/api-stack';
import { MonitoringStack } from '../lib/monitoring-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'ap-northeast-1',
};

new NetworkStack(app, 'EcSiteNetwork', { env });

const db = new DatabaseStack(app, 'EcSiteDatabase', { env });

const storage = new StorageStack(app, 'EcSiteStorage', { env });

const api = new ApiStack(app, 'EcSiteApi', {
  env,
  assetsBucketName: storage.assetsBucket.bucketName,
  tables: {
    products: db.productsTable,
    users: db.usersTable,
    orders: db.ordersTable,
    orderItems: db.orderItemsTable,
    cartItems: db.cartItemsTable,
    canaryResults: db.canaryResultsTable,
  },
});

new BudgetStack(app, 'EcSiteBudget', { env });

new MonitoringStack(app, 'EcSiteMonitoring', {
  env,
  canaryResultsTable: db.canaryResultsTable,
  apiUrl: api.api.url,
  alertEmail: 'makinodaisei6345@gmail.com',
});
