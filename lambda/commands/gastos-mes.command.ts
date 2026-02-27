import { getListadoMensual } from "../db/gasto.repo";
import { formatListadoMensual } from "../formatting/message.formatter";
import {
  getMesActual,
  isMesValido,
  normalizeMesInput,
} from "../utils/date.utils";
import {
  sendTelegramLongMessage,
  sendTelegramMessage,
} from "../telegram/telegram.client";
import { getResumenScopeChatIds } from "./shared";

type HandleGastosMesInput = {
  chatId: string;
  mesRaw?: string;
};

export async function handleGastosMesCommand({
  chatId,
  mesRaw,
}: HandleGastosMesInput): Promise<void> {
  const resolvedMesRaw = mesRaw ?? getMesActual();
  const mes = normalizeMesInput(resolvedMesRaw);

  if (!isMesValido(mes)) {
    await sendTelegramMessage(
      chatId,
      "Mes inválido. Usá formato YYYY-MM (ej: 2026-02).",
    );
    return;
  }

  const scopeChatIds = getResumenScopeChatIds(chatId);
  const listado = await getListadoMensual(scopeChatIds, mes);
  const textoListado = formatListadoMensual(mes, listado);

  await sendTelegramLongMessage(chatId, textoListado);
}
