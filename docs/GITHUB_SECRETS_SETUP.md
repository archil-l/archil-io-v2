# GitHub Secrets Setup Guide

This guide walks you through setting up the required GitHub Secrets for the CI/CD pipeline.

## Required Secrets

Add these secrets to your GitHub repository:

### 1. AWS Role ARNs (from OIDC Stack Deployment)

**`AWS_ROLE_ARN_DEV`**

- Value: Output from `cdk deploy archil-io-v2-github-oidc-dev`
- Format: `arn:aws:iam::111111111111:role/archil-io-v2-github-actions-role-dev`
- Description: OIDC role for dev deployments

**`AWS_ROLE_ARN_PROD`**

- Value: Output from `cdk deploy archil-io-v2-github-oidc-prod`
- Format: `arn:aws:iam::222222222222:role/archil-io-v2-github-actions-role-prod`
- Description: OIDC role for prod deployments

### 2. AWS Account IDs

**`AWS_ACCOUNT_ID_DEV`**

- Value: Your dev AWS account ID (12-digit number)
- Example: `111111111111`

**`AWS_ACCOUNT_ID_PROD`**

- Value: Your prod AWS account ID (12-digit number)
- Example: `222222222222`

### 3. AWS Region

**`AWS_REGION`**

- Value: Your AWS region
- Example: `us-east-1`
- Note: Must be the same region in both accounts

### 4. API Keys

**`ANTHROPIC_API_KEY`**

- Value: Your Anthropic API key
- Get it from: https://console.anthropic.com/

### 5. Optional: Slack Notifications

**`SLACK_WEBHOOK`** (optional)

- Value: Your Slack webhook URL for deployment notifications
- Get it from: https://api.slack.com/messaging/webhooks

## How to Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** in the top navigation
3. Click **Secrets and variables** → **Actions** in the left sidebar
4. Click **New repository secret**
5. Enter secret name and value
6. Click **Add secret**

Repeat for each secret above.

## Verification Checklist

After adding all secrets, verify:

- [ ] `AWS_ROLE_ARN_DEV` is set
- [ ] `AWS_ROLE_ARN_PROD` is set
- [ ] `AWS_ACCOUNT_ID_DEV` is set
- [ ] `AWS_ACCOUNT_ID_PROD` is set
- [ ] `AWS_REGION` is set
- [ ] `ANTHROPIC_API_KEY` is set
- [ ] (Optional) `SLACK_WEBHOOK` is set if using Slack notifications

## Retrieving Secrets (if you lost them)

### Get OIDC Role ARNs

```bash
# Dev
aws iam get-role --role-name archil-io-v2-github-actions-role-dev --profile archil-dev --query 'Role.Arn' --output text

# Prod
aws iam get-role --role-name archil-io-v2-github-actions-role-prod --profile archil-prod --query 'Role.Arn' --output text
```

### Get AWS Account ID

```bash
# Dev
aws sts get-caller-identity --profile archil-dev --query 'Account' --output text

# Prod
aws sts get-caller-identity --profile archil-prod --query 'Account' --output text
```

## Testing Secrets

Once secrets are configured, the workflows will use them automatically:

1. Create a test branch: `git checkout -b test-secrets`
2. Make a small change: `echo "test" >> README.md`
3. Push and create a PR: `git push origin test-secrets`
4. Go to **Actions** tab and watch the CI workflow
5. If CI passes, merge the PR
6. Watch the deploy workflow run

## Security Notes

- ✅ Secrets are encrypted and never logged
- ✅ Each workflow run gets a short-lived OIDC token
- ✅ Tokens expire after workflow completes
- ✅ No long-lived credentials stored in GitHub
- ✅ Can rotate any secret independently

## Troubleshooting

### "Secret not found" Error

Solution:

1. Verify secret name matches exactly (case-sensitive)
2. Verify secret value is not empty
3. Wait 30 seconds for secret to propagate
4. Try triggering workflow again

### "Access Denied" in AWS

Solution:

1. Verify role ARN is correct
2. Verify AWS account ID matches
3. Re-check OIDC trust policy in AWS
4. Verify GitHub repository name in trust policy matches

### Slack Notifications Not Working

Solution:

1. Verify `SLACK_WEBHOOK` secret is set
2. Test webhook URL manually: `curl -X POST -H 'Content-type: application/json' --data '{"text":"test"}' $SLACK_WEBHOOK`
3. If error, regenerate webhook URL from Slack
4. Note: Notifications only trigger on deployment (not CI) workflows
