import { describe, expect, it } from "vitest";
import { juntar } from "@/lib/voz/conversa";

describe("juntar", () => {
  it("junta palavras com e sem espaço vindo da API", () => {
    const comEspaco = ["Bom ", "dia, ", "meu ", "filho!"].reduce(juntar, "");
    const semEspaco = ["Bom", "dia,", "meu", "filho!"].reduce(juntar, "");
    expect(comEspaco.trim()).toBe("Bom dia, meu filho!");
    expect(semEspaco).toBe("Bom dia, meu filho!");
  });

  it("não põe espaço antes de pontuação", () => {
    expect(["Tá", "bom", "."].reduce(juntar, "")).toBe("Tá bom.");
  });
});
