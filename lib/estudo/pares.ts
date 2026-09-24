import type { CasoId } from "@/lib/casos/tipos";

export const PARES: [CasoId, CasoId][] = [
  ["davi", "joaquim"],
  ["joaquim", "davi"],
  ["davi", "rafa"],
  ["rafa", "davi"],
  ["joaquim", "rafa"],
  ["rafa", "joaquim"],
];

export function escolherPar(contagens: Record<string, number>): [CasoId, CasoId] {
  let melhor = PARES[0];
  for (const par of PARES) {
    if ((contagens[par.join(">")] ?? 0) < (contagens[melhor.join(">")] ?? 0)) melhor = par;
  }
  return melhor;
}
