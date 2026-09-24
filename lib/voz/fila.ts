export function criarFila(enviar: (msg: object) => void) {
  let ocupado = false;
  const aguardando = new Set<string>();
  const prontos: { call_id: string; result: string }[] = [];

  function drenar() {
    if (ocupado) return;
    for (const p of prontos.splice(0)) enviar({ type: "tool.result", call_id: p.call_id, result: p.result });
  }

  return {
    evento(tipo: string, status?: string) {
      if (tipo === "reply.started" || tipo === "input.speech.started") ocupado = true;
      if (tipo === "reply.done") {
        ocupado = false;
        if (status === "interrupted") {
          aguardando.clear();
          prontos.length = 0;
        } else drenar();
      }
    },
    chamada(callId: string) {
      aguardando.add(callId);
    },
    resultado(callId: string, result: string) {
      if (!aguardando.delete(callId)) return;
      prontos.push({ call_id: callId, result });
      drenar();
    },
  };
}
