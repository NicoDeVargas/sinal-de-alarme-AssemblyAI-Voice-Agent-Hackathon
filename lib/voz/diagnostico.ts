export interface Diagnostico {
  micPermitido: boolean | null;
  micTrilha: string;
  micNivel: number;
  chunksEnviados: number;
  bytesEnviados: number;
  respostasIniciadas: number;
  respostasInterrompidas: number;
  respostasCompletas: number;
  audioRecebidoMs: number;
  faltasDeAudio: number;
  falaDetectada: number;
  erros: string[];
  ultimosEventos: string[];
  ctxEstado: string;
  ctxTaxa: number;
}

export const diagnostico: Diagnostico = {
  micPermitido: null,
  micTrilha: "",
  micNivel: 0,
  chunksEnviados: 0,
  bytesEnviados: 0,
  respostasIniciadas: 0,
  respostasInterrompidas: 0,
  respostasCompletas: 0,
  audioRecebidoMs: 0,
  faltasDeAudio: 0,
  falaDetectada: 0,
  erros: [],
  ultimosEventos: [],
  ctxEstado: "",
  ctxTaxa: 0,
};

const inicio = typeof performance !== "undefined" ? performance.now() : 0;
const ouvintes = new Set<() => void>();

export function assinar(fn: () => void) {
  ouvintes.add(fn);
  return () => {
    ouvintes.delete(fn);
  };
}

export function notificar() {
  ouvintes.forEach((fn) => fn());
}

export function registrarErro(msg: string) {
  diagnostico.erros = [...diagnostico.erros, msg].slice(-5);
  notificar();
}

export function registrarEvento(tipo: string) {
  const t = typeof performance !== "undefined" ? Math.round(performance.now() - inicio) : 0;
  diagnostico.ultimosEventos = [...diagnostico.ultimosEventos, `${t}ms ${tipo}`].slice(-15);
  notificar();
}
