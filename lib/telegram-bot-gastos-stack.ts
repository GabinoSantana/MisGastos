import * as cdk from "aws-cdk-lib";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import path from "path";
import { CfnOutput } from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";

const TELEGRAM_BOT_TOKEN_PARAM_NAME = "/telegram-bot-gastos/telegram-token";
const WEBHOOK_SECRET_PARAM_NAME = "/telegram-bot-gastos/webhook-secret";
const GSI_FECHA_NAME = "gsiFecha";
const GSI_RUBRO_NAME = "gsiRubro";

export class TelegramBotGastosStack extends cdk.Stack {
  public readonly apiUrl: CfnOutput;
  public readonly lambdaFunctionName: CfnOutput;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const sharedSummaryChatIds =
      this.node.tryGetContext("sharedSummaryChatIds") ??
      process.env.SHARED_SUMMARY_CHAT_IDS ??
      "";

    const telegramTokenParam =
      ssm.StringParameter.fromSecureStringParameterAttributes(
        this,
        "TelegramBotTokenParam",
        {
          parameterName: TELEGRAM_BOT_TOKEN_PARAM_NAME,
        },
      );

    const webhookSecretParam =
      ssm.StringParameter.fromSecureStringParameterAttributes(
        this,
        "WebhookSecretParam",
        {
          parameterName: WEBHOOK_SECRET_PARAM_NAME,
        },
      );

    const gastosTabla = new Table(this, "gastosTabla", {
      partitionKey: { name: "pk", type: AttributeType.STRING },
      sortKey: { name: "sk", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    gastosTabla.addGlobalSecondaryIndex({
      indexName: GSI_FECHA_NAME,
      partitionKey: { name: "gsiFechaPk", type: AttributeType.STRING },
      sortKey: { name: "gsiFechaSk", type: AttributeType.STRING },
    });

    gastosTabla.addGlobalSecondaryIndex({
      indexName: GSI_RUBRO_NAME,
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
          GSI_FECHA_NAME,
          GSI_RUBRO_NAME,
          TELEGRAM_BOT_TOKEN_PARAM_NAME,
          WEBHOOK_SECRET_PARAM_NAME,
          SHARED_SUMMARY_CHAT_IDS: sharedSummaryChatIds,
        },
      },
    );
    telegramTokenParam.grantRead(telegramGastosBotLambda);
    webhookSecretParam.grantRead(telegramGastosBotLambda);
    gastosTabla.grantReadWriteData(telegramGastosBotLambda);

    // CREATE API GATEWAY
    const webhookIntegration = new integrations.HttpLambdaIntegration(
      "TelegramWebhookIntegration",
      telegramGastosBotLambda,
      {
        payloadFormatVersion: apigwv2.PayloadFormatVersion.VERSION_1_0,
      },
    );
    const httpApi = new apigwv2.HttpApi(this, "TelegramGastosBotHttpApi", {
      createDefaultStage: false,
    });

    httpApi.addRoutes({
      path: "/telegram-gastos-bot",
      methods: [apigwv2.HttpMethod.POST],
      integration: webhookIntegration,
    });

    new apigwv2.CfnStage(this, "TelegramGastosBotHttpApiStage", {
      apiId: httpApi.httpApiId,
      stageName: "prod",
      autoDeploy: true,
      defaultRouteSettings: {
        throttlingBurstLimit: 50,
        throttlingRateLimit: 25, // requests per second
      },
    });

    // ALARMS
    const httpApi4xxMetric = new cloudwatch.Metric({
      namespace: "AWS/ApiGateway",
      metricName: "4xx",
      dimensionsMap: {
        ApiId: httpApi.httpApiId,
        Stage: "prod",
      },
      statistic: "sum",
      period: cdk.Duration.minutes(5),
    });

    new cloudwatch.Alarm(this, "Webhook4xxAlarm", {
      metric: httpApi4xxMetric,
      threshold: 50,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription:
        "Spike de errores 4xx en webhook Telegram (incluye 401 por token invalido o throttling).",
    });

    // OUTPUTS
    this.lambdaFunctionName = new CfnOutput(this, "LambdaFunctionName", {
      value: telegramGastosBotLambda.functionName,
    });

    this.apiUrl = new CfnOutput(this, "CFNApiUrl", {
      value: `${httpApi.apiEndpoint}/prod`,
      description: "API Gateway URL for the Telegram bot gastos backend",
    });
  }
}
