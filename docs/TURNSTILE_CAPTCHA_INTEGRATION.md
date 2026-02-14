# Cloudflare Turnstile CAPTCHA Integration Guide

This guide provides complete instructions for integrating Cloudflare Turnstile CAPTCHA into the archil-io-v2 project. The CAPTCHA will be displayed once per session before users can send their first message in the chat.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Cloudflare Turnstile Setup](#cloudflare-turnstile-setup)
3. [GitHub Secrets Configuration](#github-secrets-configuration)
4. [Environment Variables Setup](#environment-variables-setup)
5. [CDK Infrastructure Updates](#cdk-infrastructure-updates)
6. [Frontend Implementation](#frontend-implementation)
7. [Backend Implementation](#backend-implementation)
8. [Testing & Verification](#testing--verification)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Cloudflare account (free tier is sufficient)
- Access to GitHub repository settings
- AWS account with CDK deployment capabilities
- Understanding of React and TypeScript
- Node.js 24+ installed locally

---

## Cloudflare Turnstile Setup

### Step 1: Create a Cloudflare Account

1. Go to [cloudflare.com](https://cloudflare.com)
2. Sign up for a free account
3. Complete email verification

### Step 2: Create a Turnstile Site

1. Log in to Cloudflare Dashboard
2. Navigate to **Account Home** → **Turnstile**
3. Click **Create Site**
4. Fill in the form:
   - **Site name**: `archil-io-v2` (or your preferred name)
   - **Domain**: Your deployment domain (e.g., `agent.archil.io`)
   - **Mode**: Select **Managed** (recommended for simplicity)
5. Click **Create**

### Step 3: Retrieve Your Keys

After creating the site, you'll see:

- **Site Key** (public, safe to commit to code)
- **Secret Key** (private, must be stored securely)

**Save these values - you'll need them in the next steps.**

---

## GitHub Secrets Configuration

### Step 1: Add Secrets to GitHub Repository

1. Go to your GitHub repository: `https://github.com/archil-l/archil-io-v2`
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each:

| Secret Name            | Value                                |
| ---------------------- | ------------------------------------ |
| `TURNSTILE_SITE_KEY`   | Your Cloudflare Turnstile Site Key   |
| `TURNSTILE_SECRET_KEY` | Your Cloudflare Turnstile Secret Key |

### Step 2: Verify Secrets Are Set

```bash
# In GitHub Actions, you can reference these as:
# ${{ secrets.TURNSTILE_SITE_KEY }}
# ${{ secrets.TURNSTILE_SECRET_KEY }}
```

**Security Note**: These secrets are:

- Encrypted by GitHub
- Only available to GitHub Actions workflows
- The secret key is never exposed in logs
- Safe to use in CI/CD pipelines

---

## Environment Variables Setup

### Step 1: Update `.env.example`

Add these environment variables to document the new requirements:

```bash
# Anthropic API Key for AI Agent
# Get your key from: https://console.anthropic.com/
ANTHROPIC_API_KEY=your_api_key_here

# Cloudflare Turnstile CAPTCHA
# Get your keys from: https://dash.cloudflare.com/?to=/:account/turnstile
# Site Key: Public key, safe to commit to code
TURNSTILE_SITE_KEY=your_site_key_here
# Secret Key: Private key, stored in GitHub secrets, injected at deployment
TURNSTILE_SECRET_KEY=your_secret_key_here

# Optional: CloudFront URL for production assets
# CLOUDFRONT_URL=https://your-cloudfront-distribution.cloudfront.net
```

### Step 2: Local Development Setup

Create a `.env.local` file (not committed to git):

```bash
ANTHROPIC_API_KEY=your_local_api_key
TURNSTILE_SITE_KEY=your_test_site_key
TURNSTILE_SECRET_KEY=your_test_secret_key
```

**Note**: For local development, use test/development credentials from Turnstile, not production keys.

### Step 3: GitHub Actions Injection

The CI/CD pipeline will automatically inject these secrets. Update `.github/workflows/ci-and-deploy.yml`:

```yaml
deploy:
  # ... existing steps ...
  - name: Deploy application stack
    run: npx cdk deploy archil-io-v2-prod --require-approval never
    env:
      CDK_DEFAULT_ACCOUNT: ${{ secrets.AWS_ACCOUNT_ID }}
      CDK_DEFAULT_REGION: ${{ secrets.AWS_REGION }}
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      TURNSTILE_SECRET_KEY: ${{ secrets.TURNSTILE_SECRET_KEY }}
```

---

## CDK Infrastructure Updates

### Step 1: Update `cdk/lib/web-app-stack.ts`

Modify the Lambda function environment variables to include the Turnstile secret key:

**Find this section:**

```typescript
const remixFunction = new lambda.Function(this, "WebAppFunction", {
  code: lambda.Code.fromAsset(path.join(__dirname, "../../../dist/lambda-pkg")),
  handler: "web-app-handler.handler",
  runtime: Runtime.NODEJS_24_X,
  memorySize: lambdaMemory,
  timeout: cdk.Duration.seconds(30),
  architecture: Architecture.X86_64,
  environment: {
    ASSETS_BUCKET: assetsBucket.bucketName,
    CLOUDFRONT_URL: `https://${distribution.distributionDomainName}`,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
  },
  logRetention: logRetentionDays,
});
```

**Replace with:**

```typescript
const remixFunction = new lambda.Function(this, "WebAppFunction", {
  code: lambda.Code.fromAsset(path.join(__dirname, "../../../dist/lambda-pkg")),
  handler: "web-app-handler.handler",
  runtime: Runtime.NODEJS_24_X,
  memorySize: lambdaMemory,
  timeout: cdk.Duration.seconds(30),
  architecture: Architecture.X86_64,
  environment: {
    ASSETS_BUCKET: assetsBucket.bucketName,
    CLOUDFRONT_URL: `https://${distribution.distributionDomainName}`,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
    TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY || "",
  },
  logRetention: logRetentionDays,
});
```

**Why**: This passes the Turnstile secret key from the GitHub Actions environment to your Lambda function at deployment time.

### Step 2: Update `cdk/lib/web-app-stack.ts` - Add IAM Note

Add a comment documenting the environment variables (optional but recommended):

```typescript
// Environment variables passed from GitHub Actions via CDK
// - ANTHROPIC_API_KEY: API key for Anthropic Claude
// - TURNSTILE_SECRET_KEY: Secret key for Cloudflare Turnstile CAPTCHA validation
// These are injected at deployment time via GitHub Actions secrets
```

---

## Frontend Implementation

### Step 1: Install Turnstile React Library

```bash
npm install @marsidev/react-turnstile
```

### Step 2: Create Turnstile Component

Create `src/app/components/ui/turnstile.tsx`:

```typescript
import React, { forwardRef } from "react";
import Turnstile from "@marsidev/react-turnstile";

export interface TurnstileHandle {
  reset: () => void;
  getResponse: () => string | null;
}

interface TurnstileWidgetProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

export const TurnstileWidget = forwardRef<TurnstileHandle, TurnstileWidgetProps>(
  ({ siteKey, onVerify, onError, onExpire }, ref) => {
    return (
      <div className="flex justify-center my-4">
        <Turnstile
          ref={ref}
          sitekey={siteKey}
          onSuccess={onVerify}
          onError={onError}
          onExpire={onExpire}
          theme="dark"
          size="normal"
        />
      </div>
    );
  },
);

TurnstileWidget.displayName = "TurnstileWidget";
```

### Step 3: Update Input Area Component

Update `src/app/features/welcome/components/input-area.tsx` to integrate Turnstile:

```typescript
import { useRef, useState } from "react";
import { TurnstileWidget, TurnstileHandle } from "@/app/components/ui/turnstile";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";

interface InputAreaProps {
  // ... existing props
  onSendMessage: (message: string, captchaToken?: string) => void;
}

export function InputArea({ onSendMessage, ...props }: InputAreaProps) {
  const turnstileRef = useRef<TurnstileHandle>(null);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  const handleVerifyCaptcha = (token: string) => {
    setCaptchaToken(token);
    setCaptchaVerified(true);
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    // On first message, verify CAPTCHA
    if (!captchaVerified) {
      alert("Please complete the CAPTCHA verification first");
      return;
    }

    setIsLoading(true);
    try {
      // Send message with CAPTCHA token
      await onSendMessage(message, captchaToken || undefined);
      setMessage("");
      // Don't reset CAPTCHA - it should only show once per session
    } catch (error) {
      console.error("Error sending message:", error);
      // Reset CAPTCHA on error for retry
      if (turnstileRef.current) {
        turnstileRef.current.reset();
        setCaptchaVerified(false);
        setCaptchaToken(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Show CAPTCHA once until verified */}
      {!captchaVerified && siteKey && (
        <TurnstileWidget
          ref={turnstileRef}
          siteKey={siteKey}
          onVerify={handleVerifyCaptcha}
          onError={() => {
            console.error("Turnstile error");
            setCaptchaVerified(false);
          }}
          onExpire={() => {
            setCaptchaVerified(false);
            setCaptchaToken(null);
          }}
        />
      )}

      {/* Message input */}
      <div className="flex gap-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={!captchaVerified || isLoading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey && captchaVerified) {
              handleSend();
            }
          }}
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim() || !captchaVerified || isLoading}
          loading={isLoading}
        >
          Send
        </Button>
      </div>

      {!captchaVerified && (
        <p className="text-sm text-muted-foreground">
          Complete CAPTCHA verification to send your first message
        </p>
      )}
    </div>
  );
}
```

### Step 4: Set Environment Variable for Site Key

Create or update `vite.config.ts` to expose the site key:

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  define: {
    // Make environment variables available in the browser
    "import.meta.env.VITE_TURNSTILE_SITE_KEY": JSON.stringify(
      process.env.TURNSTILE_SITE_KEY || "",
    ),
  },
});
```

Alternatively, add to your build configuration if using React Router's Vite setup.

---

## Backend Implementation

### Step 1: Create Turnstile Validation Utility

Create `src/app/server/agent/turnstile.ts`:

```typescript
import type { Request } from "@react-router/node";

interface TurnstileValidationRequest {
  secret: string;
  response: string;
  remoteip?: string;
}

interface TurnstileValidationResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
  cacheKey?: string;
}

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function validateTurnstileToken(
  token: string,
  remoteIp?: string,
): Promise<{ valid: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.error("TURNSTILE_SECRET_KEY not configured");
    return {
      valid: false,
      error: "CAPTCHA validation not configured",
    };
  }

  if (!token) {
    return {
      valid: false,
      error: "No CAPTCHA token provided",
    };
  }

  try {
    const body: TurnstileValidationRequest = {
      secret: secretKey,
      response: token,
    };

    if (remoteIp) {
      body.remoteip = remoteIp;
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return {
        valid: false,
        error: `Cloudflare API error: ${response.statusText}`,
      };
    }

    const data: TurnstileValidationResponse = await response.json();

    if (data.success) {
      return { valid: true };
    }

    return {
      valid: false,
      error: `Validation failed: ${data["error-codes"]?.join(", ") || "unknown error"}`,
    };
  } catch (error) {
    console.error("Turnstile validation error:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function extractClientIp(request: Request): string | undefined {
  // Try to get IP from CloudFlare header first
  const cfIP = request.headers.get("CF-Connecting-IP");
  if (cfIP) return cfIP;

  // Try x-forwarded-for (for proxies)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  // Direct connection
  return request.socket?.remoteAddress;
}
```

### Step 2: Update Chat Handler

Update `src/app/server/agent/chat-handler.ts` to validate CAPTCHA tokens:

**Find the request handling section and add validation:**

```typescript
import { validateTurnstileToken, extractClientIp } from "./turnstile.js";

export async function handleAgentRequest(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { messages, captchaToken } = req.body;

    // Validate CAPTCHA token on first message
    if (captchaToken) {
      const clientIp = extractClientIp(req);
      const validation = await validateTurnstileToken(captchaToken, clientIp);

      if (!validation.valid) {
        res.status(400).json({
          error: "CAPTCHA validation failed",
          details: validation.error,
        });
        return;
      }
    }

    // Continue with existing chat handling
    const response = await handleAgentChat(messages);
    res.status(200).json(response);
  } catch (error) {
    console.error("Error in agent request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
```

### Step 3: Update Chat Request Payload

Ensure your chat request includes the CAPTCHA token:

```typescript
// In your chat submission logic
const payload = {
  messages: conversationMessages,
  captchaToken: captchaToken, // Include the token
};

const response = await fetch("/api/agent", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
```

---

## Testing & Verification

### Step 1: Local Testing

```bash
# Set environment variables
export VITE_TURNSTILE_SITE_KEY=your_test_site_key
export TURNSTILE_SECRET_KEY=your_test_secret_key

# Start development server
npm run dev

# Open http://localhost:5173
# Try to send a message - CAPTCHA should appear
```

### Step 2: Verify Component Rendering

1. Open your browser's Developer Tools (F12)
2. Navigate to the chat input area
3. Confirm Turnstile widget appears
4. Verify in the Console that no errors appear
5. Complete the CAPTCHA challenge

### Step 3: Test Verification Flow

1. After completing CAPTCHA, try sending a message
2. Check Network tab to verify:
   - CAPTCHA token is sent to `/api/agent`
   - Response is successful (200 status)
3. Check that subsequent messages don't require CAPTCHA

### Step 4: Test Token Validation

Add temporary logging in `turnstile.ts`:

```typescript
export async function validateTurnstileToken(
  token: string,
  remoteIp?: string,
): Promise<{ valid: boolean; error?: string }> {
  console.log("Validating token:", token.substring(0, 10) + "...");
  console.log("Remote IP:", remoteIp);
  // ... rest of function
}
```

### Step 5: Staging Environment Test

Before deploying to production:

1. Deploy to your staging branch/environment
2. Run through the complete flow
3. Verify CAPTCHA appears correctly
4. Confirm messages are sent successfully
5. Check CloudWatch logs for any errors

### Step 6: Production Deployment Testing Checklist

- [ ] GitHub secrets are set correctly
- [ ] CDK builds without errors
- [ ] Lambda function receives `TURNSTILE_SECRET_KEY` in environment
- [ ] CAPTCHA widget loads on the production domain
- [ ] CAPTCHA validation completes successfully
- [ ] Messages are blocked until CAPTCHA is verified
- [ ] Subsequent messages don't re-trigger CAPTCHA
- [ ] CloudWatch logs show successful validations
- [ ] No errors in browser console

---

## Troubleshooting

### CAPTCHA Widget Not Appearing

**Problem**: The Turnstile widget doesn't render on the page.

**Solutions**:

1. Verify `VITE_TURNSTILE_SITE_KEY` is set in environment
2. Check that `@marsidev/react-turnstile` is installed: `npm list @marsidev/react-turnstile`
3. Inspect browser console for import errors
4. Ensure the domain is added to Cloudflare Turnstile allowed domains

### "CAPTCHA validation failed" Error

**Problem**: CAPTCHA verification is rejected by Cloudflare.

**Solutions**:

1. Verify `TURNSTILE_SECRET_KEY` is correct in GitHub secrets
2. Confirm environment variable is passed to Lambda:
   ```bash
   aws lambda get-function-configuration \
     --function-name archil-io-v2-WebAppFunction-xxx \
     --query Environment.Variables
   ```
3. Check that secret key matches the site created in Cloudflare
4. Verify no typos in the token being sent from frontend

### "TURNSTILE_SECRET_KEY not configured" Message

**Problem**: The validation utility can't find the secret key.

**Solutions**:

1. Ensure `TURNSTILE_SECRET_KEY` is added to GitHub secrets
2. Verify CDK deployment includes the environment variable
3. Check CloudWatch logs for the Lambda function:
   ```bash
   aws logs tail /aws/lambda/archil-io-v2-WebAppFunction-xxx --follow
   ```

### CAPTCHA Expires Too Quickly

**Problem**: CAPTCHA token expires before message is sent.

**Solutions**:

1. Cloudflare tokens are valid for 5 minutes by default
2. If users take longer, reset and regenerate:
   ```typescript
   if (turnstileRef.current) {
     turnstileRef.current.reset();
     setCaptchaVerified(false);
   }
   ```

### Lambda Timeout During Validation

**Problem**: Request times out when validating CAPTCHA.

**Solutions**:

1. Check Lambda timeout (currently 30 seconds - should be sufficient)
2. Verify network connectivity from Lambda to Cloudflare
3. Check CloudWatch for detailed error messages
4. Increase Lambda timeout if needed in CDK

### CORS Issues

**Problem**: Browser blocks CAPTCHA widget load.

**Solutions**:

1. Ensure domain is registered in Cloudflare Turnstile
2. Check CORS headers in response
3. Verify API Gateway CORS configuration

---

## Security Considerations

### Best Practices

1. **Secret Key Management**
   - Never commit `TURNSTILE_SECRET_KEY` to version control
   - Always use GitHub secrets for CI/CD
   - Rotate keys periodically

2. **Token Validation**
   - Always validate tokens on the backend
   - Include client IP for additional security
   - Log validation failures for monitoring

3. **Rate Limiting**
   - Consider implementing per-IP rate limiting
   - Monitor for CAPTCHA bypass attempts
   - Review Cloudflare analytics regularly

4. **Token Reuse Prevention**
   - Tokens are single-use (Cloudflare enforces this)
   - Implement session-based CAPTCHA (user verifies once per session)
   - Store verification state server-side if needed for multi-step flows

### Monitoring

Monitor CAPTCHA metrics in Cloudflare Dashboard:

1. Navigate to Turnstile → Your Site
2. Check widget challenge stats
3. Review blocked challenges
4. Monitor error rates

---

## Support & Resources

- [Cloudflare Turnstile Docs](https://developers.cloudflare.com/turnstile/)
- [React Integration Guide](https://www.npmjs.com/package/@marsidev/react-turnstile)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/v2/guide/)

---

## Deployment Checklist

- [ ] Cloudflare Turnstile site created with site key and secret key
- [ ] GitHub secrets added: `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`
- [ ] `.env.example` updated with Turnstile variables
- [ ] CDK `web-app-stack.ts` updated with `TURNSTILE_SECRET_KEY`
- [ ] `@marsidev/react-turnstile` dependency installed
- [ ] `src/app/components/ui/turnstile.tsx` created
- [ ] `src/app/features/welcome/components/input-area.tsx` updated
- [ ] `src/app/server/agent/turnstile.ts` created
- [ ] `src/app/server/agent/chat-handler.ts` updated with validation
- [ ] Local testing completed successfully
- [ ] Staging environment testing completed
- [ ] GitHub Actions workflow can access secrets
- [ ] All error scenarios tested
- [ ] Documentation reviewed by team
- [ ] Production deployment approved

---

## Post-Deployment

After successful deployment:

1. Monitor CAPTCHA metrics in Cloudflare Dashboard
2. Review CloudWatch logs for validation errors
3. Gather user feedback on CAPTCHA experience
4. Monitor chat submission success rates
5. Adjust challenge difficulty if needed (Managed vs Rigid mode)
6. Set up alerts for high validation failure rates
