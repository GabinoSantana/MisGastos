import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

const ssm = new SSMClient({});
let cachedWebhookSecret: string | null = null;

export async function getWebhookSecret(): Promise<string | null> {
  if (cachedWebhookSecret) return cachedWebhookSecret;

  const paramName = process.env.WEBHOOK_SECRET_PARAM_NAME;
  if (!paramName) return null;

  const out = await ssm.send(
    new GetParameterCommand({
      Name: paramName,
      WithDecryption: true,
    }),
  );

  const value = out.Parameter?.Value ?? null;
  cachedWebhookSecret = value;
  return value;
}
