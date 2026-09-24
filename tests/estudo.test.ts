import { describe, expect, it } from "vitest";
import { CASOS_PRIVADOS } from "@/lib/casos/privado";
import { resolverFicha } from "@/lib/estudo/ficha";
import { PARES, escolherPar } from "@/lib/estudo/pares";
import { CASO_IDS } from "@/lib/casos/tipos";

const rafa = CASOS_PRIVADOS.rafa;

describe("resolverFicha", () => {
  it("devolve o fato e o achado quando o assunto tem entrada", () => {
    expect(resolverFicha(rafa, "sangramento")).toEqual({ resposta: rafa.ficha.sangramento!.fato, achado: "sangramento_mucosa" });
  });
  it("devolve o fato sem achado para entrada comum", () => {
    expect(resolverFicha(rafa, "idade")).toEqual({ resposta: "Vinte e dois.", achado: null });
  });
  it("devolve a resposta normal quando o assunto não tem entrada", () => {
    expect(resolverFicha(rafa, "urina")).toEqual({ resposta: rafa.respostaNormal, achado: null });
  });
});

describe("pares", () => {
  it("tem as 20 permutações distintas dos 5 casos, na ordem de CASO_IDS", () => {
    const chaves = new Set(PARES.map((p) => p.join(">")));
    expect(chaves.size).toBe(20);
    expect(PARES.length).toBe(20);
    for (const [a, b] of PARES) expect(a).not.toBe(b);
    const esperado: [string, string][] = [];
    for (const a of CASO_IDS) for (const b of CASO_IDS) if (a !== b) esperado.push([a, b]);
    expect(PARES).toEqual(esperado);
  });
  it("sem contagens escolhe o primeiro par", () => {
    expect(escolherPar({})).toEqual(PARES[0]);
  });
  it("escolhe o par menos usado", () => {
    const contagens = Object.fromEntries(PARES.map((p) => [p.join(">"), 3]));
    contagens[PARES[3].join(">")] = 1;
    expect(escolherPar(contagens)).toEqual(PARES[3]);
  });
  it("no empate segue a ordem dos pares", () => {
    const contagens = Object.fromEntries(PARES.map((p) => [p.join(">"), 2]));
    contagens[PARES[1].join(">")] = 1;
    expect(escolherPar(contagens)).toEqual(PARES[1]);
  });
});
