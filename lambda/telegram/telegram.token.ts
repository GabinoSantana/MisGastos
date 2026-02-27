import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

const ssm = new SSMClient({});
let cachedTelegramToken: string | null = null;

export async function getTelegramToken(): Promise<string | null> {
  if (cachedTelegramToken) return cachedTelegramToken;

  const paramName = process.env.TELEGRAM_BOT_TOKEN_PARAM_NAME;
  if (!paramName) return null;

  const out = await ssm.send(
    new GetParameterCommand({
      Name: paramName,
      WithDecryption: true,
    }),
  );

  const value = out.Parameter?.Value ?? null;
  cachedTelegramToken = value;
  return value;
}
