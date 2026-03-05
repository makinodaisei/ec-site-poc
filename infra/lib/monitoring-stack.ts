import * as cdk from 'aws-cdk-lib/core';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import * as path from 'path';

interface MonitoringStackProps extends cdk.StackProps {
  canaryResultsTable: dynamodb.Table;
  apiUrl: string;
  alertEmail: string;
}

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const { canaryResultsTable, apiUrl, alertEmail } = props;

    // SNS topic for alerts
    const alertTopic = new sns.Topic(this, 'CanaryAlertTopic', {
      topicName: 'ec-site-canary-alerts',
    });
    alertTopic.addSubscription(new snsSubscriptions.EmailSubscription(alertEmail));

    // Canary Lambda
    const canaryLambda = new lambdaNodejs.NodejsFunction(this, 'CanaryFunction', {
      entry: path.join(__dirname, '../src/handlers/canary.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(30),
      environment: {
        CANARY_RESULTS_TABLE: canaryResultsTable.tableName,
        API_BASE_URL: apiUrl.replace(/\/$/, ''),
        SNS_TOPIC_ARN: alertTopic.topicArn,
      },
      bundling: {
        externalModules: ['@aws-sdk/*'],
      },
    });

    canaryResultsTable.grantReadWriteData(canaryLambda);
    alertTopic.grantPublish(canaryLambda);

    // EventBridge rule: every 5 minutes
    new events.Rule(this, 'CanarySchedule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
      targets: [new targets.LambdaFunction(canaryLambda)],
    });
  }
}
