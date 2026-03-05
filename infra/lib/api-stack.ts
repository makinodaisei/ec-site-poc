import * as cdk from 'aws-cdk-lib/core';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import * as path from 'path';

interface ApiStackProps extends cdk.StackProps {
  tables: {
    products: dynamodb.Table;
    users: dynamodb.Table;
    orders: dynamodb.Table;
    orderItems: dynamodb.Table;
    cartItems: dynamodb.Table;
    canaryResults: dynamodb.Table;
  };
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { tables } = props;
    const srcDir = path.join(__dirname, '../src');

    const commonEnv = {
      PRODUCTS_TABLE: tables.products.tableName,
      USERS_TABLE: tables.users.tableName,
      ORDERS_TABLE: tables.orders.tableName,
      ORDER_ITEMS_TABLE: tables.orderItems.tableName,
      CART_ITEMS_TABLE: tables.cartItems.tableName,
      CANARY_RESULTS_TABLE: tables.canaryResults.tableName,
    };

    const bundling = {
      externalModules: ['@aws-sdk/*'],
    };

    const runtime = lambda.Runtime.NODEJS_20_X;

    const productsLambda = new lambdaNodejs.NodejsFunction(this, 'ProductsFunction', {
      entry: path.join(srcDir, 'handlers/products.ts'),
      handler: 'handler',
      runtime,
      environment: commonEnv,
      bundling,
    });

    const cartLambda = new lambdaNodejs.NodejsFunction(this, 'CartFunction', {
      entry: path.join(srcDir, 'handlers/cart.ts'),
      handler: 'handler',
      runtime,
      environment: commonEnv,
      bundling,
    });

    const ordersLambda = new lambdaNodejs.NodejsFunction(this, 'OrdersFunction', {
      entry: path.join(srcDir, 'handlers/orders.ts'),
      handler: 'handler',
      runtime,
      environment: commonEnv,
      bundling,
    });

    const adminLambda = new lambdaNodejs.NodejsFunction(this, 'AdminFunction', {
      entry: path.join(srcDir, 'handlers/admin.ts'),
      handler: 'handler',
      runtime,
      environment: commonEnv,
      bundling,
    });

    const canaryDemoLambda = new lambdaNodejs.NodejsFunction(this, 'CanaryDemoFunction', {
      entry: path.join(srcDir, 'handlers/canary-demo.ts'),
      handler: 'handler',
      runtime,
      environment: commonEnv,
      bundling,
    });

    // DynamoDB permissions
    tables.products.grantReadWriteData(productsLambda);

    tables.cartItems.grantReadWriteData(cartLambda);

    tables.products.grantReadData(ordersLambda);
    tables.cartItems.grantReadWriteData(ordersLambda);
    tables.orders.grantReadWriteData(ordersLambda);
    tables.orderItems.grantReadWriteData(ordersLambda);

    tables.canaryResults.grantReadWriteData(canaryDemoLambda);

    for (const table of Object.values(tables)) {
      table.grantReadData(adminLambda);
    }
    adminLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:ListTables'],
        resources: ['*'],
      })
    );

    // API Gateway
    this.api = new apigateway.RestApi(this, 'EcSiteApi', {
      restApiName: 'ec-site-poc-api',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    // /products
    const products = this.api.root.addResource('products');
    const productById = products.addResource('{id}');
    const productsInteg = new apigateway.LambdaIntegration(productsLambda);
    products.addMethod('GET', productsInteg);
    products.addMethod('POST', productsInteg);
    productById.addMethod('GET', productsInteg);

    // /cart
    const cart = this.api.root.addResource('cart');
    const cartByProduct = cart.addResource('{product_id}');
    const cartInteg = new apigateway.LambdaIntegration(cartLambda);
    cart.addMethod('GET', cartInteg);
    cart.addMethod('POST', cartInteg);
    cartByProduct.addMethod('DELETE', cartInteg);

    // /orders
    const orders = this.api.root.addResource('orders');
    const orderById = orders.addResource('{id}');
    const ordersInteg = new apigateway.LambdaIntegration(ordersLambda);
    orders.addMethod('GET', ordersInteg);
    orders.addMethod('POST', ordersInteg);
    orderById.addMethod('GET', ordersInteg);

    // /admin/tables
    const admin = this.api.root.addResource('admin');
    const adminTables = admin.addResource('tables');
    const adminTableByName = adminTables.addResource('{name}');
    const adminInteg = new apigateway.LambdaIntegration(adminLambda);
    adminTables.addMethod('GET', adminInteg);
    adminTableByName.addMethod('GET', adminInteg);

    // /canary-demo
    const canaryDemo = this.api.root.addResource('canary-demo');
    const canaryDemoSub = canaryDemo.addResource('{sub}');
    const canaryDemoInteg = new apigateway.LambdaIntegration(canaryDemoLambda);
    canaryDemo.addMethod('GET', canaryDemoInteg);
    canaryDemoSub.addMethod('POST', canaryDemoInteg);

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      exportName: 'ApiUrl',
    });
  }
}
