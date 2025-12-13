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

export class WebAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    // S3 bucket for static assets
    const assetsBucket = new s3.Bucket(this, "RemixAssetsBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
    });

    // CloudFront distribution for the S3 bucket
    const distribution = new cloudfront.Distribution(
      this,
      "RemixAssetsDistribution",
      {
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(assetsBucket),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
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
      }
    );

    // Lambda function using NodejsFunction for automatic bundling
    const remixFunction = new lambda.NodejsFunction(this, "WebAppFunction", {
      entry: path.join(__dirname, "../../../deployment/server.js"),
      handler: "handler",
      runtime: Runtime.NODEJS_24_X,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      architecture: Architecture.X86_64,
      environment: {
        ASSETS_BUCKET: assetsBucket.bucketName,
        CLOUDFRONT_URL: `https://${distribution.distributionDomainName}`,
      },
      bundling: {
        minify: true,
        sourceMap: false,
        externalModules: ["aws-sdk"],
      },
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
      remixFunction
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
