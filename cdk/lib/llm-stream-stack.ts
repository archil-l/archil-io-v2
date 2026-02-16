import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Runtime, Architecture } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as path from "path";
import { fileURLToPath } from "url";
import type { EnvironmentConfig } from "../config/environments.js";

interface LLMStreamStackProps extends cdk.StackProps {
  envConfig: EnvironmentConfig;
}

export class LLMStreamStack extends cdk.Stack {
  public readonly functionUrl: lambda.FunctionUrl;

  constructor(scope: Construct, id: string, props: LLMStreamStackProps) {
    super(scope, id, props);

    const { envConfig } = props;

    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    // Lambda function for LLM streaming
    const streamingFunction = new lambda.Function(this, "LLMStreamFunction", {
      code: lambda.Code.fromAsset(
        path.join(__dirname, "../../../dist/streaming-lambda"),
      ),
      handler: "streaming-handler.handler",
      runtime: Runtime.NODEJS_24_X,
      memorySize: 1024,
      timeout: cdk.Duration.minutes(5), // Longer timeout for streaming responses
      architecture: Architecture.X86_64,
      environment: {
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
        NODE_ENV: "production",
      },
      logRetention: envConfig.logRetentionDays,
    });

    // Add Function URL with streaming enabled
    this.functionUrl = streamingFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
      cors: {
        allowedOrigins: ["https://agent.archil.io", "http://localhost:5173"],
        allowedMethods: [lambda.HttpMethod.ALL],
        allowedHeaders: ["Content-Type", "Authorization"],
        allowCredentials: true,
      },
    });

    // Outputs
    new cdk.CfnOutput(this, "LLMStreamFunctionUrl", {
      description: "Lambda Function URL for LLM streaming",
      value: this.functionUrl.url,
    });

    new cdk.CfnOutput(this, "LLMStreamFunctionArn", {
      description: "LLM Streaming Lambda Function ARN",
      value: streamingFunction.functionArn,
    });
  }
}
