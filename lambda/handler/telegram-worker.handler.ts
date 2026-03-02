import { parseCommand } from "../commands/command.parser";
import { handleCreateGastoCommand } from "../commands/create-gasto.command";
import { handleGastosMesCommand } from "../commands/gastos-mes.command";
import { handleResumenMesCommand } from "../commands/resumen-mes.command";
import type { TelegramUpdateEventV1 } from "../events/telegram-update-event";

type SqsRecord = {
  messageId: string;
  body: string;
};

type SqsEvent = {
  Records?: SqsRecord[];
};

type BatchItemFailure = {
  itemIdentifier: string;
};

function isDuplicateError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("ConditionalCheckFailedException") ||
    msg.includes("already exists")
  );
}

async function processUpdate(update: TelegramUpdateEventV1): Promise<void> {
  const command = parseCommand(update.text);

  switch (command.type) {
    case "gastos_mes":
      await handleGastosMesCommand({
        chatId: update.chatId,
        mesRaw: command.mesRaw,
      });
      return;

    case "resumen_mes":
      await handleResumenMesCommand({
        chatId: update.chatId,
      });
      return;

    case "create_gasto":
      await handleCreateGastoCommand({
        text: update.text,
        chatId: update.chatId,
        updateId: update.updateId,
        from: update.from,
      });
      return;
  }
}

export const handler = async (event: SqsEvent) => {
  const batchItemFailures: BatchItemFailure[] = [];

  for (const record of event.Records ?? []) {
    try {
      const payload = JSON.parse(record.body) as TelegramUpdateEventV1;

      if (
        payload.version !== "v1" ||
        !payload.updateId ||
        !payload.chatId ||
        typeof payload.text !== "string"
      ) {
        console.warn("invalid_worker_payload", {
          messageId: record.messageId,
        });
        // payload inválido => no retry (ya no se puede procesar)
        continue;
      }

      await processUpdate(payload);

      console.info("worker_process_success", {
        messageId: record.messageId,
        updateId: payload.updateId,
        chatId: payload.chatId,
      });
    } catch (error) {
      if (isDuplicateError(error)) {
        console.info("worker_duplicate_ignored", {
          messageId: record.messageId,
        });
        continue;
      }

      const reason = error instanceof Error ? error.message : String(error);
      console.error("worker_process_failure", {
        messageId: record.messageId,
        reason,
      });

      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
