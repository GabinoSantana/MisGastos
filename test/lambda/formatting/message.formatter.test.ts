import { formatListadoMensual, formatResumenMensual } from "../../../lambda/formatting/message.formatter";

describe("message formatter", () => {
  test("formatea resumen mensual con rubros ordenados por monto desc", () => {
    const output = formatResumenMensual("2026-02", {
      totalMes: 19000,
      cantidad: 3,
      totalPorRubro: {
        transporte: 4000,
        comida: 15000,
      },
    });

    expect(output).toContain("Resumen 2026-02");
    expect(output).toContain("Movimientos: 3");
    expect(output.indexOf("comida")).toBeLessThan(output.indexOf("transporte"));
  });

  test("formatea listado mensual en formato DD/MM/YYYY - monto - rubroNormalizado - descripcion", () => {
    const output = formatListadoMensual("2026-02", [
      {
        fecha: "2026-02-18",
        monto: 1250,
        rubro: "Comida",
        rubroNormalizado: "comida",
        descripcion: "Cena",
        chatId: "123",
        createdAt: "2026-02-18T10:00:00.000Z",
      },
    ]);

    expect(output).toContain("Gastos 2026-02");
    expect(output).toContain("18/02/2026 - 1250 - comida - Cena");
  });

  test("devuelve mensaje de vacío para listado sin datos", () => {
    const output = formatListadoMensual("2026-02", []);
    expect(output).toBe("Gastos 2026-02\nSin gastos cargados en ese mes.");
  });
});
