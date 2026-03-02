import { timingSafeEqual } from "crypto";

export function isValidTelegramSecret(
  event: any,
  webhookSecret: string | null | undefined,
): boolean {
  const expected = webhookSecret?.trim();
  if (!expected) return false;

  const headers = event?.headers ?? {};
  const headerRaw =
    headers["x-telegram-bot-api-secret-token"] ??
    headers["X-Telegram-Bot-Api-Secret-Token"] ??
    "";

  const received = String(headerRaw).trim();
  if (!received) return false;

  const expectedBuf = Buffer.from(expected, "utf8");
  const receivedBuf = Buffer.from(received, "utf8");

  if (expectedBuf.length !== receivedBuf.length) return false;

  return timingSafeEqual(expectedBuf, receivedBuf);
}
