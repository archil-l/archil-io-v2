# Custom Domain Deployment Checklist

This checklist guides you through deploying the subdomain stack implementation for `agent.archil.io`.

## Prerequisites

- [ ] AWS CLI configured with profiles for both accounts
- [ ] CDK CLI installed: `npm install -g aws-cdk`
- [ ] Both projects cloned:
  - `archil-io-v2` (this project)
  - `ns-records-archil-io` (root account DNS infrastructure)

## Phase 1: Local Verification

- [ ] Verify SubdomainStack created in `cdk/lib/subdomain-stack.ts`
- [ ] Verify WebAppStack updated to accept SubdomainStack
- [ ] Verify app.ts deploys both stacks with dependencies
- [ ] Run `npx cdk diff` to preview changes (no errors expected)
- [ ] Verify TypeScript compilation: `npx tsc --noEmit`

## Phase 2: Bootstrap & Initial Deployment

### Account 260448775808 (Web App Account)

- [ ] Bootstrap CDK (first time only):

  ```bash
  npx cdk bootstrap aws://260448775808/us-east-1
  ```

- [ ] Deploy OIDC stack:

  ```bash
  npx cdk deploy archil-io-v2-github-oidc-prod
  ```

- [ ] Verify OIDC stack outputs

## Phase 3: Deploy Subdomain Stack

### Account 260448775808 (Web App Account)

- [ ] Deploy SubdomainStack:

  ```bash
  npx cdk deploy archil-io-v2-subdomain-prod
  ```

- [ ] Retrieve outputs:

  ```bash
  aws cloudformation describe-stacks \
    --stack-name archil-io-v2-subdomain-prod \
    --query 'Stacks[0].Outputs' \
    --region us-east-1
  ```

- [ ] Copy nameservers from output (format: `ns-XXX.awsdns-XX.com`, etc.)
  - NS1: ************\_\_\_************
  - NS2: ************\_\_\_************
  - NS3: ************\_\_\_************
  - NS4: ************\_\_\_************

- [ ] Verify hosted zone created:

  ```bash
  aws route53 list-hosted-zones --query 'HostedZones[?Name==`agent.archil.io.`]'
  ```

- [ ] Verify ACM certificate created:
  ```bash
  aws acm list-certificates \
    --region us-east-1 \
    --query 'CertificateSummaryList[?DomainName==`agent.archil.io`]'
  ```

## Phase 4: Configure NS Delegation in Root Account

### Account 359373592118 (Root Account)

- [ ] Open `ns-records-archil-io/app.ts`

- [ ] Update `delegatedSubdomains` array with nameservers from Phase 3:

  ```typescript
  delegatedSubdomains: [
    {
      name: "agent",
      nameservers: [
        "ns-XXX.awsdns-XX.com",
        "ns-YYY.awsdns-YY.com",
        // ... etc
      ],
    },
  ];
  ```

- [ ] Deploy DNS infrastructure:

  ```bash
  cd ../ns-records-archil-io
  npx cdk deploy dns-infrastructure-stack --profile root
  ```

- [ ] Verify NS delegation record created:
  ```bash
  aws route53 list-resource-record-sets \
    --hosted-zone-id Z<root-zone-id> \
    --query 'ResourceRecordSets[?Type==`NS` && Name==`agent.archil.io.`]' \
    --profile root
  ```

## Phase 5: Deploy Web App Stack

### Account 260448775808 (Web App Account)

- [ ] Deploy WebAppStack:

  ```bash
  npx cdk deploy archil-io-v2-prod
  ```

- [ ] Retrieve outputs:

  ```bash
  aws cloudformation describe-stacks \
    --stack-name archil-io-v2-prod \
    --query 'Stacks[0].Outputs' \
    --region us-east-1
  ```

- [ ] Note the CloudFront URL

## Phase 6: Verification

### DNS Resolution

- [ ] Verify NS records resolve:

  ```bash
  dig agent.archil.io NS
  ```

  Should return nameservers from subdomain account

- [ ] Verify A record resolves:

  ```bash
  dig agent.archil.io A
  ```

  Should return CloudFront distribution IP

- [ ] Verify with specific nameserver:
  ```bash
  dig @ns-XXX.awsdns-XX.com agent.archil.io A
  ```

