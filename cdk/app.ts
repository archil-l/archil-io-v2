#!/usr/bin/env node
import "source-map-support/register.js";
import * as cdk from "aws-cdk-lib";
import { WebAppStack } from "./lib/web-app-stack.js";
import { GitHubOidcStack } from "./lib/github-oidc-stack.js";
import { getEnvironmentConfig } from "./config/environments.js";

const app = new cdk.App();

// Get environment from context (passed via --context environment=dev or =prod)
const environment = app.node.tryGetContext("environment") || "dev";

// Get environment-specific configuration
const envConfig = getEnvironmentConfig(environment);

console.log(
  `Deploying to ${environment} environment (Account: ${envConfig.accountId}, Region: ${envConfig.region})`,
);

// OIDC Stack - for GitHub Actions authentication
new GitHubOidcStack(app, `archil-io-v2-github-oidc-${environment}`, {
  environment,
  envConfig,
  env: {
    account: envConfig.accountId,
    region: envConfig.region,
  },
});

// Application Stack - the actual web app
new WebAppStack(app, `archil-io-v2-${environment}`, {
  environment,
  envConfig,
  env: {
    account: envConfig.accountId,
    region: envConfig.region,
  },
});
