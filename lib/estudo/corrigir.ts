import { anamnese as listaAnamnese, type Avaliacao, type CasoPrivado, type CasoPublico, type Correcao, type Encaminhamento, type Evento } from "@/lib/casos/tipos";
import type { Idioma } from "@/lib/i18n";

const proporcao = (feitos: number, total: number) => (total === 0 ? 0 : feitos / total);

export function corrigir(caso: CasoPrivado, publico: CasoPublico, eventos: Evento[], escolhido: Encaminhamento, avaliacao: Avaliacao | null, idioma: Idioma): Correcao {
  const ordenados = [...eventos].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  const achados = caso.achados.map((a) => {
    const primeiro = ordenados.find((e) => e.achado === a.id);
    return { id: a.id, nome: a.nome, feito: !!primeiro, evidencia: primeiro ? primeiro.ultimaFala : a.perguntaModelo };
  });
  const anamnese = listaAnamnese(idioma).map((a) => {
    const primeiro = ordenados.find((e) => a.assuntos.includes(e.assunto));
    return { id: a.id, nome: a.nome, feito: !!primeiro, evidencia: primeiro ? primeiro.ultimaFala : a.perguntaModelo };
  });
  const acertou = escolhido === caso.encaminhamento;
  const orientacoes = avaliacao ? avaliacao.orientacoes.map((o) => ({ id: o.id, nome: o.nome, feito: o.cumprida, evidencia: o.citacao })) : null;
  const partes = {
    achados: 40 * proporcao(achados.filter((a) => a.feito).length, achados.length),
    encaminhamento: acertou ? 20 : 0,
    anamnese: 15 * proporcao(anamnese.filter((a) => a.feito).length, anamnese.length),
    orientacoes: orientacoes ? 15 * proporcao(orientacoes.filter((o) => o.feito).length, orientacoes.length) : null,
    pergunta: avaliacao ? (avaliacao.respostaPaciente.correta ? 10 : 0) : null,
  };
  const notaDeterministica = Math.round(((partes.achados + partes.encaminhamento + partes.anamnese) / 75) * 100);
  const nota = avaliacao
    ? Math.round(partes.achados + partes.encaminhamento + partes.anamnese + (partes.orientacoes ?? 0) + (partes.pergunta ?? 0))
    : notaDeterministica;
  return {
    achados,
    anamnese,
    orientacoes,
    respostaPaciente: avaliacao
      ? {
          pergunta: publico.perguntaDoPaciente,
          correta: avaliacao.respostaPaciente.correta,
          citacao: avaliacao.respostaPaciente.citacao,
          comentario: avaliacao.respostaPaciente.comentario,
          esperada: caso.respostaEsperada,
        }
      : null,
    comunicacao: avaliacao ? avaliacao.comunicacao : [],
    escolhido,
    correto: caso.encaminhamento,
    acertou,
    motivo: caso.motivo,
    partes,
    nota,
    notaDeterministica,
  };
}
