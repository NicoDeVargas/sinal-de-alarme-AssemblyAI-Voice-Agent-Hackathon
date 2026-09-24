import type { CasoPrivado, Correcao, Encaminhamento, Evento } from "@/lib/casos/tipos";

export function corrigir(caso: CasoPrivado, eventos: Evento[], escolhido: Encaminhamento): Correcao {
  const ordenados = [...eventos].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  const sinais = caso.sinais.map((s) => {
    const primeiro = ordenados.find((e) => e.sinal === s.id);
    return primeiro
      ? { id: s.id, nome: s.nome, descoberto: true, evidencia: primeiro.ultimaFala }
      : { id: s.id, nome: s.nome, descoberto: false, evidencia: s.perguntaModelo };
  });
  return {
    sinais,
    descobertos: sinais.filter((s) => s.descoberto).length,
    total: sinais.length,
    escolhido,
    correto: caso.encaminhamento,
    acertou: escolhido === caso.encaminhamento,
    motivo: caso.motivo,
  };
}
