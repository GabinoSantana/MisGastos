import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import type { TelegramUpdateEventV1 } from "../events/telegram-update-event";

const sqsClient = new SQSClient({});
const queueUrl = process.env.INGRESS_QUEUE_URL;

export async function enqueueTelegramUpdate(
  event: TelegramUpdateEventV1,
): Promise<void> {
  if (!queueUrl) {
    throw new Error("Missing INGRESS_QUEUE_URL");
  }

  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(event),
      MessageAttributes: {
        version: { DataType: "String", StringValue: event.version },
        updateId: { DataType: "String", StringValue: event.updateId },
      },
    }),
  );
}
