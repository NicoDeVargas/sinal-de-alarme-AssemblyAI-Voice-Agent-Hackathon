import type { Assunto, CasoPrivado } from "@/lib/casos/tipos";

export function resolverFicha(caso: CasoPrivado, assunto: Assunto) {
  const entrada = caso.ficha[assunto];
  if (!entrada) return { resposta: caso.respostaNormal, achado: null };
  return { resposta: entrada.fato, achado: entrada.achado ?? null };
}
