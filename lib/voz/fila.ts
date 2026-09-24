export function criarFila(enviar: (msg: object) => void) {
  const aguardando = new Map<string, string | null>();
  const liberadas = new Set<string>();

  function mandar(callId: string, result: string) {
    enviar({ type: "tool.result", call_id: callId, result });
  }

  return {
    evento(tipo: string, status?: string) {
      if (tipo !== "reply.done") return;
      if (status !== "interrupted") {
        for (const [callId, result] of aguardando) {
          if (result === null) liberadas.add(callId);
          else mandar(callId, result);
        }
      }
      aguardando.clear();
    },
    chamada(callId: string) {
      aguardando.set(callId, null);
    },
    resultado(callId: string, result: string) {
      if (liberadas.delete(callId)) mandar(callId, result);
      else if (aguardando.has(callId)) aguardando.set(callId, result);
    },
  };
}
