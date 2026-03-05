import * as cdk from 'aws-cdk-lib/core';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
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
  assetsBucketName: string;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { tables } = props;
    const srcDir = path.join(__dirname, '../src');

    // Import assets bucket by name (avoids circular stack dependency)
    const assetsBucket = s3.Bucket.fromBucketName(this, 'AssetsBucket', props.assetsBucketName);

    const commonEnv = {
      PRODUCTS_TABLE: tables.products.tableName,
      USERS_TABLE: tables.users.tableName,
      ORDERS_TABLE: tables.orders.tableName,
      ORDER_ITEMS_TABLE: tables.orderItems.tableName,
      CART_ITEMS_TABLE: tables.cartItems.tableName,
      CANARY_RESULTS_TABLE: tables.canaryResults.tableName,
      ASSETS_BUCKET: props.assetsBucketName,
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

    // Thumbnail Lambda — triggered by S3 on tmp-uploads/products/*
    const thumbnailLambda = new lambdaNodejs.NodejsFunction(this, 'ThumbnailFunction', {
      entry: path.join(srcDir, 'handlers/thumbnail.ts'),
      handler: 'handler',
      runtime,
      environment: commonEnv,
      bundling,
      timeout: cdk.Duration.seconds(30),
    });

    // DynamoDB permissions
    tables.products.grantReadWriteData(productsLambda);

    tables.cartItems.grantReadWriteData(cartLambda);

    tables.products.grantReadWriteData(ordersLambda);
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

    tables.products.grantWriteData(thumbnailLambda);

    // S3 permissions
    // Products Lambda: generate presigned PUT (for upload-url) + sign GET (for image display)
    productsLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['s3:PutObject'],
        resources: [`arn:aws:s3:::${props.assetsBucketName}/tmp-uploads/products/*`],
      })
    );
    productsLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [`arn:aws:s3:::${props.assetsBucketName}/products/images/*`],
      })
    );

    // Thumbnail Lambda: read tmp-uploads, write products/images
    thumbnailLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [`arn:aws:s3:::${props.assetsBucketName}/tmp-uploads/*`],
      })
    );
    thumbnailLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['s3:PutObject'],
        resources: [`arn:aws:s3:::${props.assetsBucketName}/products/images/*`],
      })
    );

    // S3 event notification: tmp-uploads/products/* → thumbnailLambda
    assetsBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(thumbnailLambda),
      { prefix: 'tmp-uploads/products/' }
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
    const productUploadUrl = productById.addResource('upload-url');
    const productsInteg = new apigateway.LambdaIntegration(productsLambda);
    products.addMethod('GET', productsInteg);
    products.addMethod('POST', productsInteg);
    productById.addMethod('GET', productsInteg);
    productUploadUrl.addMethod('POST', productsInteg);

    // /cart
    const cart = this.api.root.addResource('cart');
    const cartByProduct = cart.addResource('{product_id}');
    const cartInteg = new apigateway.LambdaIntegration(cartLambda);
    cart.addMethod('GET', cartInteg);
    cart.addMethod('POST', cartInteg);
    cartByProduct.addMethod('DELETE', cartInteg);
    cartByProduct.addMethod('PUT', cartInteg);

    // /orders
    const orders = this.api.root.addResource('orders');
    const orderById = orders.addResource('{id}');
    const ordersInteg = new apigateway.LambdaIntegration(ordersLambda);
    orders.addMethod('GET', ordersInteg);
    orders.addMethod('POST', ordersInteg);
    orderById.addMethod('GET', ordersInteg);
    orderById.addMethod('PATCH', ordersInteg);

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
