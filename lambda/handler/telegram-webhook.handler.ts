import { parseCommand } from "../commands/command.parser";
import { handleCreateGastoCommand } from "../commands/create-gasto.command";
import { handleGastosMesCommand } from "../commands/gastos-mes.command";
import { handleResumenMesCommand } from "../commands/resumen-mes.command";
import type { TelegramWebhookPayload } from "../telegram/telegram.types";
import { createResponse } from "../utils/http.utils";

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

    console.log("Event:", JSON.stringify(event, null, 2));
    switch (httpMethod) {
      case "GET":
        return createResponse(200, { message: "ok" });

      case "POST":
        return await handleTelegramPost(event);

      default:
        return createResponse(405, { message: "Invalid request method" });
    }
  } catch (error) {
    console.error("Unhandled error:", error);
    return createResponse(500, { message: "Internal server error" });
  }
};
