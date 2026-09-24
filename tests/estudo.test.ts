import { describe, expect, it } from "vitest";
import { CASOS_PRIVADOS } from "@/lib/casos/privado";
import { resolverFicha } from "@/lib/estudo/ficha";
import { corrigir } from "@/lib/estudo/corrigir";
import { PARES, parDaVez } from "@/lib/estudo/pares";
import { agregar } from "@/lib/estudo/agregar";
import type { Evento } from "@/lib/casos/tipos";

const rafa = CASOS_PRIVADOS.rafa;

function evento(p: Partial<Evento>): Evento {
  return { assunto: "outro", sinal: null, ultimaFala: "", criadoEm: "2026-09-25T10:00:00Z", ...p };
}

describe("resolverFicha", () => {
  it("devolve o fato e o sinal quando o assunto tem entrada", () => {
    expect(resolverFicha(rafa, "sangramento")).toEqual({ resposta: rafa.ficha.sangramento!.fato, sinal: "sangramento_mucosa" });
  });
  it("devolve o fato sem sinal para entrada comum", () => {
    expect(resolverFicha(rafa, "idade")).toEqual({ resposta: "Vinte e dois.", sinal: null });
  });
  it("devolve a resposta normal quando o assunto não tem entrada", () => {
    expect(resolverFicha(rafa, "urina")).toEqual({ resposta: rafa.respostaNormal, sinal: null });
  });
});

describe("corrigir", () => {
  it("marca descoberto com a primeira fala que revelou o sinal", () => {
    const eventos = [
      evento({ assunto: "sangramento", sinal: "sangramento_mucosa", ultimaFala: "sangrou alguma coisa?", criadoEm: "2026-09-25T10:02:00Z" }),
      evento({ assunto: "sangramento", sinal: "sangramento_mucosa", ultimaFala: "a gengiva sangra?", criadoEm: "2026-09-25T10:01:00Z" }),
    ];
    const c = corrigir(rafa, eventos, "B");
    expect(c.sinais[0]).toEqual({ id: "sangramento_mucosa", nome: rafa.sinais[0].nome, descoberto: true, evidencia: "a gengiva sangra?" });
    expect(c.sinais[1]).toEqual({ id: "dor_abdominal", nome: rafa.sinais[1].nome, descoberto: false, evidencia: rafa.sinais[1].perguntaModelo });
    expect(c.descobertos).toBe(1);
    expect(c.total).toBe(2);
    expect(c.acertou).toBe(false);
    expect(c.correto).toBe("C");
    expect(c.escolhido).toBe("B");
    expect(c.motivo).toBe(rafa.motivo);
  });
  it("sem eventos, nada é descoberto", () => {
    const c = corrigir(rafa, [], "C");
    expect(c.descobertos).toBe(0);
    expect(c.acertou).toBe(true);
  });
});

describe("pares", () => {
  it("tem as 6 permutações distintas dos 3 casos", () => {
    const chaves = new Set(PARES.map((p) => p.join(">")));
    expect(chaves.size).toBe(6);
    for (const [a, b] of PARES) expect(a).not.toBe(b);
  });
  it("faz rodízio pelo número da sessão", () => {
    expect(parDaVez(0)).toEqual(PARES[0]);
    expect(parDaVez(7)).toEqual(PARES[1]);
  });
});

describe("agregar", () => {
  const c = (descobertos: number, total: number, acertou: boolean) => ({ ...corrigir(rafa, [], "C"), descobertos, total, acertou });
  it("calcula médias, acertos, melhoras e papéis", () => {
    const p = agregar([
      { papel: "acs", c1: c(0, 2, false), c2: c(2, 2, true), preparo: 5 },
      { papel: "estudante_medicina", c1: c(1, 2, true), c2: c(1, 2, true), preparo: 3 },
    ]);
    expect(p).toEqual({
      n: 2,
      sinais1: 0.25,
      sinais2: 0.75,
      acerto1: 0.5,
      acerto2: 1,
      melhoraram: 1,
      porPapel: { acs: 1, estudante_medicina: 1 },
      preparoMedio: 4,
    });
  });
  it("sem sessões devolve zeros e preparo nulo", () => {
    expect(agregar([])).toEqual({ n: 0, sinais1: 0, sinais2: 0, acerto1: 0, acerto2: 0, melhoraram: 0, porPapel: {}, preparoMedio: null });
  });
});
