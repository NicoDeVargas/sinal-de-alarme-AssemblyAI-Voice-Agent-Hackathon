import "server-only";
import { sql } from "@/lib/db";
import { casosPrivados } from "@/lib/casos/privado";
import { casosPublicos } from "@/lib/casos/publico";
import type { Idioma } from "@/lib/i18n";
import { corrigir } from "@/lib/estudo/corrigir";
import type { Assunto, Avaliacao, CasoId, Correcao, Encaminhamento, Evento, Papel } from "@/lib/casos/tipos";

export interface LinhaSessao {
  id: string;
  papel: Papel;
  caso_1: CasoId;
  caso_2: CasoId;
  encaminhamento_1: Encaminhamento | null;
  encaminhamento_2: Encaminhamento | null;
  preparo: number | null;
  tokens: number;
  preceptor_segundos: number | null;
  idioma: Idioma;
}

export async function carregarSessao(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [linha] = await sql<LinhaSessao[]>`select id, papel, caso_1, caso_2, encaminhamento_1, encaminhamento_2, preparo, tokens, preceptor_segundos, idioma from sessoes where id = ${id}`;
  return linha ?? null;
}

export async function carregarEventos(sessaoId: string, atendimento: 1 | 2): Promise<Evento[]> {
  const linhas = await sql<{ assunto: Assunto; sinal: string | null; ultima_fala: string; criado_em: Date }[]>`
    select assunto, sinal, ultima_fala, criado_em from eventos where sessao_id = ${sessaoId} and atendimento = ${atendimento}`;
  return linhas.map((l) => ({ assunto: l.assunto, achado: l.sinal, ultimaFala: l.ultima_fala, criadoEm: l.criado_em.toISOString() }));
}

export async function carregarAvaliacao(sessaoId: string, atendimento: 1 | 2): Promise<Avaliacao | null> {
  const [linha] = await sql<{ resultado: Avaliacao | null }[]>`
    select resultado from avaliacoes where sessao_id = ${sessaoId} and atendimento = ${atendimento}`;
  return linha?.resultado ?? null;
}

export async function carregarEventosEm(sessaoIds: string[]): Promise<Map<string, Evento[]>> {
  const mapa = new Map<string, Evento[]>();
  if (sessaoIds.length === 0) return mapa;
  const linhas = await sql<{ sessao_id: string; atendimento: 1 | 2; assunto: Assunto; sinal: string | null; ultima_fala: string; criado_em: Date }[]>`
    select sessao_id, atendimento, assunto, sinal, ultima_fala, criado_em from eventos where sessao_id in ${sql(sessaoIds)}`;
  for (const l of linhas) {
    const chave = `${l.sessao_id}:${l.atendimento}`;
    const evento: Evento = { assunto: l.assunto, achado: l.sinal, ultimaFala: l.ultima_fala, criadoEm: l.criado_em.toISOString() };
    mapa.set(chave, [...(mapa.get(chave) ?? []), evento]);
  }
  return mapa;
}

export async function carregarAvaliacoesEm(sessaoIds: string[]): Promise<Map<string, Avaliacao>> {
  const mapa = new Map<string, Avaliacao>();
  if (sessaoIds.length === 0) return mapa;
  const linhas = await sql<{ sessao_id: string; atendimento: 1 | 2; resultado: Avaliacao | null }[]>`
    select sessao_id, atendimento, resultado from avaliacoes where sessao_id in ${sql(sessaoIds)}`;
  for (const l of linhas) if (l.resultado) mapa.set(`${l.sessao_id}:${l.atendimento}`, l.resultado);
  return mapa;
}

async function correcaoDe(s: LinhaSessao, n: 1 | 2): Promise<Correcao | null> {
  const escolhido = n === 1 ? s.encaminhamento_1 : s.encaminhamento_2;
  if (!escolhido) return null;
  const id = casoDoAtendimento(s, n);
  return corrigir(casosPrivados(s.idioma)[id], casosPublicos(s.idioma)[id], await carregarEventos(s.id, n), escolhido, await carregarAvaliacao(s.id, n), s.idioma);
}

export async function correcoesDa(s: LinhaSessao): Promise<[Correcao | null, Correcao | null]> {
  return [await correcaoDe(s, 1), await correcaoDe(s, 2)];
}

export function casoDoAtendimento(s: LinhaSessao, n: 1 | 2): CasoId {
  return n === 1 ? s.caso_1 : s.caso_2;
}

export function decidido(s: LinhaSessao, n: 1 | 2) {
  return (n === 1 ? s.encaminhamento_1 : s.encaminhamento_2) !== null;
}
