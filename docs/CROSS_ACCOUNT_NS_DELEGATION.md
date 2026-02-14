# Cross-Account NS Record Delegation via Custom Resource

This document explains how the child CDK automatically updates NS delegation records in the parent account's Route 53 zone without manual intervention.

## Overview

The implementation uses a **CDK custom resource with Lambda** to enable automatic NS record delegation. When the child account deploys the `SubdomainStack`, it:

1. Creates a subdomain hosted zone
2. **Automatically updates the parent's NS record** via a Lambda-backed custom resource
3. Creates and validates an ACM certificate (which now succeeds because NS delegation is in place)

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ Child Account (260448775808) - archil-io-v2        │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ SubdomainStack Deployment                    │   │
│  │ ──────────────────────────────────────────   │   │
│  │ 1. Create hosted zone (agent.archil.io)     │   │
│  │ 2. ↓ Trigger custom resource                │   │
│  │    ┌─────────────────────────────────────┐  │   │
│  │    │ Lambda-Backed Custom Resource       │  │   │
│  │    │ • Extract nameservers               │  │   │
│  │    │ • Assume delegation role in parent  │  │   │
│  │    │ • Update NS record                  │  │   │
│  │    │ • 3 retries w/ exponential backoff  │  │   │
│  │    └──────────────────────────────────────┘  │   │
│  │ 3. Create ACM certificate (validates OK)    │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
              │
              │ ASSUMES ROLE
              ▼
┌─────────────────────────────────────────────────────┐
│ Parent Account (359373592118) - ns-records-archil  │
│                                                     │
│  Route 53: archil.io zone                          │
│  ──────────────────────────────────────────────    │
│  NS record for agent.archil.io                     │
│  → ns-111.awsdns-11.com                            │
│  → ns-222.awsdns-22.net                            │
│  → ns-333.awsdns-33.org                            │
│  → ns-444.awsdns-44.co.uk                          │
│                                                     │
│  Delegation Role:                                  │
│  agent-archil-io-dns-delegation-role               │
│  (Trusts child account, allows NS updates)         │
└─────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Custom Resource (SubdomainStack)

**File:** `cdk/lib/subdomain-stack.ts`

The `SubdomainStack` creates an inline Lambda function that:

- **Queries** the child zone for its nameservers
- **Assumes** the delegation role in the parent account
- **Updates** the NS record in the parent zone
- **Retries** up to 3 times with exponential backoff (1s, 2s, 4s)

Key features:

- Uses AWS SDK v2 (available in Lambda runtime)
- Minimal logging (errors only)
- 5-minute timeout, 256MB memory
- Dependency ensures NS record is updated BEFORE certificate validation

### 2. Environment Configuration

**File:** `cdk/config/environments.ts`

Updated to include:

- `parentHostedZoneId`: Parent account's root zone ID
- `parentDelegationRoleArn`: ARN of the delegation role

```typescript
{
  domainName: "agent.archil.io",
  parentHostedZoneId: "Z01234567890ABC", // Parent zone ID
  parentDelegationRoleArn: "arn:aws:iam::359373592118:role/agent-archil-io-dns-delegation-role",
}
```

### 3. Lambda IAM Permissions

The Lambda function needs:

- **STS AssumeRole**: To assume the delegation role
- **Route 53 ListResourceRecordSets**: To read NS records from child zone

```typescript
nsUpdateLambda.addToRolePolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ["sts:AssumeRole"],
    resources: [delegationRoleArn],
  }),
);

nsUpdateLambda.addToRolePolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ["route53:ListResourceRecordSets"],
    resources: [`arn:aws:route53:::hostedzone/${hostedZoneId}`],
  }),
);
```

### 4. GitHub Actions OIDC Role

**File:** `cdk/lib/github-oidc-stack.ts`

Updated to include permission for assuming the delegation role:

```typescript
this.role.addToPrincipalPolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ["sts:AssumeRole"],
    resources: [
      "arn:aws:iam::359373592118:role/agent-archil-io-dns-delegation-role",
    ],
  }),
);
```

### 5. Parent Account Configuration

**File:** `ns-records-archil-io/app.ts`

The parent stack creates a DNS delegation role per child account:

```typescript
delegatedSubdomains: [
  {
    name: "agent",
    childAccountId: "260448775808",
    // No nameservers specified - child will provide automatically
  },
];
```

The `DnsInfrastructureStack` creates:

- IAM role that trusts the child account
- Permissions to update ONLY the NS record for that subdomain
- Read-only access to verify records

## Deployment Workflow

### Step 1: Ensure Parent Account Stack is Deployed

```bash
cd ns-records-archil-io
npx cdk deploy dns-infrastructure-stack --profile root
```

This creates:

- Root hosted zone for `archil.io`
- DNS delegation role: `agent-archil-io-dns-delegation-role`

### Step 2: Configure Child Account with Parent Details

Update `cdk/config/environments.ts`:

```typescript
{
  domainName: "agent.archil.io",
  parentHostedZoneId: "Z01234567890ABC", // From parent stack outputs
  parentDelegationRoleArn: "arn:aws:iam::359373592118:role/agent-archil-io-dns-delegation-role",
}
```

### Step 3: Deploy Child Account Stack

```bash
cd archil-io-v2
npx cdk deploy
```

During deployment:

1. ✅ SubdomainStack creates hosted zone
2. ✅ Custom resource Lambda executes automatically:
   - Queries nameservers from child zone
   - Assumes parent's delegation role
   - Updates NS record in parent zone (UPSERT)
