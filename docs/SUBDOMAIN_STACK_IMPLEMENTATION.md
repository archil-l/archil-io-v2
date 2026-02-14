# Subdomain Stack Implementation Guide

This document explains how the SubdomainStack pattern has been integrated into the archil-io-v2 project to implement custom domain support with proper DNS delegation.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ARCHIL-IO-V2 APPLICATION                         │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ SubdomainStack (cdk/lib/subdomain-stack.ts)                  │   │
│  │ ────────────────────────────────────────────────────────────  │   │
│  │ • Route 53 Hosted Zone: agent.archil.io                      │   │
│  │ • ACM Certificate: *.agent.archil.io                         │   │
│  │ • DNS Validation: Self-validated (owned zone)                │   │
│  │                                                               │   │
│  │ Outputs:                                                      │   │
│  │ - hostedZoneId: Z052085530KX1PT8QCFKR                        │   │
│  │ - nameservers: [ns-XXX.awsdns-XX.com, ...]                   │   │
│  │ - certificateArn: arn:aws:acm:us-east-1:...                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              ▲                                       │
│                              │ provides                              │
│                              │ hostedZone & certificate              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ WebAppStack (cdk/lib/web-app-stack.ts)                       │   │
│  │ ────────────────────────────────────────────────────────────  │   │
│  │ • CloudFront Distribution: agent.archil.io                   │   │
│  │ • Route 53 A Record: agent.archil.io → CloudFront            │   │
│  │ • Lambda Function: Remix SSR                                 │   │
│  │ • S3 Bucket: Static assets                                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. SubdomainStack (`cdk/lib/subdomain-stack.ts`)

The `SubdomainStack` is a reusable CDK construct that:

- **Creates a hosted zone** for the subdomain (e.g., `agent.archil.io`)
- **Creates an ACM certificate** with DNS validation using the owned zone
- **Outputs nameservers** for NS delegation setup in the parent account
- **Exports certificate ARN** for use in other stacks

**Key Properties:**

```typescript
export class SubdomainStack extends cdk.Stack {
  public readonly hostedZone: route53.HostedZone;
  public readonly certificate: acm.Certificate;
}
```

**Outputs Generated:**

- `hosted-zone-id` - Zone ID for Route 53 management
- `nameservers` - Comma-separated nameservers for delegation
- `nameservers-json` - JSON array format for automation
- `certificate-arn` - ARN of the ACM certificate for CloudFront

### 2. WebAppStack Integration (`cdk/lib/web-app-stack.ts`)

The `WebAppStack` now accepts an optional `SubdomainStack` reference:

```typescript
interface WebAppStackProps extends cdk.StackProps {
  envConfig: EnvironmentConfig;
  subdomainStack?: SubdomainStack;
}
```

**What it does:**

- Uses SubdomainStack's hosted zone for Route 53 A record
- Uses SubdomainStack's certificate for CloudFront distribution
- Creates an A record pointing CloudFront to the custom domain
- Falls back to default CloudFront domain if no SubdomainStack provided

**Certificate Usage:**

```typescript
const distribution = new cloudfront.Distribution(..., {
  domainNames: [envConfig.domainName],
  certificate: certificate,  // From SubdomainStack
})
```

**DNS Record Creation:**

```typescript
new route53.ARecord(this, "AgentAliasRecord", {
  zone: hostedZone, // From SubdomainStack
  recordName: envConfig.domainName,
  target: route53.RecordTarget.fromAlias(
    new targets.CloudFrontTarget(distribution),
  ),
});
```

### 3. App Configuration (`cdk/app.ts`)

The CDK app now deploys both stacks with proper dependency ordering:

```typescript
// 1. Create SubdomainStack first
const subdomainStack = new SubdomainStack(
  app,
  `archil-io-v2-subdomain-${envConfig.stage}`,
  {
    domainName: envConfig.domainName || "agent.archil.io",
    env: { account: envConfig.accountId, region: envConfig.region },
  },
);

// 2. Create WebAppStack with SubdomainStack reference
const webAppStack = new WebAppStack(app, `archil-io-v2-${envConfig.stage}`, {
  envConfig,
  subdomainStack, // Pass reference
  env: { account: envConfig.accountId, region: envConfig.region },
});

// 3. Ensure proper deployment order
webAppStack.addDependency(subdomainStack);
```

## Deployment Workflow

### Step 1: Bootstrap CDK (First Time Only)

```bash
npx cdk bootstrap aws://260448775808/us-east-1
```

### Step 2: Deploy Stacks

Deploy all stacks together:

```bash
npx cdk deploy
```

Or deploy individually:

```bash
# Deploy SubdomainStack first
npx cdk deploy archil-io-v2-subdomain-prod

# Then deploy WebAppStack
npx cdk deploy archil-io-v2-prod
```

### Step 3: Retrieve Nameservers

After SubdomainStack deployment, get the nameservers from CloudFormation outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name archil-io-v2-subdomain-prod \
  --query 'Stacks[0].Outputs'
