# EC Site PoC

## AWS
- Profile: ec-site-poc (`AWS_PROFILE=ec-site-poc` を全コマンドで使うこと)
- Region: ap-northeast-1
- Account: (デプロイ後に確認)

## 禁止事項
- NAT Gateway 作成禁止
- CloudFront 作成禁止
- RDS / Aurora 作成禁止
- OpenSearch 作成禁止
- 月額 $10 を超えるリソース作成禁止

## 開発ルール
- `cdk deploy` の前に必ず `cdk diff` を実行して差分を確認
- Lambda は TypeScript (esbuild でバンドル)
- IaC は CDK (TypeScript)
- フロントは React + TypeScript (Vite)
- ops スクリプトのみ Python 可
- DynamoDB はフラットな正規化テーブル設計（Map/List ネスト禁止）

## 要件書
docs/requirements.md を参照

## 実行順序
1. Infra (CDK: VPC + DynamoDB + S3 + Budgets)
2. API (Lambda + repositories + API Gateway + admin)
3. Frontend (React: shop + DB viewer + canary status)
4. Seed data
5. CI/CD (GitHub Actions)
6. Monitoring (Canary Lambda + EventBridge + SNS)
7. Docs

各フェーズを自分で計画して実行すること。判断が必要な場合のみ人間に聞くこと。
