"use client";
import { useEffect, useRef } from "react";
import type { Linha } from "@/lib/voz/conversa";
import { textos, type Idioma } from "@/lib/i18n";

export function Conversa({ linhas, outro, idioma }: { linhas: Linha[]; outro: string; idioma: Idioma }) {
  const t = textos[idioma].ui;
  const fim = useRef<HTMLLIElement>(null);
  const visiveis = linhas.filter((l) => l.texto.trim());

  useEffect(() => {
    const perto = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 240;
    if (perto) fim.current?.scrollIntoView({ block: "end" });
  }, [linhas]);

  return (
    <ol className="flex flex-col gap-3" aria-label={t.conversa}>
      {visiveis.map((l) => {
        const voce = l.quem === "voce";
        return (
          <li key={l.id} className={`entrar flex max-w-[85%] flex-col gap-1 ${voce ? "items-end self-end" : "items-start self-start"}`}>
            <span className="px-1 text-xs font-semibold text-suave">{voce ? t.voce : outro}</span>
            <p
              className={`rounded-2xl px-4 py-2.5 leading-relaxed ${
                voce ? "rounded-br-md bg-bolha text-bolha-texto" : "rounded-bl-md border border-linha bg-superficie"
              } ${l.parcial ? "italic opacity-70" : ""}`}
            >
              {l.texto}
            </p>
          </li>
        );
      })}
      <li ref={fim} aria-hidden className="h-px" />
    </ol>
  );
}
