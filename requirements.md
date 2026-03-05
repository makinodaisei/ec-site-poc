# EC Site PoC v2 - Requirements for Claude Code

## Goal

Prove that generative AI (Claude Code) can build and operate a full-stack serverless application — infrastructure, backend, frontend, CI/CD, monitoring, and documentation — with minimal human intervention.

This is a PoC. Ship the simplest thing that works end-to-end. Features are added later by giving CC additional tasks, which itself demonstrates ongoing AI operability.

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Lambda | TypeScript (esbuild) | Type safety → CC generates/modifies with fewer bugs |
| IaC | CDK (TypeScript) | Same language as app, CC changes infra and app in one pass |
| Frontend | React + TypeScript (Vite) | Same language top to bottom |
| Ops Scripts | Python | boto3 direct, one-shot tasks |
| CI/CD | GitHub Actions | Standard |

## Constraints

- AWS monthly cost: under $10
- DynamoDB for all data (free tier: 25GB, 25WCU/25RCU)
- No NAT Gateway, no CloudFront (S3 static hosting, HTTP ok)
- CI/CD via GitHub Actions
- Human only does: IAM user setup, ~/.aws/credentials, GitHub secrets, browser acceptance testing

## AWS Resources

- VPC (2 public subnets, S3 gateway endpoint)
- DynamoDB (5 tables, on-demand or provisioned within free tier)
- S3 (static hosting + assets + receipts + logs)
- API Gateway (REST)
- Lambda (product/cart/order handlers + canary + admin)
- EventBridge (canary schedule, 5min interval)
- SNS (alert topic, email subscription)
- AWS Budgets ($10 threshold alert)

## S3 Lifecycle Policies

| Prefix | Rule |
|---|---|
| `tmp-uploads/*` | Delete after 7 days |
| `orders/receipts/*` | Glacier Instant Retrieval after 30 days |
| `logs/*` | Delete after 90 days |

## DynamoDB Table Design

Normalized tables (RDB-like). No single-table design. Flat 2D — no nested Map or List.

### products
PK: product_id — name, description, price, category, image_url, stock, created_at, updated_at

### users
PK: user_id, GSI: email — name, password_hash, created_at

### orders
PK: order_id, GSI: user_id — status (pending/paid/shipped/cancelled), total_amount, shipping_address, created_at

### order_items
PK: order_id, SK: product_id — quantity, unit_price, subtotal

### cart_items
PK: user_id, SK: product_id — quantity, added_at

Password hash: Node.js `crypto` (SHA-256 + salt). No external libraries.

## API Endpoints

```
GET    /products              List all
GET    /products/{id}         Get by ID
POST   /products              Create

GET    /cart?user_id=         Get cart
POST   /cart                  Add to cart
DELETE /cart/{product_id}?user_id=  Remove from cart

POST   /orders                Create order from cart
GET    /orders/{id}           Get order with items
GET    /orders?user_id=       List user's orders

GET    /admin/tables          List table names
GET    /admin/tables/{name}   Scan table (raw data)
```

Error format: `{"error": "message", "code": 400}`

No auth for now. user_id passed as query param.

## Code Architecture

```
src/
  handlers/       # Lambda entry points: parse event → call repository → return response
  repositories/   # DynamoDB data access
  shared/
    types.ts      # Domain types
    response.ts   # Standardized JSON response builder
    db.ts         # DynamoDB DocumentClient singleton
    config.ts     # Env-based config (table names, bucket names)
```

Keep it flat. No service layer, no provider abstractions, no interfaces — add those when a real need appears. Two layers (handler → repository) is enough for a PoC.

## CDK Structure

```
infra/
  bin/app.ts
  lib/
    network-stack.ts      # VPC, subnets, S3 endpoint
    database-stack.ts     # DynamoDB tables
    storage-stack.ts      # S3 buckets, lifecycle policies
    api-stack.ts          # API Gateway + Lambda
    monitoring-stack.ts   # EventBridge + canary Lambda + SNS
    budget-stack.ts       # AWS Budgets
```

## CI/CD

- PR to main: lint (eslint) + tsc + jest + cdk diff
- Merge to main: cdk deploy

## Canary

Lambda triggered every 5min by EventBridge. Hits API endpoints, checks for 2xx. On failure → SNS. Uses Node.js native `https` (no deps). Results stored in DynamoDB `canary_results` table (PK: check_id, timestamp, status, endpoint, response_time_ms, details).

## Frontend

React + TypeScript + Vite → S3 static hosting.

- **Shop** (`/`): Browse products, add to cart, place order. Minimal purchase flow.
- **Admin: DB Viewer** (`/admin/tables`): Dropdown → select table → render as HTML table. No sort/filter.
- **Admin: Canary Status** (`/admin/canary`): Latest result. Green = healthy, red = unhealthy.

Functional over pretty. useState + fetch. No state management library.

## Seed Data

`scripts/seed.ts` — calls API endpoints to populate:
- 5+ products (realistic names/prices)
- 2 test users
- 1 sample order with items

Doubles as integration test.

## Documentation

- `docs/functional-spec.md`
- `docs/api-spec.md` (with request/response examples)
- `docs/canary.md` (what it is, how it works, architecture in Mermaid)
- Convert to Excel: `scripts/gen-spec-excel.py` (openpyxl)

## Evidence

Log everything CC does in `evidence/cc-execution-log.md`:

```
## [Phase] Task Name
- Timestamp: YYYY-MM-DD HH:MM
- Action: what was done
- Result: success / failure / partial
- Self-correction: if any, what was fixed and why
- Human intervention: if any, what was needed
```

## Execution Order

1. **Infra** — CDK: VPC + DynamoDB + S3 + Budgets
2. **API** — Lambda handlers + repositories + API Gateway + admin endpoints
3. **Frontend** — React: shop + DB viewer + canary status
4. **Seed data**
5. **CI/CD** — GitHub Actions
6. **Monitoring** — Canary Lambda + EventBridge + SNS
7. **Docs** — Specs + canary doc + Excel

## Future (CC tasks to add later)

These are NOT part of the initial PoC. Each is a separate task to hand to CC after the core is working:

- **Image pipeline**: S3 upload → Lambda thumbnail generation
- **Search**: category filter → OpenSearch or DynamoDB filter expressions
- **Auth**: query param → Cognito or JWT middleware
- **Payment**: mock → Stripe integration
- **Notifications**: SES order confirmation emails
- **Image CDN**: CloudFront in front of S3 product images

When adding these, CC should refactor the architecture as needed (add service layer, interfaces, etc). Don't over-engineer upfront.
