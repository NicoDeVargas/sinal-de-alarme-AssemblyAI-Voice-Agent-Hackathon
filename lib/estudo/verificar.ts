import { ORIENTACOES, type Avaliacao, type AvaliacaoBruta, type Fala } from "@/lib/casos/tipos";
import { normalizar } from "@/lib/estudo/normalizar";

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

export function verificar(bruta: AvaliacaoBruta, falas: Fala[]): Avaliacao {
  const dito = ` ${falas
    .filter((f) => f.quem === "profissional")
    .map((f) => normalizar(f.texto))
    .join(" | ")} `;
  const valida = (citacao: string) => {
    const n = normalizar(citacao);
    return n.length >= 8 && n.split(" ").length >= 2 && dito.includes(` ${n} `);
  };
  const orientacoes = ORIENTACOES.map((o) => {
    const b = bruta.orientacoes.find((x) => x.id === o.id);
    const cumprida = !!b && b.cumprida && valida(b.citacao);
    return { id: o.id, nome: o.nome, cumprida, citacao: cumprida ? b.citacao : null };
  });
  const r = bruta.respostaPaciente;
  const citacaoValida = valida(r.citacao);
  const comentario = r.comentario.trim();
  return {
    orientacoes,
    respostaPaciente: {
      correta: r.respondeu && r.correta && citacaoValida,
      citacao: citacaoValida ? r.citacao : null,
      comentario: CJK.test(comentario) ? "" : comentario,
    },
    comunicacao: bruta.comunicacao
      .map((c) => ({ ...c, texto: c.texto.trim() }))
      .filter((c) => c.texto !== "" && !CJK.test(c.texto) && valida(c.citacao)),
  };
}
