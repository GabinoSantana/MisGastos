import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import path from "path";
import { CfnOutput } from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import * as ssm from "aws-cdk-lib/aws-ssm";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class TelegramBotGastosStack extends cdk.Stack {
  public readonly apiUrl: CfnOutput;
  public readonly lambdaFunctionName: CfnOutput;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const telegramTokenParam =
      ssm.StringParameter.fromSecureStringParameterAttributes(
        this,
        "TelegramBotTokenParam",
        {
          parameterName: "/telegram-bot-gastos/telegram-token",
        },
      );
    const gastosTabla = new Table(this, "gastosTabla", {
      partitionKey: { name: "pk", type: AttributeType.STRING },
      sortKey: { name: "sk", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    gastosTabla.addGlobalSecondaryIndex({
      indexName: "gsiFecha",
      partitionKey: { name: "gsiFechaPk", type: AttributeType.STRING },
      sortKey: { name: "gsiFechaSk", type: AttributeType.STRING },
    });

    gastosTabla.addGlobalSecondaryIndex({
      indexName: "gsiRubro",
      partitionKey: { name: "gsiRubroPk", type: AttributeType.STRING },
      sortKey: { name: "gsiRubroSk", type: AttributeType.STRING },
    });

    const telegramGastosBotLambda = new NodejsFunction(
      this,
      "TelegramGastosBotLambda",
      {
        entry: path.join(__dirname, "../lambda/index.ts"),
        handler: "handler",
        runtime: Runtime.NODEJS_22_X,
        timeout: cdk.Duration.seconds(30),
        memorySize: 512,
        bundling: {
          minify: true,
          sourceMap: true,
          externalModules: ["aws-sdk"],
        },
        environment: {
          TABLE_NAME: gastosTabla.tableName,
          GSI_FECHA_NAME: "gsiFecha",
          GSI_RUBRO_NAME: "gsiRubro",
          TELEGRAM_BOT_TOKEN_PARAM_NAME: "/telegram-bot-gastos/telegram-token",
        },
      },
    );
    telegramTokenParam.grantRead(telegramGastosBotLambda);
    gastosTabla.grantReadWriteData(telegramGastosBotLambda);

    // CREATE API GATEWAY
    const backendApi = new apigateway.RestApi(
      this,
      "TelegramGastosBotApiGateway",
      {
        restApiName: "TelegramGastosBotApiGateway",
        description: "API Gateway for the Telegram bot gastos backend",
        defaultCorsPreflightOptions: {
          allowOrigins: ["*"],
          allowMethods: ["GET", "POST", "DELETE", "PATCH", "OPTIONS"],
          allowHeaders: [
            "Content-Type",
            "Authorization",
            "X-Amz-Date",
            "Authorization",
            "X-Api-Key",
            "X-Amz-Security-Token",
          ],
          allowCredentials: true,
          maxAge: cdk.Duration.days(1),
        },
      },
    );

    const integration = new apigateway.LambdaIntegration(
      telegramGastosBotLambda,
    );

    // Also keep /telegram-gastos-bot for flexibility
    const telegramGastosBot = backendApi.root.addResource(
      "telegram-gastos-bot",
    );
    telegramGastosBot.addMethod("GET", integration);
    telegramGastosBot.addMethod("POST", integration);

    this.apiUrl = new CfnOutput(this, "CFNApiUrl", {
      value: backendApi.url,
      description: "API Gateway URL for the AMAV backend",
    });

    this.lambdaFunctionName = new CfnOutput(this, "LambdaFunctionName", {
      value: telegramGastosBotLambda.functionName,
    });
  }
}
