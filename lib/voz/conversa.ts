import { abrirAudio } from "./audio";
import { criarFila } from "./fila";

export type EstadoConversa = "conectando" | "pronto" | "encerrado" | "erro";
export interface Linha {
  quem: "voce" | "paciente";
  texto: string;
}

interface Opcoes {
  sessaoId: string;
  atendimento: 1 | 2;
  aoFalar(linha: Linha): void;
  aoEstado(estado: EstadoConversa, detalhe?: string): void;
}

async function json(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).erro ?? `erro ${r.status}`);
  return r.json();
}

export async function iniciarConversa({ sessaoId, atendimento, aoFalar, aoEstado }: Opcoes) {
  aoEstado("conectando");
  const config = await json(`/api/sessoes/${sessaoId}/atendimentos/${atendimento}/config`);
  let pronto = false;
  let encerrado = false;
  let ultimaFala = "";
  let ws: WebSocket | null = null;
  let audio: Awaited<ReturnType<typeof abrirAudio>>;
  try {
    audio = await abrirAudio((b64) => {
      if (pronto && ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "input.audio", audio: b64 }));
    });
  } catch {
    aoEstado("erro", "Sem acesso ao microfone. Libere o microfone no navegador e tente de novo.");
    throw new Error("microfone");
  }
  const { token } = await json("/api/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessaoId }),
  });

  const url = new URL("wss://agents.assemblyai.com/v1/ws");
  url.searchParams.set("token", token);
  const socket = new WebSocket(url);
  ws = socket;
  const fila = criarFila((m) => socket.send(JSON.stringify(m)));

  function fechar() {
    if (encerrado) return;
    encerrado = true;
    audio.fechar();
    aoEstado("encerrado");
  }

  socket.onopen = () => socket.send(JSON.stringify({ type: "session.update", session: config }));
  socket.onclose = () => {
    if (!encerrado) aoEstado("erro", "A conexão caiu.");
    encerrado = true;
    audio.fechar();
  };
  socket.onmessage = async (ev) => {
    const msg = JSON.parse(ev.data);
    fila.evento(msg.type, msg.status);
    if (msg.type === "session.ready") {
      pronto = true;
      aoEstado("pronto");
    } else if (msg.type === "reply.audio") audio.tocar(msg.data);
    else if (msg.type === "reply.done" && msg.status === "interrupted") audio.silenciar();
    else if (msg.type === "transcript.user") {
      ultimaFala = msg.text;
      aoFalar({ quem: "voce", texto: msg.text });
    } else if (msg.type === "transcript.agent") aoFalar({ quem: "paciente", texto: msg.text });
    else if (msg.type === "tool.call" && msg.name === "consultar_ficha") {
      fila.chamada(msg.call_id);
      try {
        const { resposta } = await json("/api/ficha", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessaoId, atendimento, assunto: msg.arguments.assunto, ultimaFala }),
        });
        fila.resultado(msg.call_id, JSON.stringify({ resposta }));
      } catch {
        fila.resultado(msg.call_id, JSON.stringify({ erro: "Não foi possível lembrar agora. Peça para o profissional repetir a pergunta." }));
      }
    } else if (msg.type === "session.error") aoEstado("erro", msg.message);
    else if (msg.type === "session.ended") fechar();
  };

  const aoSair = () => socket.readyState === WebSocket.OPEN && socket.send(JSON.stringify({ type: "session.end" }));
  window.addEventListener("pagehide", aoSair);

  return {
    encerrar() {
      window.removeEventListener("pagehide", aoSair);
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "session.end" }));
      fechar();
    },
  };
}
