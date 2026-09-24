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
  const ctx = new AudioContext();
  ctx.resume();
  aoEstado("conectando");
  let config: unknown;
  try {
    config = await json(`/api/sessoes/${sessaoId}/atendimentos/${atendimento}/config`);
  } catch (e) {
    ctx.close();
    throw e;
  }
  let pronto = false;
  let encerrado = false;
  let ultimaFala = "";
  let ws: WebSocket | null = null;
  let audio: Awaited<ReturnType<typeof abrirAudio>>;
  try {
    audio = await abrirAudio(ctx, (b64) => {
      if (pronto && ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "input.audio", audio: b64 }));
    });
  } catch {
    ctx.close();
    aoEstado("erro", "Sem acesso ao microfone. Libere o microfone no navegador e tente de novo.");
    throw new Error("microfone");
  }
  let socket: WebSocket;
  try {
    const { token } = await json("/api/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessaoId }),
    });
    const url = new URL("wss://agents.assemblyai.com/v1/ws");
    url.searchParams.set("token", token);
    socket = new WebSocket(url);
  } catch (e) {
    audio.fechar();
    aoEstado("erro", (e as Error).message);
    throw e;
  }
  ws = socket;
  const fila = criarFila((m) => socket.send(JSON.stringify(m)));

  function fechar(estado: EstadoConversa, detalhe?: string, avisar = false) {
    if (encerrado) return;
    encerrado = true;
    window.removeEventListener("pagehide", aoSair);
    if (avisar && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "session.end" }));
    socket.close();
    audio.fechar();
    aoEstado(estado, detalhe);
  }

  socket.onopen = () => socket.send(JSON.stringify({ type: "session.update", session: config }));
  socket.onclose = () => fechar("erro", "A conexão caiu.");
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
          body: JSON.stringify({ sessaoId, atendimento, assunto: msg.arguments.assunto, ultimaFala: ultimaFala.slice(0, 1000) }),
        });
        fila.resultado(msg.call_id, JSON.stringify({ resposta }));
      } catch {
        fila.resultado(msg.call_id, JSON.stringify({ erro: "Não foi possível lembrar agora. Peça para o profissional repetir a pergunta." }));
      }
    } else if (msg.type === "session.error" || msg.type === "error") fechar("erro", msg.message ?? "Erro na conversa com o paciente.", true);
    else if (msg.type === "session.ended") fechar("encerrado");
  };

  const aoSair = () => socket.readyState === WebSocket.OPEN && socket.send(JSON.stringify({ type: "session.end" }));
  window.addEventListener("pagehide", aoSair);

  return {
    encerrar() {
      fechar("encerrado", undefined, true);
    },
  };
}
