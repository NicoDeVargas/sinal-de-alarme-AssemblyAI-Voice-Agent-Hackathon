"use client";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Heartbeat, Waveform, X } from "@phosphor-icons/react";
import type { EstadoConversa, Voz } from "@/lib/voz/conversa";
import type { CasoPublico } from "@/lib/casos/tipos";

export const nomeDe = (caso: CasoPublico) => caso.quem.split(",")[0];

export const primario =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-alarme px-5 py-3 font-semibold text-white transition active:scale-[0.98] hover:bg-alarme-forte disabled:opacity-50 disabled:active:scale-100";
export const secundario =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-linha bg-superficie px-5 py-3 font-semibold text-tinta transition active:scale-[0.98] hover:border-suave";

export function Marca() {
  return (
    <Link href="/" className="inline-flex min-h-11 items-center gap-2 font-display text-lg font-semibold tracking-tight">
      <Heartbeat size={22} weight="bold" className="text-alarme-texto" aria-hidden />
      Sinal de Alarme
    </Link>
  );
}

export function Topo({ children }: { children?: React.ReactNode }) {
  return (
    <header className="border-b border-linha">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <Marca />
        {children}
      </div>
    </header>
  );
}

export function Selo({ feito, sim, nao }: { feito: boolean; sim: string; nao: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold ${feito ? "text-ok" : "text-alarme-texto"}`}>
      <span className={`grid size-6 place-items-center rounded-full ${feito ? "bg-ok-suave" : "bg-alarme-suave"}`}>
        {feito ? <Check size={14} weight="bold" aria-hidden /> : <X size={14} weight="bold" aria-hidden />}
      </span>
      {feito ? sim : nao}
    </span>
  );
}

export function Citacao({ children, rotulo }: { children: React.ReactNode; rotulo?: string }) {
  return (
    <figure className="mt-2">
      {rotulo && <figcaption className="text-sm text-suave">{rotulo}</figcaption>}
      <blockquote className="mt-1 text-[1.05rem] italic leading-relaxed">“{children}”</blockquote>
    </figure>
  );
}

const TEXTO_ESTADO: Record<EstadoConversa | "parado", string> = {
  parado: "Ainda não começou",
  conectando: "Conectando…",
  pronto: "Ouvindo você",
  encerrado: "Conversa encerrada",
  erro: "Conversa interrompida",
};

export function EstadoDaVoz({ estado, voz, nome }: { estado: EstadoConversa | "parado"; voz: Voz; nome: string }) {
  const falando = estado === "pronto" && voz === "paciente";
  const texto = falando ? `${nome} está falando` : TEXTO_ESTADO[estado];
  const cor =
    estado === "erro" ? "bg-alarme" : estado === "pronto" ? "bg-ok" : estado === "conectando" ? "bg-suave" : "bg-linha";
  return (
    <p role="status" aria-live="polite" className="inline-flex min-h-9 items-center gap-2.5 rounded-full border border-linha bg-superficie px-3.5 text-sm font-semibold">
      {falando ? (
        <Waveform size={18} weight="bold" className="brilho" aria-hidden />
      ) : (
        <span className="relative flex size-2.5">
          {(estado === "pronto" || estado === "conectando") && <span className={`pulsar absolute inset-0 rounded-full ${cor}`} />}
          <span className={`relative size-2.5 rounded-full ${cor}`} />
        </span>
      )}
      {texto}
    </p>
  );
}

export function SetaPara() {
  return <ArrowRight size={16} className="self-center text-suave" aria-label="para" />;
}

export function SetaExterna() {
  return <ArrowUpRight size={16} weight="bold" aria-hidden />;
}

export function Aviso({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-alarme/40 bg-alarme-suave px-4 py-3 text-sm text-alarme-texto">{children}</p>;
}
