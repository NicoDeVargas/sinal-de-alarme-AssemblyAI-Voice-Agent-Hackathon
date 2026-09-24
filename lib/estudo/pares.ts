import { CASO_IDS, type CasoId } from "@/lib/casos/tipos";

export const PARES: [CasoId, CasoId][] = CASO_IDS.flatMap((a) =>
  CASO_IDS.filter((b) => b !== a).map((b): [CasoId, CasoId] => [a, b]),
);

export function escolherPar(contagens: Record<string, number>): [CasoId, CasoId] {
  let melhor = PARES[0];
  for (const par of PARES) {
    if ((contagens[par.join(">")] ?? 0) < (contagens[melhor.join(">")] ?? 0)) melhor = par;
  }
  return melhor;
}
