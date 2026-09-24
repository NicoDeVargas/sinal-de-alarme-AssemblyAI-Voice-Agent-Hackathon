import type { CasoId } from "@/lib/casos/tipos";

export const PARES: [CasoId, CasoId][] = [
  ["davi", "joaquim"],
  ["joaquim", "davi"],
  ["davi", "rafa"],
  ["rafa", "davi"],
  ["joaquim", "rafa"],
  ["rafa", "joaquim"],
];

export function parDaVez(n: number): [CasoId, CasoId] {
  return PARES[n % PARES.length];
}
