import { GastoEntity, ResumenMensualEntity } from "./gasto.entity";

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

export type ResumenMensualAggregate = {
  chatId: string;
  mes: string; // YYYY-MM
  totalMes: number;
  cantidad: number;
  totalPorRubro: Record<string, number>;
  updatedAt: string;
};

export type UpsertResumenMensualInput = {
  chatId: string;
  mes: string; // YYYY-MM
  totalMes: number;
  cantidad: number;
  totalPorRubro: Record<string, number>;
  nowIso?: string;
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

async function getResumenMensualLegacy(
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

export async function getResumenMensual(
  chatIds: string[],
  mes: string,
): Promise<ResumenMensual> {
  const agg = await getResumenMensualFromAggregates(chatIds, mes);

  // Si no hay agregados aún, seguimos con el path viejo
  if (agg.cantidad === 0) {
    return getResumenMensualLegacy(chatIds, mes);
  }

  return agg;
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

export async function getListadoMensualOptimized(
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

  // Generar todas las fechas del mes
  const fechas: string[] = [];
  for (let day = 1; day <= days; day++) {
    fechas.push(toIsoDate(year, month, day));
  }

  // Batch de 5 fechas por vez (reduce de 31 queries a ~6-7)
  const batchSize = 5;
  const allItems: GastoListadoItem[] = [];

  for (let i = 0; i < fechas.length; i += batchSize) {
    const batch = fechas.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((fecha) =>
        GastoEntity.query
          .byFecha({ fecha })
          .go()
          .then((r) => (r.data as GastoListadoItem[]) ?? []),
      ),
    );
    allItems.push(...batchResults.flat());
  }

  const allowedChatIds = new Set(chatIds);

  return allItems
    .filter((x) => allowedChatIds.has(x.chatId))
    .sort((a, b) => {
      if (a.fecha === b.fecha) return a.createdAt.localeCompare(b.createdAt);
      return a.fecha.localeCompare(b.fecha);
    });
}
export async function upsertResumenMensual(
  input: UpsertResumenMensualInput,
): Promise<void> {
  assertMesFormato(input.mes);

  const nowIso = input.nowIso ?? new Date().toISOString();

  // upsert simple para P2-T1 (idempotencia/atomicidad fina se endurece en P2-T2)
  await ResumenMensualEntity.put({
    chatId: input.chatId,
    mes: input.mes,
    totalMes: input.totalMes,
    cantidad: input.cantidad,
    totalPorRubro: input.totalPorRubro,
    updatedAt: nowIso,
  }).go();
}

function mergeResumen(
  acc: ResumenMensual,
  curr: Pick<ResumenMensual, "totalMes" | "cantidad" | "totalPorRubro">,
): ResumenMensual {
  acc.totalMes += curr.totalMes;
  acc.cantidad += curr.cantidad;

  for (const [rubro, monto] of Object.entries(curr.totalPorRubro)) {
    acc.totalPorRubro[rubro] = (acc.totalPorRubro[rubro] ?? 0) + monto;
  }

  return acc;
}

export async function getResumenMensualFromAggregates(
  chatIds: string[],
  mes: string,
): Promise<ResumenMensual> {
  assertMesFormato(mes);

  if (chatIds.length === 0) {
    return { totalMes: 0, totalPorRubro: {}, cantidad: 0 };
  }

  const results = await Promise.all(
    chatIds.map(async (chatId) => {
      const response = await ResumenMensualEntity.get({ chatId, mes }).go();
      return response.data as ResumenMensualAggregate | null;
    }),
  );

  const base: ResumenMensual = { totalMes: 0, totalPorRubro: {}, cantidad: 0 };

  for (const item of results) {
    if (!item) continue;

    mergeResumen(base, {
      totalMes: item.totalMes ?? 0,
      cantidad: item.cantidad ?? 0,
      totalPorRubro: (item.totalPorRubro ?? {}) as Record<string, number>,
    });
  }

  return base;
}
export async function atomicUpdateResumenMensual(
  chatId: string,
  mes: string,
  monto: number,
  rubro: string,
  updateId: string,
): Promise<{ skipped: boolean }> {
  assertMesFormato(mes);

  const nowIso = new Date().toISOString();

  try {
    // Intentar crear el registro con updateId (condición: no existe o tiene updateId diferente)
    await ResumenMensualEntity.create({
      chatId,
      mes,
      totalMes: monto,
      cantidad: 1,
      totalPorRubro: { [rubro]: monto },
      updatedAt: nowIso,
      lastUpdateId: updateId,
    })
      .where((attr, { ne }) => `${attr.lastUpdateId} ${ne} "${updateId}"`)
      .go();

    return { skipped: false };
  } catch (err) {
    const isConditionalCheckFailed =
      err instanceof Error &&
      (err.message.includes("ConditionalCheckFailedException") ||
        err.name === "ConditionalCheckFailedException");

    if (isConditionalCheckFailed) {
      // Ya existe con este updateId -> idempotencia, ignorar
      return { skipped: true };
    }
    throw err;
  }
}

function assertMesFormato(mes: string): void {
  const match = /^(\d{4})-(\d{2})$/.exec(mes);
  if (!match) throw new Error("Mes inválido. Formato esperado YYYY-MM");

  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new Error("Mes inválido. Formato esperado YYYY-MM");
  }
}
