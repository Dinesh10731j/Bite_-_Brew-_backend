# Production CI/CD Blueprint

## Folder Structure

```text
.github/workflows/
  ci.yml
  cd.yml
  security.yml
k8s/
  base/
  overlays/
    dev/
    staging/
    prod/
  secrets.example.yaml
infra/terraform/
  versions.tf
  variables.tf
  main.tf
  eks.tf
  outputs.tf
  environments/
    dev.tfvars.example
    staging.tfvars.example
    prod.tfvars.example
Dockerfile
```

## CI Design

- Trigger: pull requests and pushes to `main` and `develop`.
- Parallel jobs:
  - Lint + Prettier checks
  - Unit tests (Node `20` and `22` matrix)
  - Integration tests
  - Dependency vulnerability scan (`npm audit --audit-level=high`)
- Coverage gate: global threshold enforced by Jest config.
- Build gate: TypeScript build runs only after tests pass.
- Container publish: pushes multi-arch images to ECR on branch pushes.

## CD Design

- Environment flow:
  - `develop` -> auto deploy to `development`
  - `main` -> auto deploy to `staging`
  - `production` -> manual `workflow_dispatch` with image tag + GitHub Environment approval
- Strategy: Kubernetes rolling deployment (`maxUnavailable: 0`).
- Zero downtime: readiness/liveness/startup probes + rollout status checks.
- Rollback: `kubectl rollout undo` on production failure and revision history retention.

## Security Controls

- CodeQL workflow (`security.yml`) on PR/push + weekly schedule.
- Dependency scan in CI (`npm audit`).
- Immutable image tags in ECR.
- OIDC role for GitHub Actions (no static AWS keys).
- Branch protection (configure in GitHub):
  - Require PR for `main`
  - Require status checks: `lint`, `unit-tests`, `integration-tests`, `coverage-and-build`, `dependency-audit`
  - Require conversation resolution
  - Restrict force pushes/deletions

## Monitoring and Logging

- App endpoints:
  - `/metrics` (Prometheus scrape target)
  - `/livez` (liveness)
  - `/readyz` (readiness)
  - `/api/v1/bite-brew/health` (service health)
- Kubernetes annotations included for Prometheus scraping.
- Logs are stdout/stderr friendly for centralized aggregation (e.g., CloudWatch/ELK/Loki).

## Required GitHub Secrets

- `AWS_REGION`
- `ECR_REGISTRY` (example: `123456789012.dkr.ecr.us-east-1.amazonaws.com`)
- `ECR_REPOSITORY` (example: `bite-brew-cafe-backend`)
- `AWS_GITHUB_ACTIONS_ROLE_ARN`
- `EKS_CLUSTER_NAME`
- `SLACK_WEBHOOK_URL` (optional)

## Setup Steps

1. Install new dependencies:
   - `npm install`
2. Provision cloud resources:
   - `cd infra/terraform`
   - `terraform init`
   - `terraform plan -var-file=environments/dev.tfvars`
   - `terraform apply -var-file=environments/dev.tfvars`
3. Create Kubernetes secret per namespace from `k8s/secrets.example.yaml`.
4. Update ingress hosts in overlays to real domains.
5. Configure GitHub Environments:
   - `development`
   - `staging`
   - `production` (add required reviewers)
6. Enable branch protection rules on `main`.
7. Push to `develop` and verify full CI + auto deploy.

## Scaling Recommendations

- Move secrets to AWS Secrets Manager + External Secrets Operator.
- Add canary/blue-green rollout with Argo Rollouts for progressive delivery.
- Add synthetic checks and SLO-based alerts.
- Add load tests in CI for release candidates.
