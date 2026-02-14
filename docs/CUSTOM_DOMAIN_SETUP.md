# Custom Domain Setup: agent.archil.io

This document outlines the implementation plan for adding `agent.archil.io` as a custom domain for the archil-io-v2 web application.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ROOT ACCOUNT (359373592118)                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Route 53 Hosted Zones:                                               │  │
│  │  - archil.io (root zone)                                              │  │
│  │  - agent.archil.io (delegated zone) - ID: Z052085530KX1PT8QCFKR       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  IAM Role: agent-dns-management-role                                  │  │
│  │  Trust: Account 260448775808 can assume this role                     │  │
│  │  Permissions: Manage DNS records in agent.archil.io zone              │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│              ┌───────────────────────────────────────────┐                  │
│              │      WEB APP ACCOUNT (260448775808)       │                  │
│              │                                           │                  │
│              │  ┌─────────────────────────────────────┐  │                  │
│              │  │  CloudFront Distribution            │  │                  │
│              │  │  - Custom domain: agent.archil.io   │  │                  │
│              │  │  - ACM Certificate (DNS validated)  │  │                  │
│              │  └─────────────────────────────────────┘  │                  │
│              │                    │                      │                  │
│              │                    ▼                      │                  │
│              │  ┌─────────────────────────────────────┐  │                  │
│              │  │  HTTP API Gateway + Lambda          │  │                  │
│              │  │  (React Router SSR)                 │  │                  │
│              │  └─────────────────────────────────────┘  │                  │
│              └───────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Prerequisites

The following resources already exist (deployed via `ns-records-archil-io` project):

| Resource                | Value                                                      |
| ----------------------- | ---------------------------------------------------------- |
| Hosted Zone ID          | `Z052085530KX1PT8QCFKR`                                    |
| DNS Management Role ARN | `arn:aws:iam::359373592118:role/agent-dns-management-role` |
| Domain Name             | `agent.archil.io`                                          |
| Root Account ID         | `359373592118`                                             |
| Web App Account ID      | `260448775808`                                             |

## Implementation Plan

### Step 1: Update Environment Configuration

**File:** `cdk/config/environments.ts`

Add domain-related configuration to the `EnvironmentConfig` interface and prod configuration:

```typescript
export interface EnvironmentConfig {
  // ... existing fields ...

  /** Custom domain name */
  domainName?: string;
  /** Route 53 Hosted Zone ID (in root account) */
  hostedZoneId?: string;
  /** IAM role ARN for cross-account DNS management */
  dnsRoleArn?: string;
}

const environments: Record<Stage, EnvironmentConfig> = {
  [Stage.prod]: {
    // ... existing config ...
    domainName: "agent.archil.io",
    hostedZoneId: "Z052085530KX1PT8QCFKR",
    dnsRoleArn: "arn:aws:iam::359373592118:role/agent-dns-management-role",
  },
};
```

### Step 2: Update WebAppStack

**File:** `cdk/lib/web-app-stack.ts`

Add the following components:

#### 2.1 Import Required Modules

```typescript
import * as route53 from "aws-cdk-lib/aws-route53";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as iam from "aws-cdk-lib/aws-iam";
```

#### 2.2 Look Up Cross-Account Hosted Zone

```typescript
// Only if domain is configured
if (envConfig.domainName && envConfig.hostedZoneId) {
  const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
    this,
    "AgentHostedZone",
    {
      hostedZoneId: envConfig.hostedZoneId,
      zoneName: envConfig.domainName,
    },
  );
}
```

#### 2.3 Create ACM Certificate with DNS Validation

```typescript
const certificate = new acm.Certificate(this, "AgentCertificate", {
  domainName: envConfig.domainName,
  validation: acm.CertificateValidation.fromDns(hostedZone),
});
```

> **Note:** For cross-account DNS validation, CDK will assume the DNS role to create validation records.

#### 2.4 Update CloudFront Distribution

```typescript
const distribution = new cloudfront.Distribution(
  this,
  "RemixAssetsDistribution",
  {
    // ... existing config ...
    domainNames: envConfig.domainName ? [envConfig.domainName] : undefined,
    certificate: envConfig.domainName ? certificate : undefined,
  },
);
```

#### 2.5 Create Route 53 A Record

```typescript
new route53.ARecord(this, "AgentAliasRecord", {
  zone: hostedZone,
  recordName: envConfig.domainName,
  target: route53.RecordTarget.fromAlias(
    new targets.CloudFrontTarget(distribution),
  ),
});
```

### Step 3: Update GitHub OIDC Stack

**File:** `cdk/lib/github-oidc-stack.ts`

Add permissions for cross-account DNS access and ACM:

```typescript
// Allow assuming the DNS management role in the root account
this.role.addToPrincipalPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ["sts:AssumeRole"],
    resources: ["arn:aws:iam::359373592118:role/agent-dns-management-role"],
  }),
);

// Add ACM certificate management permissions
this.role.addToPrincipalPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: [
      "acm:RequestCertificate",
      "acm:DescribeCertificate",
      "acm:DeleteCertificate",
      "acm:ListCertificates",
      "acm:AddTagsToCertificate",
    ],
    resources: ["*"],
  }),
);
```

## Security Considerations

### Are Hosted Zone ID and Role ARN Sensitive?

**No, these values are not secrets:**

| Value          | Risk Level | Reason                                                        |
| -------------- | ---------- | ------------------------------------------------------------- |
| Hosted Zone ID | **Low**    | Discoverable via DNS queries (`dig NS agent.archil.io`)       |
| Role ARN       | **Low**    | Follows predictable pattern; knowing ARN doesn't grant access |

**Security is enforced by:**

1. **IAM Trust Policies** - Only account `260448775808` can assume the DNS role
2. **IAM Permissions** - The role only allows DNS record management in the specific zone
3. **GitHub OIDC** - Only the `archil-l/archil-io-v2` repository can authenticate

### Recommendation

Keep these values in code (version controlled) rather than GitHub Secrets for:

- Simpler management
- Better infrastructure visibility
- No actual security benefit from hiding them

## Deployment

After implementation, deploy with:

```bash
# Deploy the OIDC stack first (if permissions changed)
npx cdk deploy archil-io-v2-github-oidc-prod

# Deploy the web app stack
npx cdk deploy archil-io-v2-prod
```

Or push to `main` branch to trigger GitHub Actions deployment.

## Verification

After deployment:

1. Check certificate status in ACM console (should be "Issued")
2. Verify DNS record exists:
   ```bash
   dig A agent.archil.io
   ```
3. Access the site at `https://agent.archil.io`

## Rollback

To remove the custom domain:

1. Remove domain configuration from `environments.ts`
2. Redeploy the stack
3. DNS records and certificate will be automatically removed

## Files Modified

| File                           | Changes                                        |
| ------------------------------ | ---------------------------------------------- |
| `cdk/config/environments.ts`   | Add domain configuration                       |
| `cdk/lib/web-app-stack.ts`     | Add certificate, CloudFront domain, DNS record |
| `cdk/lib/github-oidc-stack.ts` | Add STS and ACM permissions                    |
