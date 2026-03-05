import * as cdk from 'aws-cdk-lib/core';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class DatabaseStack extends cdk.Stack {
  public readonly productsTable: dynamodb.Table;
  public readonly usersTable: dynamodb.Table;
  public readonly ordersTable: dynamodb.Table;
  public readonly orderItemsTable: dynamodb.Table;
  public readonly cartItemsTable: dynamodb.Table;
  public readonly canaryResultsTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.productsTable = new dynamodb.Table(this, 'ProductsTable', {
      tableName: 'products',
      partitionKey: { name: 'product_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'users',
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    this.usersTable.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
    });

    this.ordersTable = new dynamodb.Table(this, 'OrdersTable', {
      tableName: 'orders',
      partitionKey: { name: 'order_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    this.ordersTable.addGlobalSecondaryIndex({
      indexName: 'user_id-index',
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
    });

    this.orderItemsTable = new dynamodb.Table(this, 'OrderItemsTable', {
      tableName: 'order_items',
      partitionKey: { name: 'order_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'product_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.cartItemsTable = new dynamodb.Table(this, 'CartItemsTable', {
      tableName: 'cart_items',
      partitionKey: { name: 'user_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'product_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.canaryResultsTable = new dynamodb.Table(this, 'CanaryResultsTable', {
      tableName: 'canary_results',
      partitionKey: { name: 'check_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }
}
