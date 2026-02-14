# NS Record Updater Lambda

TypeScript Lambda function for automatically updating Route 53 NS records in the parent account.

## Overview

This Lambda function:

- Extracts nameservers from the child account's hosted zone
- Assumes a delegation role in the parent account
- Updates the NS delegation record in the parent account's root zone
- Includes automatic retry logic with exponential backoff

## Building

The Lambda code is compiled from TypeScript to JavaScript before CDK deployment.

### Prerequisites

- Node.js 24 or higher
- AWS CLI configured with appropriate credentials
- TypeScript installed (`npm install -g typescript` or use `npx tsc`)

### Build Process

The Lambda is built automatically when you run `cdk deploy`. However, you can manually build it:

```bash
# Build the Lambda function
npx tsc

# Or use the provided build script
bash build.sh
```

This compiles `index.ts` to `dist/index.js` which the Lambda runtime will execute.

### AWS SDK v3

The Lambda uses AWS SDK v3 (`@aws-sdk/*` packages) which are **pre-installed** in the Node.js 24 Lambda runtime. This means:

- No need to bundle dependencies
- Automatic updates from AWS
- Smaller Lambda package size
- Faster cold starts

### Runtime Details

- **Node.js Version**: 24.x
- **Handler**: `dist/index.js` (compiled from `index.ts`)
- **Timeout**: 5 minutes
- **Memory**: 256 MB
- **SDK**: AWS SDK v3 (pre-installed)

## File Structure

```
cdk/lambdas/ns-record-updater/
├── index.ts              # Lambda handler source code
├── tsconfig.json        # TypeScript configuration
├── build.sh             # Build script
├── dist/                # Compiled JavaScript output
│   ├── index.js
│   ├── index.d.ts
│   └── index.js.map
└── README.md            # This file
```

## Implementation Details

### Handler Function

```typescript
export const handler = async (
  event: UpdateNsRecordsEvent,
): Promise<{ statusCode: number; body: string }> => {
  // Extract nameservers from child zone
  // Assume parent delegation role
  // Update NS record in parent zone
  // Return success/error response
};
```

### Event Input

```typescript
interface UpdateNsRecordsEvent {
  childHostedZoneId: string; // Zone ID of child account's zone
  parentHostedZoneId: string; // Zone ID of parent account's root zone
  delegationRoleArn: string; // ARN of delegation role in parent account
  subdomain: string; // Subdomain FQDN (e.g., agent.archil.io)
}
```

### Retry Logic

- **Attempts**: 3 total
- **Backoff Strategy**: Exponential (1s, 2s, 4s)
- **Total Time**: Up to 7 seconds before failure

### Error Handling

All errors are logged and thrown, causing the custom resource to fail (which is intentional - prevents incomplete deployments).

Common error scenarios:

- Invalid delegation role ARN
- Child zone doesn't exist
- Parent account temporary unavailability
- Role assumption failure

## Deployment

The Lambda is deployed as part of the SubdomainStack:

```bash
cd /path/to/archil-io-v2
npm install
npx cdk deploy
```

CDK automatically:

1. Compiles the TypeScript (if needed)
2. Packages the `dist/` directory
3. Creates the Lambda function
4. Sets up appropriate IAM permissions
5. Creates the custom resource that invokes the Lambda

## Testing Locally

To test the Lambda locally (optional):

```typescript
// test.ts
import { handler } from "./index";

const event = {
  childHostedZoneId: "Z1234567890ABC",
  parentHostedZoneId: "Z0987654321ZYX",
  delegationRoleArn:
    "arn:aws:iam::359373592118:role/agent-archil-io-dns-delegation-role",
  subdomain: "agent.archil.io",
};

handler(event)
  .then((result) => console.log("Success:", result))
  .catch((error) => console.error("Error:", error));
```

Compile and run:

```bash
npx ts-node test.ts
```

## Troubleshooting

### "Cannot find module" errors

**Cause**: TypeScript not compiled to JavaScript

**Solution**:

```bash
npx tsc
```

### Lambda fails with "aws-sdk not found"

**Cause**: Old Node.js version without AWS SDK v3 pre-installed

**Solution**: Ensure Lambda runtime is Node.js 24 or higher. SubdomainStack should use `lambda.Runtime.NODEJS_24_X`

### NS records not updating

1. Check Lambda logs in CloudWatch
2. Verify delegation role ARN is correct
3. Ensure parent account zone exists
4. Check parent account has the delegation role created

## Source Files

- **index.ts**: Main Lambda handler with all logic
- **tsconfig.json**: TypeScript configuration for ES2024 target
- **build.sh**: Build automation script

## AWS SDK v3 Imports

The Lambda uses these AWS SDK v3 packages (pre-installed in Node 24):

```typescript
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import {
  Route53Client,
  ChangeResourceRecordSetsCommand,
  ListResourceRecordSetsCommand,
} from "@aws-sdk/client-route-53";
```

No `package.json` is needed in this directory because the SDK is pre-installed in the Lambda runtime.

## References

- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/)
- [Node.js 24 Lambda Runtime](https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html)
- [AWS STS AssumeRole](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/clients/sts/)
- [Route 53 ChangeResourceRecordSets](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/clients/route-53/)
