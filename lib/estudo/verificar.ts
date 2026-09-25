import { orientacoes as listaOrientacoes, type Avaliacao, type AvaliacaoBruta, type Fala } from "@/lib/casos/tipos";
import type { Idioma } from "@/lib/i18n";
import { normalizar } from "@/lib/estudo/normalizar";

const NAO_LATINO = /[^\p{Script=Latin}\P{L}]/u;

function mapear(texto: string) {
  let normal = "";
  const inicio: number[] = [];
  const fim: number[] = [];
  let i = 0;
  for (const c of texto) {
    const limpo = c.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    if (!limpo) {
      i += c.length;
      continue;
    }
    if (/^[\p{L}\p{N}]+$/u.test(limpo)) {
      for (const d of limpo) {
        normal += d;
        inicio.push(i);
        fim.push(i + c.length);
      }
    } else if (normal && !normal.endsWith(" ")) {
      normal += " ";
      inicio.push(i);
      fim.push(i + c.length);
    }
    i += c.length;
  }
  if (normal.endsWith(" ")) {
    normal = normal.slice(0, -1);
    inicio.pop();
    fim.pop();
  }
  return { texto, normal, inicio, fim };
}

export function verificar(bruta: AvaliacaoBruta, falas: Fala[], idioma: Idioma): Avaliacao {
  const ditas = falas.filter((f) => f.quem === "profissional").map((f) => mapear(f.texto));
  const original = (citacao: string) => {
    const n = normalizar(citacao);
    if (n.length < 8 || n.split(" ").length < 2) return null;
    for (const d of ditas) {
      const k = ` ${d.normal} `.indexOf(` ${n} `);
      if (k >= 0) return d.texto.slice(d.inicio[k], d.fim[k + n.length - 1]);
    }
    return null;
  };
  const valida = (citacao: string) => original(citacao) !== null;
  const orientacoes = listaOrientacoes(idioma).map((o) => {
    const b = bruta.orientacoes.find((x) => x.id === o.id);
    const cumprida = !!b && b.cumprida && valida(b.citacao);
    return { id: o.id, nome: o.nome, cumprida, citacao: cumprida ? original(b.citacao) : null };
  });
  const r = bruta.respostaPaciente;
  const citacaoR = original(r.citacao);
  const citacaoValida = citacaoR !== null;
  const comentario = r.comentario.trim();
  return {
    orientacoes,
    respostaPaciente: {
      correta: r.respondeu && r.correta && citacaoValida,
      citacao: citacaoR,
      comentario: NAO_LATINO.test(comentario) ? "" : comentario,
    },
    comunicacao: bruta.comunicacao
      .map((c) => ({ ...c, texto: c.texto.trim(), citacao: original(c.citacao) ?? "" }))
      .filter((c) => c.texto !== "" && !NAO_LATINO.test(c.texto) && c.citacao !== ""),
  };
}
