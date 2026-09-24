import { ORIENTACOES, type Avaliacao, type AvaliacaoBruta, type Fala } from "@/lib/casos/tipos";
import { normalizar } from "@/lib/estudo/normalizar";

export function verificar(bruta: AvaliacaoBruta, falas: Fala[]): Avaliacao {
  const dito = falas
    .filter((f) => f.quem === "profissional")
    .map((f) => normalizar(f.texto))
    .join(" | ");
  const valida = (citacao: string) => {
    const n = normalizar(citacao);
    return n.length >= 3 && dito.includes(n);
  };
  const orientacoes = ORIENTACOES.map((o) => {
    const b = bruta.orientacoes.find((x) => x.id === o.id);
    const cumprida = !!b && b.cumprida && valida(b.citacao);
    return { id: o.id, nome: o.nome, cumprida, citacao: cumprida ? b.citacao : null };
  });
  const r = bruta.respostaPaciente;
  const citacaoValida = valida(r.citacao);
  return {
    orientacoes,
    respostaPaciente: {
      correta: r.respondeu && r.correta && citacaoValida,
      citacao: citacaoValida ? r.citacao : null,
      comentario: r.comentario,
    },
    comunicacao: bruta.comunicacao.filter((c) => valida(c.citacao)),
  };
}
