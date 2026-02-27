import { splitTelegramMessage } from "../../../lambda/telegram/telegram.client";

describe("telegram.client splitTelegramMessage", () => {
  test("no corta mensajes cortos", () => {
    const chunks = splitTelegramMessage("hola mundo", 20);
    expect(chunks).toEqual(["hola mundo"]);
  });

  test("corta por líneas cuando excede el límite", () => {
    const text = ["linea uno", "linea dos", "linea tres"].join("\n");
    const chunks = splitTelegramMessage(text, 18);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("\n")).toContain("linea uno");
    expect(chunks.join("\n")).toContain("linea dos");
    expect(chunks.join("\n")).toContain("linea tres");
  });

  test("corta una línea individualmente si supera el límite", () => {
    const longLine = "a".repeat(25);
    const chunks = splitTelegramMessage(longLine, 10);

    expect(chunks).toEqual(["aaaaaaaaaa", "aaaaaaaaaa", "aaaaa"]);
  });
});
