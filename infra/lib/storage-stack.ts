import * as cdk from 'aws-cdk-lib/core';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class StorageStack extends cdk.Stack {
  public readonly frontendBucket: s3.Bucket;
  public readonly assetsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Frontend static hosting (HTTP ok, no CloudFront per constraints)
    // Public read is enabled at deploy time via aws s3api put-bucket-policy (Phase 3)
    // because account-level S3 Block Public Access must be disabled per-bucket first
    this.frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Assets bucket: product images, tmp-uploads, receipts, logs
    this.assetsBucket = new s3.Bucket(this, 'AssetsBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          id: 'DeleteTmpUploads',
          prefix: 'tmp-uploads/',
          expiration: cdk.Duration.days(7),
          enabled: true,
        },
        {
          id: 'GlacierReceipts',
          prefix: 'orders/receipts/',
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER_INSTANT_RETRIEVAL,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
          enabled: true,
        },
        {
          id: 'DeleteLogs',
          prefix: 'logs/',
          expiration: cdk.Duration.days(90),
          enabled: true,
        },
      ],
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: this.frontendBucket.bucketName,
      exportName: 'FrontendBucketName',
    });
    new cdk.CfnOutput(this, 'FrontendWebsiteUrl', {
      value: this.frontendBucket.bucketWebsiteUrl,
      exportName: 'FrontendWebsiteUrl',
    });
    new cdk.CfnOutput(this, 'AssetsBucketName', {
      value: this.assetsBucket.bucketName,
      exportName: 'AssetsBucketName',
    });
  }
}
