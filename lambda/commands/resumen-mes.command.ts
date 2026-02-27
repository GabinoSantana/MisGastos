import { getResumenMensual } from "../db/gasto.repo";
import { formatResumenMensual } from "../formatting/message.formatter";
import { sendTelegramMessage } from "../telegram/telegram.client";
import { getMesActual } from "../utils/date.utils";
import { getResumenScopeChatIds } from "./shared";

type HandleResumenMesInput = {
  chatId: string;
};

export async function handleResumenMesCommand({
  chatId,
}: HandleResumenMesInput): Promise<void> {
  const mes = getMesActual();
  const scopeChatIds = getResumenScopeChatIds(chatId);
  const resumen = await getResumenMensual(scopeChatIds, mes);
  const resumenTexto = formatResumenMensual(mes, resumen);

  await sendTelegramMessage(chatId, resumenTexto);
}
