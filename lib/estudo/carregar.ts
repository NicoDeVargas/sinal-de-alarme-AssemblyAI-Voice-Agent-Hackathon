import "server-only";
import { sql } from "@/lib/db";
import { CASOS_PRIVADOS } from "@/lib/casos/privado";
import { corrigir } from "@/lib/estudo/corrigir";
import type { Assunto, CasoId, Correcao, Encaminhamento, Evento, Papel } from "@/lib/casos/tipos";

export interface LinhaSessao {
  id: string;
  papel: Papel;
  caso_1: CasoId;
  caso_2: CasoId;
  encaminhamento_1: Encaminhamento | null;
  encaminhamento_2: Encaminhamento | null;
  preparo: number | null;
  tokens: number;
}

export async function carregarSessao(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [linha] = await sql<LinhaSessao[]>`select id, papel, caso_1, caso_2, encaminhamento_1, encaminhamento_2, preparo, tokens from sessoes where id = ${id}`;
  return linha ?? null;
}

export async function carregarEventos(sessaoId: string, atendimento: 1 | 2): Promise<Evento[]> {
  const linhas = await sql<{ assunto: Assunto; sinal: string | null; ultima_fala: string; criado_em: Date }[]>`
    select assunto, sinal, ultima_fala, criado_em from eventos where sessao_id = ${sessaoId} and atendimento = ${atendimento}`;
  return linhas.map((l) => ({ assunto: l.assunto, achado: l.sinal, ultimaFala: l.ultima_fala, criadoEm: l.criado_em.toISOString() }));
}

export async function correcoesDa(s: LinhaSessao): Promise<[Correcao | null, Correcao | null]> {
  const c1 = s.encaminhamento_1 ? corrigir(CASOS_PRIVADOS[s.caso_1], await carregarEventos(s.id, 1), s.encaminhamento_1) : null;
  const c2 = s.encaminhamento_2 ? corrigir(CASOS_PRIVADOS[s.caso_2], await carregarEventos(s.id, 2), s.encaminhamento_2) : null;
  return [c1, c2];
}

export function casoDoAtendimento(s: LinhaSessao, n: 1 | 2): CasoId {
  return n === 1 ? s.caso_1 : s.caso_2;
}

export function decidido(s: LinhaSessao, n: 1 | 2) {
  return (n === 1 ? s.encaminhamento_1 : s.encaminhamento_2) !== null;
}