3. ✅ ACM certificate validation succeeds (NS delegation is in place)
4. ✅ WebAppStack creates CloudFront and Lambda

**No manual steps required!**

## Error Handling

If the NS record update fails, the deployment **fails immediately** with a clear error message. The retry logic handles temporary issues:

- **Attempt 1**: Immediate
- **Attempt 2**: After 1 second
- **Attempt 3**: After 2 seconds

Common failure reasons:

- Delegation role ARN is incorrect
- Parent hosted zone ID is wrong
- Child account doesn't have permission to assume the role
- Parent account temporarily unavailable

## Verification

### Verify NS Delegation is in Place

```bash
# Query parent zone for NS delegation
aws route53 list-resource-record-sets \
  --hosted-zone-id Z01234567890ABC \
  --query "ResourceRecordSets[?Type=='NS' && Name=='agent.archil.io.']"

# Expected output:
# {
#   "Name": "agent.archil.io.",
#   "Type": "NS",
#   "TTL": 3600,
#   "ResourceRecords": [
#     {"Value": "ns-111.awsdns-11.com."},
#     {"Value": "ns-222.awsdns-22.net."},
#     {"Value": "ns-333.awsdns-33.org."},
#     {"Value": "ns-444.awsdns-44.co.uk."}
#   ]
# }
```

### Verify DNS Resolution Works

```bash
# Query DNS for the subdomain
dig agent.archil.io NS

# Should resolve to the child account's nameservers
```

### Check Custom Resource Logs

If deployment fails, check the custom resource Lambda logs:

```bash
# Find the custom resource logical ID in CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name archil-io-v2-subdomain-prod \
  --query "StackEvents[?ResourceType=='AWS::CloudFormation::CustomResource']"

# Check Lambda logs
aws logs tail /aws/lambda/FUNCTION_NAME --follow
```

## Configuration Reference

### Child Account (archil-io-v2)

**File:** `cdk/config/environments.ts`

```typescript
{
  domainName: "agent.archil.io",
  parentHostedZoneId: "Z01234567890ABC",
  parentDelegationRoleArn: "arn:aws:iam::359373592118:role/agent-archil-io-dns-delegation-role",
}
```

### Parent Account (ns-records-archil-io)

**File:** `config.ts` / `app.ts`

```typescript
delegatedSubdomains: [
  {
    name: "agent",
    childAccountId: "260448775808",
  },
];
```

## Troubleshooting

### Issue: Custom Resource Lambda Fails with "AccessDenied"

**Cause:** Child account cannot assume the delegation role.

**Solution:**

1. Verify delegation role ARN is correct
2. Check that child account ID matches in parent's `delegatedSubdomains`
3. Ensure parent stack is deployed

### Issue: Custom Resource Lambda Fails with "NoSuchHostedZone"

**Cause:** Parent hosted zone ID is incorrect.

**Solution:**

1. Verify `parentHostedZoneId` in child config
2. Get correct zone ID from parent stack outputs:
   ```bash
   aws cloudformation describe-stacks \
     --stack-name dns-infrastructure-stack \
     --query "Stacks[0].Outputs"
   ```

### Issue: NS Record Not Updated After Deployment

**Cause:** Custom resource executed but domain still unresolved.

**Solution:**

1. Wait for DNS TTL to expire (up to 1 hour)
2. Test DNS resolution:
   ```bash
   dig agent.archil.io NS
   ```
3. Check CloudFormation stack events for errors

### Issue: Certificate Validation Fails

**Cause:** NS record not yet propagated when certificate validation started.

**Solution:**

- The custom resource has a dependency on certificate, so this shouldn't happen
- If it does, try redeploying the stack
- Increase Lambda timeout if parent account is under load

## Security Considerations

### Least Privilege IAM

The delegation role is restricted to:

- **Update** only NS records for the specific subdomain
- **Read** host zone data (for verification)
- **List** hosted zones (for discovery)

It **cannot**:

- Modify other DNS records
- Delete the zone
- Create new records

### Role Assumptions

- Only the specific child account can assume the delegation role
- Session token expires after 15 minutes (configurable)
- All actions are logged in CloudTrail

### Lambda Execution

- Lambda runs with minimal permissions
- Only reads from child zone, assumes role for updates
- Timeouts prevent hung processes
- Failed updates cause stack deployment to fail

## Cost Implications

Additional costs from this implementation:

1. **Lambda execution**: ~1ms per deployment (negligible)
2. **Route 53 API calls**: 2 additional ChangeResourceRecordSets calls per deployment
3. **Custom resource**: Minimal CloudFormation cost

Total monthly impact: **< $0.10**

## Maintenance

### Updating Delegation Role

If you need to change the delegation role ARN:

1. Update parent's DNS role (if needed)
2. Update child's config: `parentDelegationRoleArn`
3. Redeploy child stack

### Adding New Subdomains

To add a new subdomain (e.g., `api.archil.io`):

1. Create new env config in child account
2. Add to parent's `delegatedSubdomains`
3. Deploy both stacks

## References

- [AWS CDK Custom Resources](https://docs.aws.cdk.dev/v2/docs/custom-resources/)
- [Route 53 NS Records](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html#NSRecordFormat)
- [Cross-Account IAM Roles](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies-manage-attach-manage-user-defined.html)
- [Lambda Execution Role](https://docs.aws.amazon.com/lambda/latest/dg/lambda-exec-model.html)
