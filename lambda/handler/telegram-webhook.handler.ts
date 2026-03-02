import { buildTelegramUpdateEvent } from "../events/telegram-update-event";
import { enqueueTelegramUpdate } from "../queue/enqueue-telegram-update";
import type { TelegramWebhookPayload } from "../telegram/telegram.types";
import { getWebhookSecret } from "../telegram/webhook.secret";
import { createResponse } from "../utils/http.utils";
import { buildSafeRequestMeta } from "../utils/logger.utils";
import { isValidTelegramSecret } from "../utils/validateToken.utils";

async function handleTelegramPost(event: any, requestMeta: any) {
  let payload: TelegramWebhookPayload = {};
  try {
    payload = JSON.parse(event?.body ?? "{}");
  } catch {
    console.warn("Invalid JSON body", { requestId: requestMeta.requestId });
    return createResponse(200, { message: "ok" });
  }

  const updateEvent = buildTelegramUpdateEvent(payload, requestMeta.requestId);

  if (!updateEvent) {
    console.log("Non-message update or missing fields", {
      requestId: requestMeta.requestId,
    });
    return createResponse(200, { message: "ok" });
  }

  try {
    await enqueueTelegramUpdate(updateEvent);
    console.info("enqueue_success", {
      requestId: requestMeta.requestId,
      updateId: updateEvent.updateId,
      chatId: updateEvent.chatId,
    });
    return createResponse(200, { message: "ok" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("enqueue_failure", {
      requestId: requestMeta.requestId,
      reason: msg,
    });
    // se manda un  500 para que Telegram reintente y no perder updates
    return createResponse(500, {
      message: "Temporary error",
      requestId: requestMeta.requestId,
    });
  }
}

export const handler = async (event: any): Promise<any> => {
  const requestMeta = buildSafeRequestMeta(event);
  console.log("Webhook request received", requestMeta);
  try {
    const httpMethod = event?.httpMethod;

    switch (httpMethod) {
      case "POST":
        const webhookSecret = await getWebhookSecret();
        if (!webhookSecret) {
          console.log("Webhook secret missing from SSM");
          return createResponse(500, {
            message: "Server misconfigured",
            requestId: requestMeta.requestId,
          });
        }
        if (!isValidTelegramSecret(event, webhookSecret!)) {
          console.log("Unauthorized request [401]");
          return createResponse(401, {
            message: "Unauthorized",
            requestId: requestMeta.requestId,
          });
        }
        return await handleTelegramPost(event, requestMeta);

      default:
        return createResponse(405, { message: "Invalid request method" });
    }
  } catch (error) {
    console.error("Unhandled error:", error);
    return createResponse(500, { message: "Internal server error" });
  }
};
