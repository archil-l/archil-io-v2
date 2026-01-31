import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime, Architecture } from "aws-cdk-lib/aws-lambda";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import { Construct } from "constructs";
import * as path from "path";
import { fileURLToPath } from "url";
import type { EnvironmentConfig } from "../config/environments.js";

interface WebAppStackProps extends cdk.StackProps {
  environment: string;
  envConfig: EnvironmentConfig;
}

export class WebAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WebAppStackProps) {
    super(scope, id, props);

    const { environment, envConfig } = props;

    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    // Environment-specific configuration from envConfig
    const isDev = environment === "dev";
    const lambdaMemory = envConfig.lambdaMemory;
    const logRetentionDays = envConfig.logRetentionDays;

    // S3 bucket for static assets
    const assetsBucket = new s3.Bucket(this, "RemixAssetsBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true, // Enable versioning for rollback capability
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
    });

    // Add lifecycle policy to clean up old versions
    assetsBucket.addLifecycleRule({
      noncurrentVersionExpiration: cdk.Duration.days(isDev ? 7 : 30),
      noncurrentVersionTransitions: !isDev
        ? [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ]
        : undefined,
    });

    // CloudFront distribution for the S3 bucket with environment-specific caching
    const htmlCacheTtl = cdk.Duration.minutes(envConfig.htmlCacheTtlMinutes);
    const assetCacheTtl = cdk.Duration.days(envConfig.assetsCacheTtlDays);

    const distribution = new cloudfront.Distribution(
      this,
      "RemixAssetsDistribution",
      {
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(assetsBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: new cloudfront.CachePolicy(this, "HtmlCachePolicy", {
            defaultTtl: htmlCacheTtl,
            maxTtl: htmlCacheTtl,
            minTtl: cdk.Duration.seconds(0),
            queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
            headerBehavior: cloudfront.CacheHeaderBehavior.none(),
            cookieBehavior: cloudfront.CacheCookieBehavior.none(),
            enableAcceptEncodingGzip: true,
            enableAcceptEncodingBrotli: true,
          }),
        },
        additionalBehaviors: {
          "/assets/*": {
            origin:
              origins.S3BucketOrigin.withOriginAccessControl(assetsBucket),
            viewerProtocolPolicy:
              cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            cachePolicy: new cloudfront.CachePolicy(this, "AssetsCachePolicy", {
              defaultTtl: assetCacheTtl,
              maxTtl: assetCacheTtl,
              minTtl: cdk.Duration.seconds(0),
              queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
              headerBehavior: cloudfront.CacheHeaderBehavior.none(),
              cookieBehavior: cloudfront.CacheCookieBehavior.none(),
              enableAcceptEncodingGzip: true,
              enableAcceptEncodingBrotli: true,
            }),
          },
        },
        defaultRootObject: undefined,
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 404,
            responsePagePath: "/404.html",
            ttl: cdk.Duration.minutes(5),
          },
        ],
      },
    );

    // Lambda function using NodejsFunction for automatic bundling
    const remixFunction = new lambda.NodejsFunction(this, "WebAppFunction", {
      entry: path.join(__dirname, "../../../deployment/server.js"),
      handler: "handler",
      runtime: Runtime.NODEJS_24_X,
      memorySize: lambdaMemory,
      timeout: cdk.Duration.seconds(30),
      architecture: Architecture.X86_64,
      environment: {
        ASSETS_BUCKET: assetsBucket.bucketName,
        CLOUDFRONT_URL: `https://${distribution.distributionDomainName}`,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
      },
      bundling: {
        minify: true,
        sourceMap: false,
        externalModules: ["aws-sdk"],
      },
      logRetention: logRetentionDays,
    });

    // Grant Lambda function read access to S3 bucket
    assetsBucket.grantRead(remixFunction);

    // Deploy static assets to S3 bucket
    new s3deploy.BucketDeployment(this, "RemixAssetsDeployment", {
      sources: [
        s3deploy.Source.asset(path.join(__dirname, "../../../public")),
        s3deploy.Source.asset(path.join(__dirname, "../../../dist/client"), {
          exclude: ["**/*.html"], // HTML files are handled by Lambda
        }),
      ],
      destinationBucket: assetsBucket,
      distribution, // Invalidate CloudFront cache on deployment
      distributionPaths: ["/*"],
    });

    // HTTP API Gateway (v2) - no automatic /prod/ path
    const httpApi = new apigatewayv2.HttpApi(this, "RemixHttpApi", {
      description: "HTTP API for Remix app",
      createDefaultStage: false,
    });

    // Lambda integration
    const lambdaIntegration = new integrations.HttpLambdaIntegration(
      "RemixIntegration",
      remixFunction,
    );

    // Add route for all paths
    httpApi.addRoutes({
      path: "/{proxy+}",
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: lambdaIntegration,
    });

    // Add root path route
    httpApi.addRoutes({
      path: "/",
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: lambdaIntegration,
    });

    // Create stage without path prefix
    const stage = new apigatewayv2.HttpStage(this, "RemixStage", {
      httpApi,
      stageName: "$default",
      autoDeploy: true,
    });

    // Outputs
    new cdk.CfnOutput(this, "RemixFunctionApi", {
      description: "HTTP API endpoint URL for Remix function",
      value: httpApi.apiEndpoint,
    });

    new cdk.CfnOutput(this, "RemixFunctionArn", {
      description: "Remix Lambda Function ARN",
      value: remixFunction.functionArn,
    });

    new cdk.CfnOutput(this, "RemixCloudFrontUrl", {
      description: "CloudFront distribution URL for static assets",
      value: `https://${distribution.distributionDomainName}`,
    });
  }
}
