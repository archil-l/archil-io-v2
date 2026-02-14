# CI/CD Implementation Guide - archil-io-v2

Complete step-by-step guide for setting up GitHub Actions CI/CD with multi-account AWS deployment (dev & prod).

## Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Prerequisites](#prerequisites)
3. [Phase 1: OIDC & IAM Setup](#phase-1-oidc--iam-setup-via-cdk)
4. [Phase 2: GitHub Secrets Configuration](#phase-2-github-secrets-configuration)
5. [Phase 3: Deploy Application Stacks](#phase-3-deploy-application-stacks)
6. [Phase 4: Verify GitHub Actions](#phase-4-verify-github-actions)
7. [Cost Breakdown](#cost-breakdown)
8. [Troubleshooting](#troubleshooting)
9. [Security Best Practices](#security-best-practices)

---

## Overview & Architecture

### System Architecture

```
GitHub Repository
    ↓
GitHub Actions CI (All branches)
    ├─ Lint & Type Check
    ├─ Build Application
    └─ Push to dev/prod based on branch

    ↓ (develop branch)
    ↓ OIDC Token
    ↓ Assume AWS Role (Dev Account)
    ↓
Dev AWS Account
    ├─ Lambda (archil-io-v2-dev-web-app)
    ├─ API Gateway
    ├─ S3 (archil-io-v2-dev-assets-bucket)
    └─ CloudFront Distribution

    ↓ (main branch)
    ↓ OIDC Token
    ↓ Assume AWS Role (Prod Account)
    ↓
Prod AWS Account
    ├─ Lambda (archil-io-v2-prod-web-app)
    ├─ API Gateway
    ├─ S3 (archil-io-v2-prod-assets-bucket)
    └─ CloudFront Distribution
```

### Why OIDC?

- **No Long-Lived Credentials**: GitHub generates short-lived tokens per workflow run
- **Automatic Rotation**: No need to manage access key secrets
- **Fine-Grained Control**: Can limit what each repository can do
- **AWS Best Practice**: Recommended over IAM access keys for CI/CD

### Environment Separation

| Aspect               | Dev                       | Prod                        |
| -------------------- | ------------------------- | --------------------------- |
| **Git Branch**       | `develop`                 | `main`                      |
| **AWS Account**      | Dev Account               | Prod Account                |
| **Stack Names**      | `archil-io-v2-dev`        | `archil-io-v2-prod`         |
| **Lambda Memory**    | 512 MB                    | 1024 MB                     |
| **CloudFront Cache** | 5 min (HTML), 1h (assets) | 1h (HTML), 30 days (assets) |
| **Cost/Month**       | ~$15-25                   | ~$25-50                     |
| **Auto-Deploy**      | Yes (from develop)        | Yes (from main)             |

---

## Prerequisites

### On Your Machine

- **Node.js**: >= 24.0.0
- **AWS CLI**: Latest version
- **AWS CDK**: Installed globally or via npm
  ```bash
  npm install -g aws-cdk
  ```

### AWS Account Setup

1. **Dev Account**:
   - Access to AWS console
   - Permissions to create IAM roles, CloudFormation stacks
   - Account ID (format: 123456789012)

2. **Prod Account**:
   - Same as Dev
   - Separate AWS account for production isolation

3. **GitHub Repository**:
   - This repository
   - Admin access to settings (to add secrets)

### Configure AWS CLI

For each AWS account, you need to configure a local profile with credentials. This allows your machine to deploy CDK stacks to AWS.

#### Step 1: Get AWS Credentials

**Access Key ID & Secret Access Key** come from AWS IAM:

1. Log in to [AWS Management Console](https://console.aws.amazon.com)
2. Navigate to **IAM** (Identity and Access Management)
3. Click **Users** in the left sidebar
4. Select your AWS user (or create one if you don't have one)
5. Go to the **Security credentials** tab
6. Under "Access keys" section, click **Create access key**
7. Choose **Command Line Interface (CLI)** as the use case
8. Click **Next** and then **Create access key**
9. You'll see:
   - **Access Key ID**: Copy this value
   - **Secret Access Key**: Copy this value immediately (you won't see it again!)
10. Click **Done** and save both values securely

**⚠️ Security Warning**: Treat the Secret Access Key like a password. Never commit it to git. These are temporary credentials only used for CDK deployments.

#### Step 2: Choose an AWS Region

A region is a geographic location where AWS resources run. Common options:

- `us-east-1` (N. Virginia) - Default, good for most use cases
- `us-west-2` (Oregon)
- `eu-west-1` (Ireland)
- `ap-northeast-1` (Tokyo)

**Recommendation**: Use `us-east-1` for this project.

See all regions: https://docs.aws.amazon.com/general/latest/gr/aws-service-regions.html

#### Step 3: Configure AWS Profiles

Run these commands for each account:

```bash
# Dev account
aws configure --profile archil-dev

# Prod account
aws configure --profile archil-prod
```

When prompted, enter:

- **AWS Access Key ID**: Paste the Access Key ID from Step 1
- **AWS Secret Access Key**: Paste the Secret Access Key from Step 1
- **Default region name**: `us-east-1` (or your chosen region)
- **Default output format**: `json`

#### Step 4: Verify Configuration

Test each profile:

```bash
# Test dev profile
aws sts get-caller-identity --profile archil-dev

# Test prod profile
aws sts get-caller-identity --profile archil-prod
```

You should see output with your AWS Account ID and User ARN. If you get an error, check that your credentials are entered correctly.

#### Step 5: Clean Up Credentials (Optional but Recommended)

After you've successfully deployed the OIDC stacks and verified that GitHub Actions can deploy using OIDC tokens, you can delete these access keys from AWS IAM for security:

```bash
# Delete the access key from AWS console:
# IAM → Users → Your User → Security credentials → Delete Access Key
```

**Important Note**: These temporary access keys are **only needed for the initial CDK deployments** (Phase 1). After the OIDC provider is set up, GitHub Actions will use OIDC tokens instead, and these keys can be deleted.

---

## Phase 1: OIDC & IAM Setup (via CDK)

This phase creates the OIDC provider and IAM role that GitHub Actions will use. It's automated via CDK.

### Step 1.1: Deploy OIDC Stack to Dev Account

```bash
# Set your AWS profile for dev
export AWS_PROFILE=archil-dev

# Navigate to project root
cd /Users/achiko/Projects/personal/archil-io-v2

# Install dependencies (if not already done)
npm install

# Deploy the OIDC stack to dev account
npx cdk deploy archil-io-v2-github-oidc-dev \
  --context environment=dev \
  --require-approval never

# When prompted, type 'y' to confirm
```

**Expected Output**:

```
✓ archil-io-v2-github-oidc-dev: deployment successful
Outputs:
archil-io-v2-github-oidc-dev.GitHubActionsRoleArn =
arn:aws:iam::111111111111:role/archil-io-v2-github-actions-role-dev
```

**Save this ARN** - you'll need it for GitHub Secrets.

### Step 1.2: Deploy OIDC Stack to Prod Account

```bash
# Switch to prod AWS profile
export AWS_PROFILE=archil-prod

# Deploy the OIDC stack to prod account
npx cdk deploy archil-io-v2-github-oidc-prod \
  --context environment=prod \
  --require-approval never

# When prompted, type 'y' to confirm
```

**Expected Output**:

```
✓ archil-io-v2-github-oidc-prod: deployment successful
Outputs:
archil-io-v2-github-oidc-prod.GitHubActionsRoleArn =
arn:aws:iam::222222222222:role/archil-io-v2-github-actions-role-prod
```

**Save this ARN too** - you'll need it next.

### What Got Created?

In each AWS account, the CDK created:

1. **OIDC Identity Provider**
   - Provider URL: `https://token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`
   - Allows GitHub Actions to request temporary credentials

2. **IAM Role**: `archil-io-v2-github-actions-role-{dev|prod}`
   - Trust relationship with GitHub OIDC provider
   - Filtered to your repository only
   - Permissions for CloudFormation, Lambda, S3, CloudFront, CloudWatch

3. **IAM Policies** (attached to the role):
   - CloudFormation full access (needed for CDK deployments)
   - Lambda, S3, CloudFront, CloudWatch permissions
   - Least privilege approach (not admin)

---

## Phase 2: GitHub Secrets Configuration

GitHub Secrets are encrypted environment variables accessible to GitHub Actions workflows.

### Step 2.1: Get Your Role ARNs

From Step 1, you should have two ARNs:

- **Dev ARN**: `arn:aws:iam::111111111111:role/archil-io-v2-github-actions-role-dev`
- **Prod ARN**: `arn:aws:iam::222222222222:role/archil-io-v2-github-actions-role-prod`

If you lost them, run:

```bash
# For dev
aws iam get-role --role-name archil-io-v2-github-actions-role-dev --profile archil-dev

# For prod
aws iam get-role --role-name archil-io-v2-github-actions-role-prod --profile archil-prod
```

### Step 2.2: Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

**Add these secrets:**

| Secret Name         | Value                        | Description                  |
| ------------------- | ---------------------------- | ---------------------------- |
| `AWS_ROLE_ARN_DEV`  | Your dev ARN from above      | Role for dev deployments     |
| `AWS_ROLE_ARN_PROD` | Your prod ARN from above     | Role for prod deployments    |
| `AWS_REGION`        | `us-east-1` (or your region) | AWS region for both accounts |
| `ANTHROPIC_API_KEY` | Your Anthropic API key       | For the AI agent             |

### Step 2.3: Verify Secrets

- Go back to **Settings** → **Secrets and variables** → **Actions**
- You should see all 4 secrets listed (values hidden)
- ✅ If all present, you're ready for the next phase

---

## Phase 3: Deploy Application Stacks

Now deploy your actual application to dev and prod AWS accounts.

### Step 3.1: Deploy to Dev Account

```bash
# Set dev profile
export AWS_PROFILE=archil-dev

# Deploy the application stack
npx cdk deploy archil-io-v2-dev \
  --context environment=dev \
  --require-approval never
```

**Expected Output**:

```
✓ archil-io-v2-dev: deployment successful

Outputs:
archil-io-v2-dev.RemixFunctionApi = https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com
archil-io-v2-dev.RemixCloudFrontUrl = https://d123abc456.cloudfront.net
archil-io-v2-dev.RemixFunctionArn = arn:aws:lambda:us-east-1:111111111111:function:archil-io-v2-dev-web-app
```

**Save these URLs** - test them locally.

### Step 3.2: Deploy to Prod Account

```bash
# Set prod profile
export AWS_PROFILE=archil-prod

# Deploy the application stack
npx cdk deploy archil-io-v2-prod \
  --context environment=prod \
  --require-approval never
```

**Expected Output**:

```
✓ archil-io-v2-prod: deployment successful

Outputs:
archil-io-v2-prod.RemixFunctionApi = https://yyyyyyyyyy.execute-api.us-east-1.amazonaws.com
archil-io-v2-prod.CloudFrontUrl = https://d789xyz123.cloudfront.net
archil-io-v2-prod.RemixFunctionArn = arn:aws:lambda:us-east-1:222222222222:function:archil-io-v2-prod-web-app
```

### Step 3.3: Test the Deployments

Test the Lambda API endpoint:

```bash
# For dev
curl -X GET https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/ \
  -H "User-Agent: PostmanRuntime/7.32.3"

# You should see your homepage HTML response
```

Test CloudFront:

```bash
# For dev
curl -I https://d123abc456.cloudfront.net/

# Check response headers - should be 200 OK
```

---

## Phase 4: Verify GitHub Actions

### Step 4.1: Trigger CI Workflow

1. Create a new feature branch:

   ```bash
   git checkout -b feature/test-ci
   ```

2. Make a small change (e.g., update README):

   ```bash
   echo "# CI/CD configured ✅" >> README.md
   git add README.md
   git commit -m "test: verify CI workflow"
   git push origin feature/test-ci
   ```

3. Open a Pull Request on GitHub

4. Go to **Actions** tab and watch the workflow run:
   - Should run linting, type-check, and build
   - Should complete in ~2-3 minutes
   - ✅ Should all pass (green checkmarks)

### Step 4.2: Merge and Trigger Deploy (Prod)

1. Merge the PR to `main`:

   ```bash
   git checkout main
   git pull origin main
   ```

2. Go to **Actions** tab and watch `deploy-prod.yml` run:
   - Should complete in ~3-5 minutes
   - Should output new Lambda function ARN and CloudFront URL
   - ✅ Should see "Deployment successful"

### Step 4.3: Test Dev Deployment

1. Create another feature branch and push to `develop`:

   ```bash
   git checkout develop
   git checkout -b feature/test-dev-deploy
   echo "# Dev deployment test" >> README.md
   git add README.md
   git commit -m "test: verify dev deployment"
   git push origin feature/test-dev-deploy
   ```

2. Create a PR to `develop`

3. Merge the PR

4. Go to **Actions** tab and watch `deploy-dev.yml` run:
   - Should deploy to dev AWS account
   - Should complete successfully
   - ✅ Dev environment updated

---

## Cost Breakdown

### Monthly Cost Estimates

#### Dev Environment

- **Lambda**: ~$8 (512MB, 100 requests/day)
- **S3**: ~$2 (storage + requests)
- **CloudFront**: ~$3 (data transfer)
- **Other** (CloudWatch, API Gateway): ~$2
- **Total**: ~$15-25/month

#### Prod Environment

- **Lambda**: ~$15 (1024MB, 1000 requests/day)
- **S3**: ~$3 (storage + requests)
- **CloudFront**: ~$8 (data transfer)
- **Other** (CloudWatch, API Gateway): ~$4
- **Total**: ~$30-50/month

**Grand Total**: ~$45-75/month for both environments

### Cost Optimization Features

✅ **Lambda**:

- 512MB dev (vs 1024MB prod) - 50% cheaper
- Timeout: 30 seconds (appropriate for your use case)
- No reserved concurrency (on-demand pricing)

✅ **CloudFront**:

- Compression enabled (reduces data transfer)
- Short TTL for HTML in dev (faster updates)
- Long TTL for assets (reduced origin requests)

✅ **S3**:

- Lifecycle policies: Auto-delete old versions
- Versioning enabled (for rollback, cost-effective)
- Intelligent-Tiering (automatic cost optimization)

✅ **CloudWatch**:

- 7-day log retention in dev
- 30-day log retention in prod
- Only essential metrics logged

---

## Troubleshooting

### Common Issues & Solutions

#### ❌ "Error: OIDC provider not found"

**Cause**: OIDC stack wasn't deployed successfully

**Solution**:

```bash
# Re-deploy OIDC stack with verbose output
npx cdk deploy archil-io-v2-github-oidc-dev \
  --context environment=dev \
  --require-approval never \
  --verbose
```

#### ❌ "Error: Role assumes failed - not authorized"

**Cause**: GitHub Secrets not configured correctly

**Solution**:

1. Go to GitHub **Settings** → **Secrets and variables** → **Actions**
2. Verify `AWS_ROLE_ARN_DEV` and `AWS_ROLE_ARN_PROD` are correct
3. Verify `AWS_REGION` is set
4. Check that Role ARNs match output from CDK deployment

#### ❌ "Lambda handler error - ANTHROPIC_API_KEY not found"

**Cause**: Secret not added to GitHub

**Solution**:

```bash
# Add ANTHROPIC_API_KEY to GitHub Secrets
# Go to Settings → Secrets and variables → Actions → New secret
```

#### ❌ "CloudFormation stack creation failed"

**Cause**: Usually insufficient permissions or resource conflicts

**Solution**:

```bash
# Check CloudFormation events for detailed error
aws cloudformation describe-stack-events \
  --stack-name archil-io-v2-dev \
  --profile archil-dev \
  --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`]'
```

#### ❌ "S3 bucket name already exists"

**Cause**: S3 bucket names are globally unique; another account may have claimed it

**Solution**:

- CDK automatically creates unique names; if this fails, check CloudFormation for the actual bucket name
- Or update the CDK stack to use a more unique name

---

## Security Best Practices

### 1. OIDC Security

- ✅ **No Long-Lived Credentials**: Tokens expire after workflow completes
- ✅ **Repository-Specific**: Role only usable from your repository
- ✅ **Time-Limited**: Each token valid for ~5 minutes

### 2. IAM Role Permissions

The `archil-io-v2-github-actions-role` has **least-privilege** permissions:

```json
{
  "CloudFormation": "Full access (needed to deploy CDK stacks)",
  "Lambda": "Create, update, delete functions",
  "S3": "Create, list, put objects",
  "CloudFront": "Invalidate distributions",
  "CloudWatch": "Create log groups, put logs",
  "IAM": "Pass role to Lambda (limited to this service role)"
}
```

### 3. Secrets Security

- ✅ GitHub encrypts all secrets at rest
- ✅ Only exposed as environment variables during workflow execution
- ✅ Never logged or displayed
- ✅ Can be rotated independently

### 4. AWS Account Isolation

- ✅ **Dev account** isolated from Prod
- ✅ Different IAM roles per environment
- ✅ Different Lambda functions, S3 buckets, CloudFront distributions
- ✅ Cross-account access requires explicit trust (not configured)

### 5. Network Security

- ✅ CloudFront enforces HTTPS
- ✅ S3 blocks public access by default
- ✅ Lambda only accessible via API Gateway
- ✅ No direct database access configured

---

## Next Steps

1. ✅ Complete all phases above
2. ✅ Test CI/CD pipeline with test commits
3. Monitor CloudWatch logs for any errors
4. Set up CloudWatch alarms for Lambda errors (optional)
5. Document your infrastructure in README

---

## Useful Commands Reference

```bash
# View deployed stacks
aws cloudformation list-stacks --profile archil-dev

# View Lambda logs
aws logs tail /aws/lambda/archil-io-v2-dev-web-app \
  --profile archil-dev --follow

# View CloudFront distribution info
aws cloudfront list-distributions --profile archil-dev

# Rollback to previous version (if deployment fails)
aws cloudformation cancel-update-stack \
  --stack-name archil-io-v2-dev \
  --profile archil-dev

# Delete entire stack (caution!)
npx cdk destroy archil-io-v2-dev --context environment=dev --profile archil-dev
```

---

## Support & Questions

- **CDK Documentation**: https://docs.aws.amazon.com/cdk/latest/guide/
- **GitHub Actions OIDC**: https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect
- **Troubleshooting**: See "Troubleshooting" section above
