import { getTelegramToken } from "./telegram.token";

const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;
const TELEGRAM_SAFE_CHUNK_LENGTH = 3800;

export async function sendTelegramMessage(
  chatId: string,
  text: string,
): Promise<void> {
  const token = await getTelegramToken();
  if (!token) {
    console.warn("Telegram token not available");
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.warn("Failed to send Telegram message", response.status, body);
  }
}

export function splitTelegramMessage(
  text: string,
  chunkSize = TELEGRAM_SAFE_CHUNK_LENGTH,
): string[] {
  if (text.length <= chunkSize) return [text];

  const lines = text.split("\n");
  const chunks: string[] = [];
  let current = "";

  for (const line of lines) {
    const candidate = current ? `${current}\n${line}` : line;

    if (candidate.length <= chunkSize) {
      current = candidate;
      continue;
    }

    if (current) chunks.push(current);

    if (line.length > chunkSize) {
      let start = 0;
      while (start < line.length) {
        chunks.push(line.slice(start, start + chunkSize));
        start += chunkSize;
      }
      current = "";
    } else {
      current = line;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

export async function sendTelegramLongMessage(
  chatId: string,
  text: string,
): Promise<void> {
  const chunks = splitTelegramMessage(text);

  for (let i = 0; i < chunks.length; i++) {
    const prefix = chunks.length > 1 ? `[${i + 1}/${chunks.length}]\n` : "";
    const finalText = `${prefix}${chunks[i]}`;

    if (finalText.length > TELEGRAM_MAX_MESSAGE_LENGTH) {
      await sendTelegramMessage(
        chatId,
        finalText.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH),
      );
    } else {
      await sendTelegramMessage(chatId, finalText);
    }
  }
}
