import { Entity } from "electrodb";
import { docClient } from "./client";
const table = process.env.TABLE_NAME;
if (!table) throw new Error("TABLE_NAME is required");

export const GastoEntity = new Entity(
  {
    model: {
      entity: "gasto",
      version: "1",
      service: "telegramGastosBot",
    },
    attributes: {
      gastoId: { type: "string", required: true },
      chatId: { type: "string", required: true },
      telegramUpdateId: { type: "string", required: true },

      fecha: { type: "string", required: true }, // YYYY-MM-DD
      monto: { type: "number", required: true },

      rubro: { type: "string", required: true },
      rubroNormalizado: { type: "string", required: true },

      descripcion: { type: "string", required: true },
      createdAt: { type: "string", required: true }, // ISO
      telegramUserId: { type: "string", required: true },
      telegramIsBot: { type: "boolean", required: true },
      telegramFirstName: { type: "string" },
      telegramLastName: { type: "string" },
      telegramUsername: { type: "string" },
      telegramLanguageCode: { type: "string" },
    },
    indexes: {
      byChat: {
        pk: {
          field: "pk",
          composite: ["chatId"],
          template: "CHAT#${chatId}",
        },
        sk: {
          field: "sk",
          composite: ["telegramUpdateId"],
          template: "UPD#${telegramUpdateId}",
        },
      },
      byFecha: {
        index: "gsiFecha",
        pk: {
          field: "gsiFechaPk",
          composite: ["fecha"],
          template: "FECHA#${fecha}",
        },
        sk: {
          field: "gsiFechaSk",
          composite: ["rubroNormalizado", "createdAt", "gastoId"],
          template: "RUBRO#${rubroNormalizado}#TS#${createdAt}#ID#${gastoId}",
        },
      },
      byRubro: {
        index: "gsiRubro",
        pk: {
          field: "gsiRubroPk",
          composite: ["rubroNormalizado"],
          template: "RUBRO#${rubroNormalizado}",
        },
        sk: {
          field: "gsiRubroSk",
          composite: ["fecha", "createdAt", "gastoId"],
          template: "FECHA#${fecha}#TS#${createdAt}#ID#${gastoId}",
        },
      },
    },
  },
  {
    client: docClient,
    table,
  },
);
