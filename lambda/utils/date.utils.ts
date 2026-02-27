export function getMesActual(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function isMesValido(mes: string): boolean {
  const match = /^(\d{4})-(\d{2})$/.exec(mes);
  if (!match) return false;

  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

export function normalizeMesInput(mesRaw: string): string {
  return mesRaw.replace("/", "-");
}

export function formatFechaIsoADdMmYyyy(fechaIso: string): string {
  const [year, month, day] = fechaIso.split("-");
  if (!year || !month || !day) return fechaIso;
  return `${day}/${month}/${year}`;
}
