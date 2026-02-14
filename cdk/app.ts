#!/usr/bin/env node
import "source-map-support/register.js";
import * as cdk from "aws-cdk-lib";
import { WebAppStack } from "./lib/web-app-stack.js";
import { GitHubOidcStack } from "./lib/github-oidc-stack.js";
import { SubdomainStack } from "./lib/subdomain-stack.js";
import { getEnvironmentConfig, Stage } from "./config/environments.js";

const GITHUB_ORG = "archil-l";
const GITHUB_REPO = "archil-io-v2";

const app = new cdk.App();

// Get environment-specific configuration
const envConfig = getEnvironmentConfig(Stage.prod);

console.log(
  `Deploying to ${envConfig.stage} environment (Account: ${envConfig.accountId}, Region: ${envConfig.region})`,
);

// OIDC Stack - for GitHub Actions authentication
new GitHubOidcStack(app, `archil-io-v2-github-oidc-${envConfig.stage}`, {
  envConfig,
  githubOrg: GITHUB_ORG,
  githubRepo: GITHUB_REPO,
  env: {
    account: envConfig.accountId,
    region: envConfig.region,
  },
});

// Subdomain Stack - creates hosted zone and ACM certificate for custom domain
// Optionally updates NS delegation in parent account via custom resource
const subdomainStack = new SubdomainStack(
  app,
  `archil-io-v2-subdomain-${envConfig.stage}`,
  {
    domainName: envConfig.domainName || "agent.archil.io",
    parentHostedZoneId: envConfig.parentHostedZoneId,
    parentDelegationRoleArn: envConfig.parentDelegationRoleArn,
    env: {
      account: envConfig.accountId,
      region: envConfig.region,
    },
  },
);

// Application Stack - the actual web app
const webAppStack = new WebAppStack(app, `archil-io-v2-${envConfig.stage}`, {
  envConfig,
  subdomainStack,
  env: {
    account: envConfig.accountId,
    region: envConfig.region,
  },
});

// Ensure subdomain stack is created before web app stack
webAppStack.addDependency(subdomainStack);
