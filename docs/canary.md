# EC Site PoC - Canary Monitoring

## Overview

A Lambda-based canary runs every 5 minutes via EventBridge to verify API endpoint health. Results are stored in DynamoDB and failures trigger SNS email alerts.

## Resources (EcSiteMonitoring stack)

| Resource | Details |
|----------|---------|
| Lambda | `CanaryFunction` — Node.js 20.x |
| EventBridge Rule | `rate(5 minutes)` |
| SNS Topic | `ec-site-canary-alerts` |
| SNS Subscription | makinodaisei6345@gmail.com |
| DynamoDB Table | `canary_results` |

## Checked Endpoints

| Endpoint | Expected |
|----------|---------|
| GET /products | 2xx |
| GET /cart?user_id=canary-probe | 2xx |

## canary_results Schema

| Attribute | Type | Notes |
|-----------|------|-------|
| check_id | String (PK) | `{timestamp}#{endpoint}` |
| timestamp | String | ISO 8601 |
| endpoint | String | e.g. `/products` |
| status | String | `ok` or `error` |
| status_code | Number | HTTP status code |
| response_time_ms | Number | Latency in ms |
| error | String | Error message (only on failure) |

## Alert Behavior

- If **any** endpoint returns non-2xx or times out, an SNS message is published.
- Subject: `[EC Site Canary] ALERT: endpoint failure detected`
- Body: JSON with `timestamp` and array of failed endpoint results.

## Frontend (AdminCanary page)

The frontend fetches the latest entry from `canary_results` via the admin API and displays:
- Green badge: all checks passed
- Red badge: failure detected, with error details
