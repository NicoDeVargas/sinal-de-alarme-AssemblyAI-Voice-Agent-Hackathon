import type { Correcao, Papel } from "@/lib/casos/tipos";

export interface SessaoCorrigida {
  papel: Papel;
  c1: Correcao;
  c2: Correcao;
  preparo: number | null;
}

export interface Painel {
  n: number;
  sinais1: number;
  sinais2: number;
  acerto1: number;
  acerto2: number;
  melhoraram: number;
  porPapel: Partial<Record<Papel, number>>;
  preparoMedio: number | null;
}

const proporcao = (c: Correcao) => (c.total === 0 ? 0 : c.descobertos / c.total);
const media = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

export function agregar(sessoes: SessaoCorrigida[]): Painel {
  const porPapel: Partial<Record<Papel, number>> = {};
  for (const s of sessoes) porPapel[s.papel] = (porPapel[s.papel] ?? 0) + 1;
  const preparos = sessoes.map((s) => s.preparo).filter((p): p is number => p !== null);
  return {
    n: sessoes.length,
    sinais1: media(sessoes.map((s) => proporcao(s.c1))),
    sinais2: media(sessoes.map((s) => proporcao(s.c2))),
    acerto1: media(sessoes.map((s) => (s.c1.acertou ? 1 : 0))),
    acerto2: media(sessoes.map((s) => (s.c2.acertou ? 1 : 0))),
    melhoraram: sessoes.filter((s) => proporcao(s.c2) > proporcao(s.c1)).length,
    porPapel,
    preparoMedio: preparos.length === 0 ? null : media(preparos),
  };
}