```

Look for the `nameservers` output - these are needed for NS delegation setup in the root account.

### Step 4: Configure NS Delegation in Root Account

In the `ns-records-archil-io` project, update `app.ts` with the nameservers:

```typescript
new DnsInfrastructureStack(app, "dns-infrastructure-stack", {
  env: { account: rootZoneAccountId, region: region },
  domainName: domainName,
  delegatedSubdomains: [
    {
      name: "agent",
      nameservers: [
        "ns-111.awsdns-11.com",
        "ns-222.awsdns-22.net",
        "ns-333.awsdns-33.org",
        "ns-444.awsdns-44.co.uk",
      ],
    },
  ],
});
```

Then deploy:

```bash
cd ../ns-records-archil-io
npx cdk deploy dns-infrastructure-stack --profile root
```

## Configuration

### Environment Configuration (`cdk/config/environments.ts`)

Domain settings are configured in the environment config:

```typescript
const environments: Record<Stage, EnvironmentConfig> = {
  [Stage.prod]: {
    // ... other config ...
    domainName: "agent.archil.io",
    hostedZoneId: "Z052085530KX1PT8QCFKR",
    dnsRoleArn: "arn:aws:iam::359373592118:role/agent-dns-management-role",
  },
};
```

These values are used by:

- **SubdomainStack**: Uses `domainName` for hosted zone and certificate
- **WebAppStack**: Uses all three for CloudFront configuration and DNS records

## DNS Resolution Flow

### 1. Domain Query

```
user queries: agent.archil.io
↓
DNS resolver queries root nameservers
↓
Root nameservers return NS records pointing to agent account's nameservers
```

### 2. Subdomain Resolution

```
DNS resolver queries agent account's nameservers
↓
Agent's nameservers return A record pointing to CloudFront
↓
CloudFront serves the application
```

### 3. Certificate Validation

```
ACM Certificate created in SubdomainStack
↓
Validation records created in agent.archil.io hosted zone (owned)
↓
AWS ACM verifies DNS ownership
↓
Certificate issued (no cross-account role needed)
```

## Security Considerations

### Hosted Zone Isolation

- Each account owns its subdomain zone completely
- No cross-account role assumptions needed for DNS operations
- ACM validation works seamlessly within the owned zone

### IAM Permissions

The GitHub OIDC role already has required permissions:

```typescript
// For cross-account DNS access (if using delegation pattern)
this.role.addToPrincipalPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ["sts:AssumeRole"],
    resources: ["arn:aws:iam::359373592118:role/agent-dns-management-role"],
  }),
);

// For ACM certificate management
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

## Troubleshooting

### Issue: Certificate validation fails

**Solution:** Ensure SubdomainStack is deployed first and the hosted zone is fully created. The zone should respond to DNS queries before ACM validation starts.

### Issue: DNS queries fail after NS delegation

**Checklist:**

- ✓ SubdomainStack deployed successfully
- ✓ Nameservers copied correctly (no typos, proper format)
- ✓ NS delegation record created in root account
- ✓ TTL cache expired (up to 1 hour)

**Debug:**

```bash
# Check nameservers in subdomain zone
aws route53 list-resource-record-sets \
  --hosted-zone-id Z052085530KX1PT8QCFKR \
  --query "ResourceRecordSets[?Type=='NS']"

# Check NS delegation in root zone
aws route53 list-resource-record-sets \
  --hosted-zone-id Z<root-zone-id> \
  --query "ResourceRecordSets[?Type=='NS']"

# Test DNS resolution
dig agent.archil.io NS
dig @ns-111.awsdns-11.com agent.archil.io A
```

### Issue: CloudFront returns 403 errors

**Solution:** Ensure S3 bucket has proper CloudFront access (using Origin Access Control). Check CloudFront distribution is pointing to correct S3 bucket.

## File Structure

```
cdk/
├── app.ts                                 # Main CDK app with stack orchestration
├── lib/
│   ├── subdomain-stack.ts                # NEW: Subdomain infrastructure
│   ├── web-app-stack.ts                  # UPDATED: Uses SubdomainStack
│   └── github-oidc-stack.ts               # GitHub Actions authentication
└── config/
    └── environments.ts                    # Environment configuration
```

## Cleanup

To remove all infrastructure:

```bash
# Delete WebAppStack
npx cdk destroy archil-io-v2-prod

# Delete SubdomainStack
npx cdk destroy archil-io-v2-subdomain-prod

# Delete OIDC Stack (if no longer needed)
npx cdk destroy archil-io-v2-github-oidc-prod

# In root account, remove NS delegation
cd ../ns-records-archil-io
npx cdk destroy dns-infrastructure-stack --profile root
```

⚠️ **Warning:** This deletes all hosted zones and DNS records.

## References

- [AWS CDK Route 53 Documentation](https://docs.aws.cdk.dev/v2/docs/aws-route53-readme.html)
- [AWS CDK ACM Documentation](https://docs.aws.cdk.dev/v2/docs/aws-certificatemanager-readme.html)
- [AWS CDK CloudFront Documentation](https://docs.aws.cdk.dev/v2/docs/aws-cloudfront-readme.html)
- [Subdomain Delegation Pattern](../ns-records-archil-io/DELEGATION_PATTERN.md)
