"use client";
import { useEffect, useRef, useState } from "react";
import { iniciarConversa, type EstadoConversa, type Linha } from "@/lib/voz/conversa";
import { assinar, diagnostico } from "@/lib/voz/diagnostico";
import { ENCAMINHAMENTOS, type CasoPublico, type Correcao, type Encaminhamento } from "@/lib/casos/tipos";

function PainelDiagnostico() {
  const [, forcar] = useState(0);
  useEffect(() => assinar(() => forcar((n) => n + 1)), []);
  return (
    <pre className="fixed bottom-2 left-2 z-50 max-w-xs whitespace-pre-wrap rounded bg-white/80 p-2 font-mono text-xs">
      {JSON.stringify(diagnostico, null, 2)}
    </pre>
  );
}

export function Atendimento({ sessaoId, atendimento, caso, aoDecidir }: { sessaoId: string; atendimento: 1 | 2; caso: CasoPublico; aoDecidir(c: Correcao): void }) {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [estado, setEstado] = useState<EstadoConversa | "parado">("parado");
  const [detalhe, setDetalhe] = useState("");
  const [decidindo, setDecidindo] = useState(false);
  const [erroDecisao, setErroDecisao] = useState("");
  const [debug, setDebug] = useState(false);
  const conversa = useRef<{ encerrar(): void } | null>(null);

  useEffect(() => {
    setDebug(new URLSearchParams(location.search).get("debug") === "1");
  }, []);

  async function comecar() {
    setDetalhe("");
    try {
      conversa.current = await iniciarConversa({
        sessaoId,
        atendimento,
        aoFalar: (l) => setLinhas((x) => (x.some((y) => y.id === l.id) ? x.map((y) => (y.id === l.id ? l : y)) : [...x, l])),
        aoEstado: (e, d) => {
          setEstado(e);
          if (d) setDetalhe(d);
        },
      });
    } catch (e) {
      setEstado("erro");
      setDetalhe((d) => d || (e as Error).message);
    }
  }

  function decidir() {
    conversa.current?.encerrar();
    setDecidindo(true);
  }

  async function escolher(encaminhamento: Encaminhamento) {
    setErroDecisao("");
    const r = await fetch("/api/decisao", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessaoId, atendimento, encaminhamento }),
    });
    if (r.ok) return aoDecidir(await r.json());
    const corpo = await r.json().catch(() => ({}));
    if (r.status === 409) {
      const sessao = await fetch(`/api/sessoes/${sessaoId}`).then((x) => (x.ok ? x.json() : null)).catch(() => null);
      const correcao = sessao?.correcoes?.[atendimento - 1];
      if (correcao) return aoDecidir(correcao);
    }
    setErroDecisao(corpo.erro ?? "Não foi possível registrar a decisão. Tente de novo.");
  }

  return (
    <section className="space-y-4">
      <p className="text-sm uppercase tracking-wide text-gray-500">Atendimento {atendimento} de 2</p>
      <h2 className="text-2xl font-bold">{caso.titulo}</h2>
      <p>{caso.contexto}</p>
      {!caso.revisadoPor && <p className="text-xs text-amber-700">Rascunho, sem revisão clínica.</p>}
      {!decidindo && estado === "parado" && (
        <button onClick={comecar} className="w-full rounded bg-red-700 p-3 font-semibold text-white">Bater na porta</button>
      )}
      {estado === "conectando" && <p>Conectando…</p>}
      {detalhe && <p className="text-red-700">{detalhe}</p>}
      <div className="space-y-2">
        {linhas.filter((l) => l.texto).map((l) => (
          <p key={l.id} className={l.quem === "voce" ? "text-right" : ""}>
            <span className={`inline-block rounded px-3 py-2 ${l.quem === "voce" ? "bg-gray-100" : "bg-red-50"}`}>{l.texto}</span>
          </p>
        ))}
      </div>
      {estado === "pronto" && !decidindo && (
        <button onClick={decidir} className="w-full rounded border-2 border-red-700 p-3 font-semibold text-red-700">Decidir o encaminhamento</button>
      )}
      {(estado === "encerrado" || estado === "erro") && !decidindo && (
        <div className="space-y-2">
          <button onClick={comecar} className="w-full rounded bg-red-700 p-3 font-semibold text-white">Retomar atendimento</button>
          <button onClick={decidir} className="w-full rounded border-2 border-red-700 p-3 font-semibold text-red-700">Decidir o encaminhamento</button>
        </div>
      )}
      {decidindo && (
        <div className="space-y-2">
          <p className="font-medium">Qual o encaminhamento?</p>
          {(Object.keys(ENCAMINHAMENTOS) as Encaminhamento[]).map((e) => (
            <button key={e} onClick={() => escolher(e)} className="block w-full rounded border p-3 text-left hover:bg-gray-50">
              <b>{e}.</b> {ENCAMINHAMENTOS[e]}
            </button>
          ))}
          {erroDecisao && <p className="text-red-700">{erroDecisao}</p>}
        </div>
      )}
      {debug && <PainelDiagnostico />}
    </section>
  );
}
