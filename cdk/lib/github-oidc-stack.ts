import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import type { EnvironmentConfig } from "../config/environments.js";

interface GitHubOidcStackProps extends cdk.StackProps {
  environment: string;
  envConfig: EnvironmentConfig;
}

export class GitHubOidcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: GitHubOidcStackProps) {
    super(scope, id, props);

    const { environment } = props;

    // Create OIDC Identity Provider for GitHub Actions
    const oidcProvider = new iam.OpenIdConnectProvider(
      this,
      "GitHubOidcProvider",
      {
        url: "https://token.actions.githubusercontent.com",
        clientIds: ["sts.amazonaws.com"],
      },
    );

    // Get the GitHub repository from environment variable or use a default pattern
    const githubRepo = process.env.GITHUB_REPOSITORY || "archil-l/archil-io-v2";

    // Create IAM Role for GitHub Actions
    const githubActionsRole = new iam.Role(this, "GitHubActionsRole", {
      roleName: `archil-io-v2-github-actions-role-${environment}`,
      assumedBy: new iam.WebIdentityPrincipal(
        oidcProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
            "token.actions.githubusercontent.com:sub": `repo:${githubRepo}:ref:refs/heads/*`,
          },
        },
      ),
      description: `GitHub Actions OIDC role for ${environment} environment`,
    });

    // Add CloudFormation permissions (needed for CDK deployments)
    githubActionsRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "cloudformation:*",
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
        ],
        resources: ["*"],
      }),
    );

    // Add Lambda permissions
    githubActionsRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "lambda:CreateFunction",
          "lambda:UpdateFunction",
          "lambda:UpdateFunctionCode",
          "lambda:DeleteFunction",
          "lambda:GetFunction",
          "lambda:InvokeFunction",
          "lambda:AddPermission",
          "lambda:RemovePermission",
        ],
        resources: ["*"],
      }),
    );

    // Add API Gateway permissions
    githubActionsRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["apigateway:*", "apigatewayv2:*"],
        resources: ["*"],
      }),
    );

    // Add S3 permissions
    githubActionsRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "s3:CreateBucket",
          "s3:GetBucketVersioning",
          "s3:PutBucketVersioning",
          "s3:GetBucketPolicy",
          "s3:PutBucketPolicy",
          "s3:DeleteBucket",
          "s3:PutBucketCors",
          "s3:GetBucketCors",
        ],
        resources: ["*"],
      }),
    );

    // Add CloudFront permissions
    githubActionsRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "cloudfront:CreateDistribution",
          "cloudfront:UpdateDistribution",
          "cloudfront:DeleteDistribution",
          "cloudfront:GetDistribution",
          "cloudfront:CreateInvalidation",
          "cloudfront:GetInvalidation",
        ],
        resources: ["*"],
      }),
    );

    // Add CloudWatch Logs permissions
    githubActionsRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DeleteLogGroup",
        ],
        resources: ["*"],
      }),
    );

    // Add IAM role passing permission (for Lambda execution role)
    githubActionsRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["iam:PassRole"],
        resources: [
          `arn:aws:iam::${this.account}:role/archil-io-v2-lambda-execution-role-${environment}`,
        ],
      }),
    );

    // Add IAM role creation/update permissions (for Lambda execution role)
    githubActionsRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "iam:CreateRole",
          "iam:UpdateAssumeRolePolicy",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:PutRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:GetRole",
          "iam:DeleteRole",
        ],
        resources: [`arn:aws:iam::${this.account}:role/archil-io-v2-*`],
      }),
    );

    // Output the role ARN for GitHub Secrets
    new cdk.CfnOutput(this, "GitHubActionsRoleArn", {
      description: "ARN of the GitHub Actions IAM role (use in GitHub Secrets)",
      value: githubActionsRole.roleArn,
      exportName: `archil-io-v2-github-actions-role-arn-${environment}`,
    });

    new cdk.CfnOutput(this, "OidcProviderArn", {
      description: "ARN of the OIDC Identity Provider",
      value: oidcProvider.openIdConnectProviderArn,
    });
  }
}
