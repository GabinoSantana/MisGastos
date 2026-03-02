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
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as eventSources from "aws-cdk-lib/aws-lambda-event-sources";

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
    const ingressDlq = new sqs.Queue(this, "TelegramIngressDlq", {
      queueName: "telegram-gastos-ingress-dlq",
      retentionPeriod: cdk.Duration.days(14),
    });

    const ingressQueue = new sqs.Queue(this, "TelegramIngressQueue", {
      queueName: "telegram-gastos-ingress-queue",
      retentionPeriod: cdk.Duration.days(4),
      visibilityTimeout: cdk.Duration.seconds(60),
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: ingressDlq,
      },
    });

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

    const telegramIngressLambda = new NodejsFunction(
      this,
      "TelegramIngressLambda",
      {
        entry: path.join(__dirname, "../lambda/index.ts"),
        handler: "webhookHandler",
        runtime: Runtime.NODEJS_22_X,
        timeout: cdk.Duration.seconds(10),
        memorySize: 256,
        environment: {
          TABLE_NAME: gastosTabla.tableName,
          GSI_FECHA_NAME,
          GSI_RUBRO_NAME,
          TELEGRAM_BOT_TOKEN_PARAM_NAME,
          WEBHOOK_SECRET_PARAM_NAME,
          SHARED_SUMMARY_CHAT_IDS: sharedSummaryChatIds,
          INGRESS_QUEUE_URL: ingressQueue.queueUrl,
        },
      },
    );
    ingressQueue.grantSendMessages(telegramIngressLambda);
    webhookSecretParam.grantRead(telegramIngressLambda);

    const telegramWorkerLambda = new NodejsFunction(
      this,
      "TelegramWorkerLambda",
      {
        entry: path.join(__dirname, "../lambda/index.ts"),
        handler: "workerHandler",
        runtime: Runtime.NODEJS_22_X,
        timeout: cdk.Duration.seconds(10),
        memorySize: 256,
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

    telegramWorkerLambda.addEventSource(
      new eventSources.SqsEventSource(ingressQueue, {
        batchSize: 10,
        reportBatchItemFailures: true,
      }),
    );

    ingressQueue.grantConsumeMessages(telegramWorkerLambda);
    gastosTabla.grantReadWriteData(telegramWorkerLambda);
    telegramTokenParam.grantRead(telegramWorkerLambda);
    webhookSecretParam.grantRead(telegramWorkerLambda);

    // CREATE API GATEWAY
    const webhookIntegration = new integrations.HttpLambdaIntegration(
      "TelegramWebhookIntegration",
      telegramIngressLambda,
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

    // 1. Lambda Worker Errors
    new cloudwatch.Alarm(this, "WorkerLambdaErrorsAlarm", {
      metric: telegramWorkerLambda.metricErrors({
        period: cdk.Duration.minutes(5),
        statistic: "sum",
      }),
      threshold: 5,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: "Errores en worker lambda - revisar DLQ",
    });

    // 2. Lambda Worker Throttles
    new cloudwatch.Alarm(this, "WorkerLambdaThrottlesAlarm", {
      metric: telegramWorkerLambda.metricThrottles({
        period: cdk.Duration.minutes(5),
        statistic: "sum",
      }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription:
        "Throttling en worker lambda - escalar o aumentar concurrencia",
    });

    // 3. DLQ tiene mensajes (fallos que no se reintentaron)
    new cloudwatch.Alarm(this, "DLQHasMessagesAlarm", {
      metric: ingressDlq.metricApproximateNumberOfMessagesVisible({
        period: cdk.Duration.minutes(5),
        statistic: "max",
      }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      alarmDescription: "Mensajes en DLQ - requieren reproceso manual",
    });

    // 4. Age of oldest message en cola principal (procesamiento lento/stuck)
    new cloudwatch.Alarm(this, "QueueAgeAlarm", {
      metric: ingressQueue.metricApproximateAgeOfOldestMessage({
        period: cdk.Duration.minutes(5),
        statistic: "max",
      }),
      threshold: 300, // 5 minutos
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription:
        "Mensajes en cola por más de 5 min - worker lento o caído",
    });

    // OUTPUTS
    this.lambdaFunctionName = new CfnOutput(this, "LambdaFunctionName", {
      value: telegramIngressLambda.functionName,
    });

    this.apiUrl = new CfnOutput(this, "CFNApiUrl", {
      value: `${httpApi.apiEndpoint}/prod`,
      description: "API Gateway URL for the Telegram bot gastos backend",
    });
  }
}
