import { parseCommand } from "../commands/command.parser";
import { handleCreateGastoCommand } from "../commands/create-gasto.command";
import { handleGastosMesCommand } from "../commands/gastos-mes.command";
import { handleResumenMesCommand } from "../commands/resumen-mes.command";
import type { TelegramWebhookPayload } from "../telegram/telegram.types";
import { getWebhookSecret } from "../telegram/webhook.secret";
import { createResponse } from "../utils/http.utils";
import { isValidTelegramSecret } from "../utils/validateToken.utils";

async function handleTelegramPost(event: any) {
  let payload: TelegramWebhookPayload = {};

  try {
    payload = JSON.parse(event?.body ?? "{}");
  } catch (error) {
    console.warn("Invalid JSON body", error);
    return createResponse(200, { message: "ok" });
  }

  const updateId = payload.update_id;
  const text = payload.message?.text;
  const chatId = payload.message?.chat?.id;

  if (updateId == null || chatId == null || typeof text !== "string") {
    console.log("Non-message update or missing fields");
    return createResponse(200, { message: "ok" });
  }

  try {
    const command = parseCommand(text);
    const resolvedChatId = String(chatId);

    switch (command.type) {
      case "gastos_mes":
        await handleGastosMesCommand({
          chatId: resolvedChatId,
          mesRaw: command.mesRaw,
        });
        return createResponse(200, { message: "ok" });

      case "resumen_mes":
        await handleResumenMesCommand({ chatId: resolvedChatId });
        return createResponse(200, { message: "ok" });

      case "create_gasto":
        await handleCreateGastoCommand({
          text,
          chatId: resolvedChatId,
          updateId: String(updateId),
          from: payload.message?.from,
        });
        return createResponse(200, { message: "ok" });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const isDuplicate =
      msg.includes("ConditionalCheckFailedException") ||
      msg.includes("already exists");

    if (isDuplicate) {
      console.log("Duplicate update ignored", { updateId });
      return createResponse(200, { message: "ok" });
    }

    console.warn("Message ignored (validation/parsing/save):", error);
    return createResponse(200, { message: "ok" });
  }
}

export const handler = async (event: any): Promise<any> => {
  try {
    const httpMethod = event?.httpMethod;
    // TODO: this must be eliminated only for debugging purposes
    console.log("Event:", JSON.stringify(event, null, 2));
    // TODO: enable this when previous log is eliminated
    // const requestId = event.requestContext?.requestId;
    // const path = event.path;
    // const hasSecretHeader = !!(
    //   event.headers?.["X-Telegram-Bot-Api-Secret-Token"] ||
    //   event.headers?.["x-telegram-bot-api-secret-token"]
    // );
    // console.log(
    //   JSON.stringify({
    //     requestId,
    //     httpMethod,
    //     path,
    //     hasSecretHeader,
    //   }),
    // );
    switch (httpMethod) {
      case "POST":
        const webhookSecret = await getWebhookSecret();
        if (!webhookSecret) {
          console.log("Webhook secret missing from SSM");
          return createResponse(500, { message: "Server misconfigured" });
        }
        if (!isValidTelegramSecret(event, webhookSecret!)) {
          console.log("Unauthorized request [401]");
          return createResponse(401, { message: "Unauthorized" });
        }
        return await handleTelegramPost(event);

      default:
        return createResponse(405, { message: "Invalid request method" });
    }
  } catch (error) {
    console.error("Unhandled error:", error);
    return createResponse(500, { message: "Internal server error" });
  }
};
