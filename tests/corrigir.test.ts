import { describe, expect, it } from "vitest";
import { CASOS_PRIVADOS } from "@/lib/casos/privado";
import { CASOS_PUBLICOS } from "@/lib/casos/publico";
import { corrigir } from "@/lib/estudo/corrigir";
import { agregar } from "@/lib/estudo/agregar";
import { ANAMNESE, type Avaliacao, type Correcao, type Evento } from "@/lib/casos/tipos";

const juliana = CASOS_PRIVADOS.juliana;
const julianaPublico = CASOS_PUBLICOS.juliana;

function evento(p: Partial<Evento>): Evento {
  return { assunto: "outro", achado: null, ultimaFala: "", criadoEm: "2026-09-25T10:00:00Z", ...p };
}

const eventos: Evento[] = [
  evento({ assunto: "gestacao", achado: "gestacao", ultimaFala: "ela está grávida?", criadoEm: "2026-09-25T10:03:00Z" }),
  evento({ assunto: "gestacao", achado: "gestacao", ultimaFala: "ela pode estar grávida?", criadoEm: "2026-09-25T10:02:00Z" }),
  evento({ assunto: "urina", ultimaFala: "tá fazendo xixi?", criadoEm: "2026-09-25T10:05:00Z" }),
  evento({ assunto: "alimentacao_hidratacao", ultimaFala: "tá bebendo água?", criadoEm: "2026-09-25T10:04:00Z" }),
  evento({ assunto: "evolucao_da_febre", ultimaFala: "desde quando a febre?", criadoEm: "2026-09-25T10:01:00Z" }),
];

const avaliacao: Avaliacao = {
  orientacoes: [
    { id: "hidratacao_oral", nome: "Hidratação oral", cumprida: true, citacao: "beba bastante água" },
    { id: "sem_aas_aine", nome: "Sem AAS ou anti-inflamatório", cumprida: true, citacao: "não dê remédio de gripe" },
    { id: "sinais_de_retorno", nome: "Sinais para procurar ajuda", cumprida: false, citacao: null },
    { id: "para_onde_e_quando", nome: "Para onde ir e quando", cumprida: false, citacao: null },
  ],
  respostaPaciente: { correta: true, citacao: "não dê remédio de gripe", comentario: "Evitou o antigripal." },
  comunicacao: [{ tipo: "positivo", texto: "Linguagem simples", citacao: "beba bastante água" }],
};

describe("corrigir", () => {
  it("juliana com avaliação: partes, itens e nota exatos", () => {
    const c = corrigir(juliana, julianaPublico, eventos, "A", avaliacao);
    expect(c.achados).toEqual([{ id: "gestacao", nome: "Gestante (grupo de risco)", feito: true, evidencia: "ela pode estar grávida?" }]);
    expect(c.anamnese).toEqual([
      { id: "dia_da_doenca", nome: ANAMNESE[0].nome, feito: true, evidencia: "desde quando a febre?" },
      { id: "hidratacao", nome: ANAMNESE[1].nome, feito: true, evidencia: "tá bebendo água?" },
      { id: "doencas_remedios", nome: ANAMNESE[2].nome, feito: false, evidencia: ANAMNESE[2].perguntaModelo },
    ]);
    expect(c.orientacoes).toEqual([
      { id: "hidratacao_oral", nome: "Hidratação oral", feito: true, evidencia: "beba bastante água" },
      { id: "sem_aas_aine", nome: "Sem AAS ou anti-inflamatório", feito: true, evidencia: "não dê remédio de gripe" },
      { id: "sinais_de_retorno", nome: "Sinais para procurar ajuda", feito: false, evidencia: null },
      { id: "para_onde_e_quando", nome: "Para onde ir e quando", feito: false, evidencia: null },
    ]);
    expect(c.respostaPaciente).toEqual({
      pergunta: julianaPublico.perguntaDoPaciente,
      correta: true,
      citacao: "não dê remédio de gripe",
      comentario: "Evitou o antigripal.",
      esperada: juliana.respostaEsperada,
    });
    expect(c.comunicacao).toEqual(avaliacao.comunicacao);
    expect(c.escolhido).toBe("A");
    expect(c.correto).toBe("B");
    expect(c.acertou).toBe(false);
    expect(c.motivo).toBe(juliana.motivo);
    expect(c.partes).toEqual({ achados: 40, encaminhamento: 0, anamnese: 10, orientacoes: 7.5, pergunta: 10 });
    expect(c.nota).toBe(68);
    expect(c.notaDeterministica).toBe(67);
  });

  it("juliana sem avaliação: orientações e pergunta nulas, nota determinística", () => {
    const c = corrigir(juliana, julianaPublico, eventos, "A", null);
    expect(c.orientacoes).toBeNull();
    expect(c.respostaPaciente).toBeNull();
    expect(c.comunicacao).toEqual([]);
    expect(c.partes).toEqual({ achados: 40, encaminhamento: 0, anamnese: 10, orientacoes: null, pergunta: null });
    expect(c.notaDeterministica).toBe(67);
    expect(c.nota).toBe(67);
  });

  it("sem eventos nada é feito e o achado perdido mostra a pergunta modelo", () => {
    const c = corrigir(juliana, julianaPublico, [], "B", null);
    expect(c.achados).toEqual([{ id: "gestacao", nome: "Gestante (grupo de risco)", feito: false, evidencia: juliana.achados[0].perguntaModelo }]);
    expect(c.anamnese.every((a) => !a.feito)).toBe(true);
    expect(c.acertou).toBe(true);
    expect(c.partes).toEqual({ achados: 0, encaminhamento: 20, anamnese: 0, orientacoes: null, pergunta: null });
    expect(c.nota).toBe(27);
  });
});

describe("agregar", () => {
  const c = (nota: number, feitos: number, total: number, acertou: boolean): Correcao => {
    const base = corrigir(juliana, julianaPublico, [], "B", null);
    const achados = Array.from({ length: total }, (_, i) => ({ id: `a${i}`, nome: "", feito: i < feitos, evidencia: "" }));
    return { ...base, nota, achados, acertou };
  };

  it("calcula médias de nota, achados, acerto, melhoras, preceptor e papéis", () => {
    const p = agregar([
      { papel: "acs", c1: c(40, 0, 2, false), c2: c(90, 2, 2, true), preparo: 5, fezPreceptor: true },
      { papel: "estudante_medicina", c1: c(60, 1, 2, true), c2: c(50, 1, 2, true), preparo: 3, fezPreceptor: false },
    ]);
    expect(p).toEqual({
      n: 2,
      nota1: 50,
      nota2: 70,
      achados1: 0.25,
      achados2: 0.75,
      acerto1: 0.5,
      acerto2: 1,
      melhoraram: 1,
      fizeramPreceptor: 1,
      porPapel: { acs: 1, estudante_medicina: 1 },
      preparoMedio: 4,
    });
  });

  it("sem sessões devolve zeros e preparo nulo", () => {
    expect(agregar([])).toEqual({
      n: 0,
      nota1: 0,
      nota2: 0,
      achados1: 0,
      achados2: 0,
      acerto1: 0,
      acerto2: 0,
      melhoraram: 0,
      fizeramPreceptor: 0,
      porPapel: {},
      preparoMedio: null,
    });
  });
});
