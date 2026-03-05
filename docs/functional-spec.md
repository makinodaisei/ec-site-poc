# EC Site PoC - Functional Specification

## Overview

Serverless EC site PoC on AWS demonstrating end-to-end AI-assisted development.

## Constraints

| Item | Rule |
|------|------|
| NAT Gateway | Prohibited |
| CloudFront | Prohibited |
| RDS / Aurora | Prohibited |
| OpenSearch | Prohibited |
| Monthly cost | $10 or less |

## Architecture

```
Browser
  └─► S3 Static Website (HTTP)
        └─► API Gateway (HTTPS)
              ├─► Lambda: products
              ├─► Lambda: cart
              ├─► Lambda: orders
              └─► Lambda: admin
                    └─► DynamoDB (6 tables)

EventBridge (rate: 5 min)
  └─► Lambda: canary
        ├─► DynamoDB: canary_results
        └─► SNS: alert email
```

## Stacks

| CDK Stack | Resources |
|-----------|-----------|
| EcSiteNetwork | VPC, 2 public subnets, S3 Gateway Endpoint |
| EcSiteDatabase | 6 DynamoDB tables |
| EcSiteStorage | Frontend S3 bucket, Assets S3 bucket |
| EcSiteApi | API Gateway REST, 4 Lambda functions |
| EcSiteBudget | AWS Budgets $10/month alert |
| EcSiteMonitoring | Canary Lambda, EventBridge rule, SNS topic |

## DynamoDB Tables

| Table | PK | SK | Notes |
|-------|----|----|-------|
| products | product_id | - | |
| users | user_id | - | GSI: email-index |
| orders | order_id | - | GSI: user_id-index |
| order_items | order_id | product_id | |
| cart_items | user_id | product_id | |
| canary_results | check_id | - | check_id = timestamp#endpoint |

All tables use PAY_PER_REQUEST billing and RemovalPolicy.DESTROY.

## Frontend Pages

| Path (state) | Description |
|--------------|-------------|
| shop | Product list, cart, place order |
| admin-tables | DynamoDB table browser |
| admin-canary | Canary health status |

## CI/CD

- **PR check** (`pr.yml`): lint, tsc, jest, cdk diff
- **Deploy** (`deploy.yml`): cdk deploy --all, build frontend, upload to S3
