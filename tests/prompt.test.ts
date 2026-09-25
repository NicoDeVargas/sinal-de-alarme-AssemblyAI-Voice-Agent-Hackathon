import { describe, expect, it } from "vitest";
import { casosPublicos } from "@/lib/casos/publico";
import { casosPrivados } from "@/lib/casos/privado";
import { montarSessao } from "@/lib/casos/prompt";
import { montarPreceptor } from "@/lib/casos/preceptor";
import { corrigir } from "@/lib/estudo/corrigir";
import { ASSUNTOS, CASO_IDS } from "@/lib/casos/tipos";
import { IDIOMAS, type Idioma } from "@/lib/i18n";

const combinacoes = IDIOMAS.flatMap((idioma) => CASO_IDS.map((id) => [idioma, id] as const));

describe("montarSessao", () => {
  it.each(combinacoes)("em %s não vaza nenhum fato ou palavra proibida do caso %s", (idioma, id) => {
    const sessao = montarSessao(casosPublicos(idioma)[id], idioma);
    const texto = `${sessao.system_prompt}\n${sessao.greeting}`.toLowerCase();
    const privado = casosPrivados(idioma)[id];
    for (const entrada of Object.values(privado.ficha)) {
      expect(texto).not.toContain(entrada!.fato.toLowerCase());
    }
    for (const palavra of privado.palavrasProibidas) {
      expect(texto).not.toContain(palavra.toLowerCase());
    }
    expect(texto).not.toContain(privado.respostaEsperada.toLowerCase());
    expect(texto).not.toContain(privado.motivo.toLowerCase());
  });

  it.each(combinacoes)("em %s a pergunta do paciente do caso %s aparece no prompt", (idioma, id) => {
    const sessao = montarSessao(casosPublicos(idioma)[id], idioma);
    expect(sessao.system_prompt).toContain(casosPublicos(idioma)[id].perguntaDoPaciente);
  });

  it("configura voz, idioma e a tool consultar_ficha com a lista fechada", () => {
    const sessao = montarSessao(casosPublicos("pt").rafa, "pt");
    expect(sessao.output.voice).toBe("rafael");
    expect(sessao.input.language_codes).toEqual(["pt"]);
    expect(sessao.tools).toHaveLength(1);
    expect(sessao.tools![0].name).toBe("consultar_ficha");
    expect(sessao.tools![0].parameters.properties.assunto.enum).toEqual([...ASSUNTOS]);
    expect(sessao.greeting).toBe(casosPublicos("pt").rafa.saudacao);
  });

  it("em inglês cada caso usa a sua voz, o idioma en e o prompt em inglês", () => {
    const vozes = Object.fromEntries(CASO_IDS.map((id) => [id, montarSessao(casosPublicos("en")[id], "en").output.voice]));
    expect(vozes).toEqual({ davi: "michael", joaquim: "george", rafa: "jane", juliana: "mary", celia: "eve" });
    const sessao = montarSessao(casosPublicos("en").davi, "en");
    expect(sessao.input.language_codes).toEqual(["en"]);
    expect(sessao.input.keyterms).toContain("fever");
    expect(sessao.system_prompt).toContain("Speak English");
    expect(sessao.tools![0].parameters.properties.assunto.enum).toEqual([...ASSUNTOS]);
    expect(casosPublicos("en").davi.perguntaDoPaciente).toBe("Can I give him some baby aspirin for the fever?");
  });

  it("em português todos os pacientes usam a voz rafael", () => {
    for (const id of CASO_IDS) expect(montarSessao(casosPublicos("pt")[id], "pt").output.voice).toBe("rafael");
  });

  it.each(IDIOMAS)("em %s todo achado de cada caso tem um assunto na ficha que o revela", (idioma: Idioma) => {
    for (const id of CASO_IDS) {
      const privado = casosPrivados(idioma)[id];
      const revelados = Object.values(privado.ficha).map((e) => e!.achado).filter(Boolean);
      expect(revelados.sort()).toEqual(privado.achados.map((a) => a.id).sort());
    }
  });

  it("os dois idiomas têm os mesmos casos, achados e encaminhamentos", () => {
    for (const id of CASO_IDS) {
      const [pt, en] = [casosPrivados("pt")[id], casosPrivados("en")[id]];
      expect(Object.keys(en.ficha).sort()).toEqual(Object.keys(pt.ficha).sort());
      expect(en.achados.map((a) => [a.id, a.tipo])).toEqual(pt.achados.map((a) => [a.id, a.tipo]));
      expect(en.encaminhamento).toBe(pt.encaminhamento);
    }
  });
});

describe("montarPreceptor", () => {
  it.each(IDIOMAS)("em %s usa o idioma e a voz certos", (idioma: Idioma) => {
    const c = corrigir(casosPrivados(idioma).davi, casosPublicos(idioma).davi, [], "A", null, idioma);
    const sessao = montarPreceptor(casosPublicos(idioma).davi, c, idioma);
    expect(sessao.input.language_codes).toEqual([idioma]);
    expect(sessao.output.voice).toBe(idioma === "pt" ? "rafael" : "charles");
    expect(sessao.system_prompt).toContain(idioma === "pt" ? "Fale em português" : "Speak English");
    expect(sessao.system_prompt).toContain(c.anamnese[0].nome);
  });
});
