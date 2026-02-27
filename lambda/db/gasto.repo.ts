import { GastoEntity } from "./gasto.entity";

export type NewGasto = {
  gastoId: string;
  chatId: string;
  telegramUpdateId: string;
  fecha: string; // YYYY-MM-DD
  monto: number;
  rubro: string;
  rubroNormalizado: string;
  descripcion: string;
  createdAt: string; // ISO
  telegramUserId: string;
  telegramIsBot: boolean;
  telegramFirstName?: string;
  telegramLastName?: string;
  telegramUsername?: string;
  telegramLanguageCode?: string;
};

export type ResumenMensual = {
  totalMes: number;
  totalPorRubro: Record<string, number>;
  cantidad: number;
};

export type GastoListadoItem = {
  fecha: string;
  monto: number;
  rubro: string;
  rubroNormalizado: string;
  descripcion: string;
  chatId: string;
  createdAt: string;
};

export async function createGasto(input: NewGasto) {
  return GastoEntity.create(input).go();
}

// todos los gastos de una fecha
export async function getGastosByFecha(fecha: string) {
  return GastoEntity.query.byFecha({ fecha }).go();
}

// gastos de una fecha y rubro
export async function getGastosByFechaAndRubro(
  fecha: string,
  rubroNormalizado: string,
) {
  // En ElectroDB, al pasar el primer componente del SK suele resolver begins_with sobre ese componente.
  return GastoEntity.query.byFecha({ fecha, rubroNormalizado }).go();
}

// gastos por rubro en rango de fecha
export async function getGastosByRubroAndDateRange(
  rubroNormalizado: string,
  desde: string, // YYYY-MM-DD
  hasta: string, // YYYY-MM-DD
) {
  return GastoEntity.query
    .byRubro({ rubroNormalizado })
    .between({ fecha: desde }, { fecha: hasta })
    .go();
}

function buildResumen(
  items: Array<{ monto: number; rubro: string }>,
): ResumenMensual {
  let totalMes = 0;
  const totalPorRubro: Record<string, number> = {};

  for (const item of items) {
    totalMes += item.monto;
    totalPorRubro[item.rubro] = (totalPorRubro[item.rubro] ?? 0) + item.monto;
  }

  return { totalMes, totalPorRubro, cantidad: items.length };
}
function getDaysInMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}

function toIsoDate(year: number, month1to12: number, day: number): string {
  return `${year}-${String(month1to12).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export async function getResumenMensual(
  chatIds: string[],
  mes: string,
): Promise<ResumenMensual> {
  // mes esperado: YYYY-MM
  const [yearStr, monthStr] = mes.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new Error("Mes inválido. Formato esperado YYYY-MM");
  }

  const days = getDaysInMonth(year, month);

  // 1 query por día, en paralelo
  const queries: Array<Promise<{ data: unknown[] }>> = [];
  for (let day = 1; day <= days; day++) {
    const fecha = toIsoDate(year, month, day);
    queries.push(
      GastoEntity.query.byFecha({ fecha }).go() as Promise<{ data: unknown[] }>,
    );
  }

  const results = await Promise.all(queries);

  const allItems = results.flatMap((r) => r.data) as Array<{
    monto: number;
    rubro: string;
    chatId: string;
  }>;

  const allowedChatIds = new Set(chatIds);
  const ownItems = allItems.filter((x) => allowedChatIds.has(x.chatId));

  return buildResumen(
    ownItems.map((x) => ({
      monto: x.monto,
      rubro: x.rubro,
    })),
  );
}

export async function getListadoMensual(
  chatIds: string[],
  mes: string,
): Promise<GastoListadoItem[]> {
  const [yearStr, monthStr] = mes.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new Error("Mes inválido. Formato esperado YYYY-MM");
  }

  const days = getDaysInMonth(year, month);

  const queries: Array<Promise<{ data: unknown[] }>> = [];
  for (let day = 1; day <= days; day++) {
    const fecha = toIsoDate(year, month, day);
    queries.push(
      GastoEntity.query.byFecha({ fecha }).go() as Promise<{ data: unknown[] }>,
    );
  }

  const results = await Promise.all(queries);

  const allItems = results.flatMap((r) => r.data) as Array<GastoListadoItem>;
  const allowedChatIds = new Set(chatIds);

  return allItems
    .filter((x) => allowedChatIds.has(x.chatId))
    .sort((a, b) => {
      if (a.fecha === b.fecha) return a.createdAt.localeCompare(b.createdAt);
      return a.fecha.localeCompare(b.fecha);
    });
}
