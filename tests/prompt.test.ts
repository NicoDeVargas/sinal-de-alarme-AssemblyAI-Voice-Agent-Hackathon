import { describe, expect, it } from "vitest";
import { CASOS_PUBLICOS } from "@/lib/casos/publico";
import { CASOS_PRIVADOS } from "@/lib/casos/privado";
import { montarSessao } from "@/lib/casos/prompt";
import { ASSUNTOS, CASO_IDS } from "@/lib/casos/tipos";

describe("montarSessao", () => {
  it.each(CASO_IDS)("não vaza nenhum fato ou palavra proibida do caso %s", (id) => {
    const sessao = montarSessao(CASOS_PUBLICOS[id]);
    const texto = `${sessao.system_prompt}\n${sessao.greeting}`.toLowerCase();
    const privado = CASOS_PRIVADOS[id];
    for (const entrada of Object.values(privado.ficha)) {
      expect(texto).not.toContain(entrada!.fato.toLowerCase());
    }
    for (const palavra of privado.palavrasProibidas) {
      expect(texto).not.toContain(palavra.toLowerCase());
    }
  });

  it.each(CASO_IDS)("a pergunta do paciente do caso %s aparece no prompt", (id) => {
    const sessao = montarSessao(CASOS_PUBLICOS[id]);
    expect(sessao.system_prompt).toContain(CASOS_PUBLICOS[id].perguntaDoPaciente);
  });

  it("configura voz, idioma e a tool consultar_ficha com a lista fechada", () => {
    const sessao = montarSessao(CASOS_PUBLICOS.rafa);
    expect(sessao.output.voice).toBe("rafael");
    expect(sessao.input.language_codes).toEqual(["pt"]);
    expect(sessao.tools).toHaveLength(1);
    expect(sessao.tools[0].name).toBe("consultar_ficha");
    expect(sessao.tools[0].parameters.properties.assunto.enum).toEqual([...ASSUNTOS]);
    expect(sessao.greeting).toBe(CASOS_PUBLICOS.rafa.saudacao);
  });

  it("todo achado de cada caso tem um assunto na ficha que o revela", () => {
    for (const id of CASO_IDS) {
      const privado = CASOS_PRIVADOS[id];
      const revelados = Object.values(privado.ficha).map((e) => e!.achado).filter(Boolean);
      expect(revelados.sort()).toEqual(privado.achados.map((a) => a.id).sort());
    }
  });
});
