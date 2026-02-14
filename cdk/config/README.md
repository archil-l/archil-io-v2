# CDK Environment Configuration

This directory contains environment-specific configurations for CDK deployments.

## Overview

The `environments.ts` file defines per-environment settings for AWS account IDs, regions, and other deployment parameters. This allows the CDK stacks to be configured consistently without hardcoding values throughout the codebase.

## Configuration Structure

### `environments.ts`

Exports an `EnvironmentConfig` interface with the following properties:

```typescript
interface EnvironmentConfig {
  name: "dev" | "prod"; // Environment name
  accountId: string; // AWS Account ID
  region: string; // AWS Region
  lambdaMemory: number; // Lambda memory in MB
  logRetentionDays: number; // CloudWatch Logs retention in days
  htmlCacheTtlMinutes: number; // CloudFront HTML cache TTL in minutes
  assetsCacheTtlDays: number; // CloudFront assets cache TTL in days
}
```

## Default Values

### Development Environment

```typescript
{
  name: "dev",
  accountId: "754567010779",      // Can be overridden by AWS_ACCOUNT_ID_DEV env var
  region: "us-east-1",            // Can be overridden by AWS_REGION_DEV env var
  lambdaMemory: 512,              // MB
  logRetentionDays: 7,
  htmlCacheTtlMinutes: 5,
  assetsCacheTtlDays: 1,
}
```

### Production Environment

```typescript
{
  name: "prod",
  accountId: "YOUR_PROD_ACCOUNT_ID",  // MUST be set via AWS_ACCOUNT_ID_PROD
  region: "us-east-1",                // Can be overridden by AWS_REGION_PROD env var
  lambdaMemory: 1024,                 // MB
  logRetentionDays: 30,
  htmlCacheTtlMinutes: 60,
  assetsCacheTtlDays: 30,
}
```

## Usage

### In CDK App (`app.ts`)

```typescript
import { getEnvironmentConfig } from "./config/environments.js";

const environment = app.node.tryGetContext("environment") || "dev";
const envConfig = getEnvironmentConfig(environment);

// Use envConfig when creating stacks
new WebAppStack(app, `archil-io-v2-${environment}`, {
  environment,
  envConfig,
  env: {
    account: envConfig.accountId,
    region: envConfig.region,
  },
});
```

### In CDK Stacks

Stack props extend to include `envConfig`:

```typescript
interface WebAppStackProps extends cdk.StackProps {
  environment: string;
  envConfig: EnvironmentConfig;
}

// Inside stack constructor
const { envConfig } = props;
const lambdaMemory = envConfig.lambdaMemory;
const htmlCacheTtl = cdk.Duration.minutes(envConfig.htmlCacheTtlMinutes);
```

## Configuration via Environment Variables

The config system supports environment variable overrides for flexibility in CI/CD or different deployment scenarios:

| Environment Variable  | Purpose                         | Default Value                  |
| --------------------- | ------------------------------- | ------------------------------ |
| `AWS_ACCOUNT_ID_DEV`  | Dev AWS Account ID              | `754567010779`                 |
| `AWS_REGION_DEV`      | Dev AWS Region                  | `us-east-1`                    |
| `AWS_ACCOUNT_ID_PROD` | Prod AWS Account ID (required!) | `YOUR_PROD_ACCOUNT_ID` (error) |
| `AWS_REGION_PROD`     | Prod AWS Region                 | `us-east-1`                    |

### Setting Environment Variables

```bash
# Override prod account ID
export AWS_ACCOUNT_ID_PROD=123456789012

# Override region
export AWS_REGION_PROD=eu-west-1

# Deploy
npx cdk deploy archil-io-v2-prod --context environment=prod
```

Or inline:

```bash
AWS_ACCOUNT_ID_PROD=123456789012 AWS_REGION_PROD=eu-west-1 \
  npx cdk deploy archil-io-v2-prod --context environment=prod
```

## Setup Instructions

### 1. Update Production Account ID

Before deploying to production, update the account ID in `environments.ts`:

```typescript
// In environments.ts, update the prod section:
prod: {
  name: "prod",
  accountId: process.env.AWS_ACCOUNT_ID_PROD || "YOUR_ACTUAL_PROD_ACCOUNT_ID",
  // ... rest of config
}
```

Or set the environment variable:

```bash
export AWS_ACCOUNT_ID_PROD=111111111111  # Your actual prod account ID
```

### 2. Deploy Stacks

```bash
# Deploy to dev
npx cdk deploy archil-io-v2-dev --context environment=dev

# Deploy to prod (after setting account ID)
npx cdk deploy archil-io-v2-prod --context environment=prod
```

## Adding New Configuration Options

To add new environment-specific settings:

1. **Add to `EnvironmentConfig` interface** in `environments.ts`:

```typescript
interface EnvironmentConfig {
  // ... existing properties
  newOption: string; // Add new option
}
```

2. **Define values for each environment**:

```typescript
const environments: Record<"dev" | "prod", EnvironmentConfig> = {
  dev: {
    // ... existing config
    newOption: "dev-value",
  },
  prod: {
    // ... existing config
    newOption: "prod-value",
  },
};
```

3. **Use in stacks**:

```typescript
const { envConfig } = props;
const myOption = envConfig.newOption;
```

## Best Practices

✅ **Do:**

- Keep configurations in this file for centralized management
- Use environment variables for CI/CD flexibility
- Add validation for critical settings (like prod account ID)
- Document new configuration options

❌ **Don't:**

- Hardcode account IDs or regions in stack code
- Mix configuration sources (use this file as the single source of truth)
- Forget to set production account ID before deploying

## See Also

- [IMPLEMENTATION_GUIDE.md](../../docs/IMPLEMENTATION_GUIDE.md) - CDK deployment guide
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/latest/guide/)
