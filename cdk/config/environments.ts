/**
 * Per-Environment Configuration for CDK Deployments
 *
 * This file defines AWS account IDs, regions, and other environment-specific
 * settings for dev and prod environments.
 *
 * These are hardcoded values per environment. The stage is selected via
 * --context environment=dev or --context environment=prod when running CDK commands.
 */

export enum Stage {
  dev = "dev",
  prod = "prod",
}

export interface EnvironmentConfig {
  /** Environment stage name (dev or prod) */
  stage: Stage;
  /** AWS Account ID */
  accountId: string;
  /** AWS Region */
  region: string;
  /** Lambda memory in MB */
  lambdaMemory: number;
  /** CloudWatch Logs retention in days */
  logRetentionDays: number;
  /** CloudFront HTML cache TTL in minutes */
  htmlCacheTtlMinutes: number;
  /** CloudFront assets cache TTL in days */
  assetsCacheTtlDays: number;
}

const environments: Record<Stage, EnvironmentConfig> = {
  [Stage.dev]: {
    stage: Stage.dev,
    accountId: "754567010779",
    region: "us-east-1",
    lambdaMemory: 512,
    logRetentionDays: 7,
    htmlCacheTtlMinutes: 5,
    assetsCacheTtlDays: 1,
  },
  [Stage.prod]: {
    stage: Stage.prod,
    accountId: "YOUR_PROD_ACCOUNT_ID",
    region: "us-east-1",
    lambdaMemory: 1024,
    logRetentionDays: 30,
    htmlCacheTtlMinutes: 60,
    assetsCacheTtlDays: 30,
  },
};

/**
 * Get environment configuration by stage
 * @param stage Stage name (dev or prod)
 * @returns Environment configuration object
 * @throws Error if stage is invalid or not properly configured
 */
export function getEnvironmentConfig(stage: string): EnvironmentConfig {
  if (stage !== "dev" && stage !== "prod") {
    throw new Error(`Invalid stage "${stage}". Must be "dev" or "prod".`);
  }

  const config = environments[stage as Stage];

  // Validate that prod account ID is configured
  if (stage === "prod" && config.accountId === "YOUR_PROD_ACCOUNT_ID") {
    throw new Error(
      "Production account ID not configured. Update cdk/config/environments.ts and set the prod accountId to your actual AWS account ID.",
    );
  }

  return config;
}

/**
 * Get all environment configurations
 */
export function getAllEnvironments(): Record<Stage, EnvironmentConfig> {
  return environments;
}

export default getEnvironmentConfig;
