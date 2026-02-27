import { normalizeRubro } from "./normalize";

export type ParsedGastoText = {
  fecha: string; // YYYY-MM-DD
  monto: number;
  rubro: string;
  rubroNormalizado: string;
  descripcion: string;
};

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function buildIsoDate(day: number, month: number, year: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (!valid) throw new Error("Fecha inválida");
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function parseGastoText(raw: string): ParsedGastoText {
  const text = raw.trim();
  const parts = text.split(",").map((p) => p.trim());

  if (parts.length < 4) {
    throw new Error("Formato inválido. Usá: DD/MM, Monto, Rubro, Descripción");
  }

  const [fechaRaw, montoRaw, rubroRaw, ...descripcionRest] = parts;
  const descripcion = descripcionRest.join(", ").trim();

  const fechaMatch = /^(\d{1,2})\/(\d{1,2})$/.exec(fechaRaw);
  if (!fechaMatch) {
    throw new Error("Fecha inválida. Formato esperado: DD/MM");
  }

  const day = Number(fechaMatch[1]);
  const month = Number(fechaMatch[2]);
  const year = new Date().getFullYear();
  const fecha = buildIsoDate(day, month, year);

  const normalizedMontoRaw = montoRaw.replace(/\./g, "").replace(",", ".");
  const monto = Number(normalizedMontoRaw);
  if (!Number.isFinite(monto) || monto <= 0) {
    throw new Error("Monto inválido. Debe ser un número positivo");
  }

  const rubro = rubroRaw.trim();
  if (!rubro) throw new Error("Rubro vacío");

  if (!descripcion) throw new Error("Descripción vacía");

  return {
    fecha,
    monto,
    rubro,
    rubroNormalizado: normalizeRubro(rubro),
    descripcion,
  };
}
