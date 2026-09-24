import { describe, expect, it } from "vitest";
import { normalizar } from "@/lib/estudo/normalizar";
import { verificar } from "@/lib/estudo/verificar";
import type { AvaliacaoBruta, Fala } from "@/lib/casos/tipos";

const falas: Fala[] = [
  { quem: "profissional", texto: "Boa tarde! Ela está bebendo bastante água?" },
  { quem: "paciente", texto: "Tá sim. Ela pode tomar ibuprofeno?" },
  { quem: "profissional", texto: "Não dê ibuprofeno nem AAS, só paracetamol. Leve ela hoje à UBS, com prioridade." },
];

function bruta(p: Partial<AvaliacaoBruta> = {}): AvaliacaoBruta {
  return {
    orientacoes: [],
    respostaPaciente: { respondeu: false, correta: false, citacao: "", comentario: "" },
    comunicacao: [],
    ...p,
  };
}

describe("normalizar", () => {
  it("tira acentos, pontuação, maiúsculas e espaços extras", () => {
    expect(normalizar("  Não dê   IBUPROFENO, nem AAS!  ")).toBe("nao de ibuprofeno nem aas");
  });
  it("mantém dígitos", () => {
    expect(normalizar("38,5°C")).toBe("38 5 c");
  });
});

describe("verificar", () => {
  it("aceita citação com acento e pontuação diferentes", () => {
    const a = verificar(bruta({ orientacoes: [{ id: "sem_aas_aine", cumprida: true, citacao: "nao de ibuprofeno, nem aas" }] }), falas);
    expect(a.orientacoes.find((o) => o.id === "sem_aas_aine")).toEqual({ id: "sem_aas_aine", nome: "Sem AAS ou anti-inflamatório", cumprida: true, citacao: "nao de ibuprofeno, nem aas" });
  });
  it("rejeita citação inventada", () => {
    const a = verificar(bruta({ orientacoes: [{ id: "hidratacao_oral", cumprida: true, citacao: "beba bastante soro caseiro" }] }), falas);
    expect(a.orientacoes.find((o) => o.id === "hidratacao_oral")).toEqual({ id: "hidratacao_oral", nome: "Hidratação oral", cumprida: false, citacao: null });
  });
  it("rejeita citação de fala do paciente", () => {
    const a = verificar(
      bruta({
        orientacoes: [{ id: "sem_aas_aine", cumprida: true, citacao: "Ela pode tomar ibuprofeno" }],
        respostaPaciente: { respondeu: true, correta: true, citacao: "Tá sim", comentario: "ok" },
      }),
      falas,
    );
    expect(a.orientacoes.find((o) => o.id === "sem_aas_aine")?.cumprida).toBe(false);
    expect(a.respostaPaciente).toEqual({ correta: false, citacao: null, comentario: "ok" });
  });
  it("rejeita citação curta demais", () => {
    const a = verificar(bruta({ orientacoes: [{ id: "para_onde_e_quando", cumprida: true, citacao: "à" }] }), falas);
    expect(a.orientacoes.find((o) => o.id === "para_onde_e_quando")?.cumprida).toBe(false);
  });
  it("não cita quando a orientação não foi cumprida", () => {
    const a = verificar(bruta({ orientacoes: [{ id: "para_onde_e_quando", cumprida: false, citacao: "leve ela hoje à UBS" }] }), falas);
    expect(a.orientacoes.find((o) => o.id === "para_onde_e_quando")).toEqual({ id: "para_onde_e_quando", nome: "Para onde ir e quando", cumprida: false, citacao: null });
  });
  it("descarta id desconhecido e completa ids ausentes como não cumpridos, na ordem de ORIENTACOES", () => {
    const a = verificar(
      bruta({
        orientacoes: [
          { id: "inventada", cumprida: true, citacao: "bebendo bastante água" },
          { id: "para_onde_e_quando", cumprida: true, citacao: "Leve ela hoje à UBS" },
        ],
      }),
      falas,
    );
    expect(a.orientacoes.map((o) => [o.id, o.cumprida])).toEqual([
      ["hidratacao_oral", false],
      ["sem_aas_aine", false],
      ["sinais_de_retorno", false],
      ["para_onde_e_quando", true],
    ]);
  });
  it("resposta ao paciente só é correta com resposta, acerto e citação válida", () => {
    const certa = verificar(bruta({ respostaPaciente: { respondeu: true, correta: true, citacao: "só paracetamol", comentario: "bom" } }), falas);
    expect(certa.respostaPaciente).toEqual({ correta: true, citacao: "só paracetamol", comentario: "bom" });
    const semResposta = verificar(bruta({ respostaPaciente: { respondeu: false, correta: true, citacao: "só paracetamol", comentario: "" } }), falas);
    expect(semResposta.respostaPaciente.correta).toBe(false);
    const errada = verificar(bruta({ respostaPaciente: { respondeu: true, correta: false, citacao: "só paracetamol", comentario: "" } }), falas);
    expect(errada.respostaPaciente).toEqual({ correta: false, citacao: "só paracetamol", comentario: "" });
  });
  it("remove comunicação sem citação válida", () => {
    const a = verificar(
      bruta({
        comunicacao: [
          { tipo: "positivo", texto: "Cumprimentou", citacao: "Boa tarde" },
          { tipo: "melhorar", texto: "Inventado", citacao: "fale mais devagar" },
        ],
      }),
      falas,
    );
    expect(a.comunicacao).toEqual([{ tipo: "positivo", texto: "Cumprimentou", citacao: "Boa tarde" }]);
  });
});