### Certificate Validation

- [ ] Check certificate status in ACM console:
  - Status should be "Issued"
  - No pending validation records

- [ ] Verify ACM certificate ARN from Phase 3

### Application Access

- [ ] Wait 1-2 minutes for DNS propagation

- [ ] Access application via custom domain:

  ```bash
  curl https://agent.archil.io
  ```

  Should return HTML from Remix app

- [ ] Verify SSL certificate:

  ```bash
  openssl s_client -connect agent.archil.io:443 -servername agent.archil.io
  ```

  Should show valid certificate for `agent.archil.io`

- [ ] Open browser to `https://agent.archil.io`
  - [ ] No SSL warnings
  - [ ] Application loads correctly
  - [ ] Assets load correctly

### CloudFront & Lambda

- [ ] Check CloudFront cache behavior:
  - [ ] Assets cached (check Cache-Control headers)
  - [ ] HTML not cached (or short TTL)

- [ ] Check Lambda invocation:
  ```bash
  aws logs tail /aws/lambda/archil-io-v2-prod-WebAppFunction* --follow
  ```

## Phase 7: GitHub Actions Deployment

- [ ] Push changes to main branch:

  ```bash
  git add .
  git commit -m "feat: add subdomain stack for custom domain"
  git push origin main
  ```

- [ ] Verify GitHub Actions workflow:
  - [ ] Workflow triggers successfully
  - [ ] All checks pass
  - [ ] Deployment completes

- [ ] Monitor CloudFormation in AWS Console

## Troubleshooting

### DNS Issues

**Problem:** `dig agent.archil.io NS` returns root nameservers

**Solution:**

- Verify NS delegation record exists in root zone
- Wait for TTL expiration (up to 1 hour)
- Clear DNS cache: `sudo dscacheutil -flushcache` (macOS)

**Problem:** `dig @ns-XXX.awsdns-XX.com agent.archil.io A` fails

**Solution:**

- Verify A record exists in subdomain hosted zone
- Check hosted zone is fully created (wait 1-2 minutes)
- Verify CloudFront distribution URL in outputs

### Certificate Issues

**Problem:** Certificate status is "PENDING_VALIDATION"

**Solution:**

- Verify hosted zone is created and responding
- Check ACM console for validation details
- Wait 5-10 minutes for ACM validation
- Verify validation records in hosted zone

**Problem:** SSL certificate errors in browser

**Solution:**

- Clear browser cache and cookies
- Verify certificate covers correct domain
- Check CloudFront distribution has correct certificate

### Access Issues

**Problem:** `curl https://agent.archil.io` returns 403

**Solution:**

- Verify CloudFront origin access control
- Check S3 bucket permissions
- Verify Lambda function has S3 read access
- Check Lambda function environment variables

## Rollback Procedure

If needed, you can rollback to previous state:

```bash
# Delete WebAppStack (preserves subdomain infrastructure)
npx cdk destroy archil-io-v2-prod

# Delete SubdomainStack (if starting over)
npx cdk destroy archil-io-v2-subdomain-prod

# In root account, remove NS delegation
cd ../ns-records-archil-io
npx cdk destroy dns-infrastructure-stack --profile root
```

## Success Indicators

- [x] SubdomainStack deployed
- [x] WebAppStack deployed
- [x] DNS resolves `agent.archil.io` to CloudFront
- [x] SSL certificate is valid
- [x] Application accessible at `https://agent.archil.io`
- [x] Assets load correctly with proper caching
- [x] GitHub Actions deployment works

## Notes

- Ensure both AWS profiles are configured correctly
- Keep nameservers from Phase 3 safe for NS delegation
- DNS propagation may take up to 1 hour globally
- SSL certificate validation may take 5-10 minutes
- Monitor CloudWatch logs if issues occur

## References

- [SUBDOMAIN_STACK_IMPLEMENTATION.md](./SUBDOMAIN_STACK_IMPLEMENTATION.md)
- [CUSTOM_DOMAIN_SETUP.md](./CUSTOM_DOMAIN_SETUP.md)
- [ns-records-archil-io/DELEGATION_PATTERN.md](../ns-records-archil-io/DELEGATION_PATTERN.md)
