import type { GastoListadoItem, ResumenMensual } from "../db/gasto.repo";
import { formatCurrency } from "./currency.formatter";
import { formatFechaIsoADdMmYyyy } from "../utils/date.utils";

export function formatResumenMensual(
  mes: string,
  resumen: ResumenMensual,
): string {
  const rubrosOrdenados = Object.entries(resumen.totalPorRubro).sort(
    (a, b) => b[1] - a[1],
  );

  const lineasRubros =
    rubrosOrdenados.length === 0
      ? ["- Sin gastos en el mes"]
      : rubrosOrdenados.map(
          ([rubro, total]) => `- ${rubro}: ${formatCurrency(total)}`,
        );

  return [
    `Resumen ${mes}`,
    `Total: ${formatCurrency(resumen.totalMes)}`,
    `Movimientos: ${resumen.cantidad}`,
    "",
    "Por rubro:",
    ...lineasRubros,
  ].join("\n");
}

export function formatListadoMensual(
  mes: string,
  items: GastoListadoItem[],
): string {
  if (items.length === 0) {
    return `Gastos ${mes}\nSin gastos cargados en ese mes.`;
  }

  const lineas = items.map((item) => {
    const fecha = formatFechaIsoADdMmYyyy(item.fecha);
    return `${fecha} - ${item.monto} - ${item.rubroNormalizado} - ${item.descripcion}`;
  });

  return [`Gastos ${mes}`, ...lineas].join("\n");
}
