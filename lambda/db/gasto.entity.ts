import { Entity } from "electrodb";
import { docClient } from "./client";
const table = process.env.TABLE_NAME;
if (!table) throw new Error("TABLE_NAME is required");
const gsiFechaName = process.env.GSI_FECHA_NAME;
if (!gsiFechaName) throw new Error("GSI_FECHA_NAME is required");
const gsiRubroName = process.env.GSI_RUBRO_NAME;
if (!gsiRubroName) throw new Error("GSI_RUBRO_NAME is required");

export const ResumenMensualEntity = new Entity(
  {
    model: {
      entity: "resumenMensual",
      version: "1",
      service: "telegramGastosBot",
    },
    attributes: {
      chatId: { type: "string", required: true },
      mes: { type: "string", required: true },
      totalMes: { type: "number", required: true },
      cantidad: { type: "number", required: true },
      totalPorRubro: { type: "any", required: true },
      updatedAt: { type: "string" }, // ISO
      lastUpdateId: { type: "string" }, // idempotencia por update
    },
    indexes: {
      byChatMes: {
        pk: {
          field: "pk",
          composite: ["chatId"],
          template: "CHAT#${chatId}",
        },
        sk: {
          field: "sk",
          composite: ["mes"],
          template: "MONTH#${mes}#SUMMARY",
        },
      },
    },
  },
  {
    client: docClient,
    table,
  },
);

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
        index: gsiFechaName,
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
        index: gsiRubroName,
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
