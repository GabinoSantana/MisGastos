import { randomUUID } from "node:crypto";
import { parseGastoText } from "../domain/parse-gasto-text";
import type { TelegramFrom } from "../telegram/telegram.types";
import {
  atomicUpdateResumenMensual,
  createGasto,
  getResumenMensualFromAggregates,
  upsertResumenMensual,
} from "../db/gasto.repo";

type HandleCreateGastoInput = {
  text: string;
  chatId: string;
  updateId: string;
  from?: TelegramFrom;
};

export async function handleCreateGastoCommand({
  text,
  chatId,
  updateId,
  from,
}: HandleCreateGastoInput): Promise<void> {
  const parsed = parseGastoText(text);

  const telegramUserId = from?.id != null ? String(from.id) : null;
  const telegramIsBot = Boolean(from?.is_bot);
  const telegramFirstName = from?.first_name;
  const telegramLastName = from?.last_name;
  const telegramUsername = from?.username;
  const telegramLanguageCode = from?.language_code;

  if (!telegramUserId) {
    console.log("No telegram user id found");
    return;
  }

  await createGasto({
    gastoId: randomUUID(),
    chatId,
    telegramUpdateId: updateId,
    fecha: parsed.fecha,
    monto: parsed.monto,
    rubro: parsed.rubro,
    rubroNormalizado: parsed.rubroNormalizado,
    descripcion: parsed.descripcion,
    createdAt: new Date().toISOString(),
    telegramUserId,
    telegramIsBot,
    telegramFirstName,
    telegramLastName,
    telegramUsername,
    telegramLanguageCode,
  });
  const mes = parsed.fecha.slice(0, 7);
  // Update atómico del agregado (idempotente)
  await atomicUpdateResumenMensual(
    chatId,
    mes,
    parsed.monto,
    parsed.rubro,
    updateId,
  );
}
