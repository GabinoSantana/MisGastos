export type ParsedCommand =
  | { type: "gastos_mes"; mesRaw?: string }
  | { type: "resumen_mes" }
  | { type: "create_gasto" };

export function parseCommand(text: string): ParsedCommand {
  const normalizedText = text.trim().toLowerCase();

  const gastosMesMatch = normalizedText.match(
    /^gastos mes(?:\s+(\d{4}[-/]\d{2}))?$/,
  );

  if (gastosMesMatch) {
    return { type: "gastos_mes", mesRaw: gastosMesMatch[1] };
  }

  if (normalizedText === "resumen mes") {
    return { type: "resumen_mes" };
  }

  return { type: "create_gasto" };
}
