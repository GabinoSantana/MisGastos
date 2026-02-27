import { parseCommand } from "../../../lambda/commands/command.parser";

describe("parseCommand", () => {
  test("detecta comando resumen mes", () => {
    expect(parseCommand("resumen mes")).toEqual({ type: "resumen_mes" });
  });

  test("detecta gastos mes sin mes explícito", () => {
    expect(parseCommand("gastos mes")).toEqual({
      type: "gastos_mes",
      mesRaw: undefined,
    });
  });

  test("detecta gastos mes con YYYY-MM", () => {
    expect(parseCommand("gastos mes 2026-02")).toEqual({
      type: "gastos_mes",
      mesRaw: "2026-02",
    });
  });

  test("detecta gastos mes con YYYY/MM", () => {
    expect(parseCommand("gastos mes 2026/02")).toEqual({
      type: "gastos_mes",
      mesRaw: "2026/02",
    });
  });

  test("rutea a create_gasto para cualquier otro texto", () => {
    expect(parseCommand("18/02, 1250, Comida, Cena")).toEqual({
      type: "create_gasto",
    });
  });
});
