import type {
  TelegramFrom,
  TelegramWebhookPayload,
} from "../telegram/telegram.types";

export const TELEGRAM_UPDATE_EVENT_VERSION = "v1" as const;

export type TelegramUpdateEventV1 = {
  version: typeof TELEGRAM_UPDATE_EVENT_VERSION;
  updateId: string;
  chatId: string;
  text: string;
  from?: TelegramFrom;
  receivedAt: string;
  requestId: string;
};

export function buildTelegramUpdateEvent(
  payload: TelegramWebhookPayload,
  requestId: string,
): TelegramUpdateEventV1 | null {
  const updateId = payload.update_id;
  const text = payload.message?.text;
  const chatId = payload.message?.chat?.id;

  if (updateId == null || chatId == null || typeof text !== "string") {
    return null;
  }

  return {
    version: TELEGRAM_UPDATE_EVENT_VERSION,
    updateId: String(updateId),
    chatId: String(chatId),
    text,
    from: payload.message?.from,
    receivedAt: new Date().toISOString(),
    requestId,
  };
}
