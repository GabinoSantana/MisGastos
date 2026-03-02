export function buildSafeRequestMeta(event: any) {
  const requestId = event?.requestContext?.requestId ?? "unknown";
  const method = event?.httpMethod ?? "unknown";
  const path = event?.path ?? "unknown";
  const headers = event?.headers ?? {};
  const hasSecretHeader = Boolean(
    headers["x-telegram-bot-api-secret-token"] ??
    headers["X-Telegram-Bot-Api-Secret-Token"],
  );

  return { requestId, method, path, hasSecretHeader };
}
