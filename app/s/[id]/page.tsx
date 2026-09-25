"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { Atendimento } from "@/components/Atendimento";
import { Correcao } from "@/components/Correcao";
import { Preceptor } from "@/components/Preceptor";
import { Resultado } from "@/components/Resultado";
import { Topo, primario } from "@/components/ui";
import type { CasoPublico, Correcao as TCorrecao } from "@/lib/casos/tipos";
import { idiomaDe, sufixo, textos, type Idioma } from "@/lib/i18n";

interface Estado {
  id: string;
  idioma: Idioma;
  casos: [CasoPublico, CasoPublico];
  correcoes: [TCorrecao | null, TCorrecao | null];
  preparo: number | null;
  preceptorSegundos: number | null;
}

const ETAPAS = ["Visita 1", "Correção 1", "Preceptor", "Visita 2", "Correção 2", "Resultado"] as const;
type Etapa = (typeof ETAPAS)[number];

function Progresso({ etapa, idioma }: { etapa: Etapa; idioma: Idioma }) {
  const t = textos[idioma].sessao;
  const atual = ETAPAS.indexOf(etapa);
  const nome = t.etapas[etapa];
  return (
    <div className="flex items-center gap-3" aria-label={t.etapa(atual + 1, ETAPAS.length, nome)} role="img">
      <span className="hidden text-sm font-semibold text-suave sm:inline">{nome}</span>
      <span className="flex gap-1">
        {ETAPAS.map((e, i) => (
          <span key={e} className={`h-1.5 w-4 rounded-full sm:w-6 ${i < atual ? "bg-tinta" : i === atual ? "bg-alarme" : "bg-linha"}`} />
        ))}
      </span>
    </div>
  );
}

export default function Sessao({ params, searchParams }: PageProps<"/s/[id]">) {
  const { id } = use(params);
  const { lang } = use(searchParams);
  const pedido = idiomaDe(typeof lang === "string" ? lang : null);
  const [s, setS] = useState<Estado | null>(null);
  const [erro, setErro] = useState("");
  const [seguiu, setSeguiu] = useState(false);
  const [verResultado, setVerResultado] = useState(false);

  useEffect(() => {
    fetch(`/api/sessoes/${id}`)
      .then(async (r) => (r.ok ? setS(await r.json()) : setErro(textos[pedido].sessao.naoEncontrada)))
      .catch(() => setErro(textos[pedido].sessao.semConexao));
  }, [id, pedido]);

  const idioma = s?.idioma ?? pedido;
  const t = textos[idioma].sessao;

  const etapa: Etapa | null = !s
    ? null
    : !s.correcoes[0]
      ? "Visita 1"
      : !s.correcoes[1]
        ? s.preceptorSegundos !== null
          ? "Visita 2"
          : seguiu
            ? "Preceptor"
            : "Correção 1"
        : verResultado || s.preparo !== null
          ? "Resultado"
          : "Correção 2";

  useEffect(() => {
    if (etapa) scrollTo({ top: 0 });
  }, [etapa]);

  if (erro)
    return (
      <div lang={textos[idioma].lang} className="contents">
        <Topo idioma={idioma} />
        <main className="mx-auto w-full max-w-xl px-4 py-16 sm:px-6">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t.algoErrado}</h1>
          <p className="mt-3 leading-relaxed text-suave">{erro}</p>
          <Link href={`/${sufixo(idioma)}`} className={`${primario} mt-8 sm:w-auto`}>
            {t.novoTreino}
          </Link>
        </main>
      </div>
    );

  if (!s || !etapa)
    return (
      <div lang={textos[idioma].lang} className="contents">
        <Topo idioma={idioma} />
        <main className="brilho mx-auto grid w-full max-w-6xl gap-4 px-4 py-10 sm:px-6" role="status" aria-label={t.carregando}>
          <div className="h-4 w-24 rounded-full bg-linha" />
          <div className="h-10 w-72 max-w-full rounded-xl bg-linha" />
          <div className="h-4 w-96 max-w-full rounded-full bg-linha" />
          <div className="mt-6 h-48 rounded-2xl bg-linha" />
        </main>
      </div>
    );

  const [c1, c2] = s.correcoes;
  const decidiu = (n: 0 | 1) => (c: TCorrecao) => setS({ ...s, correcoes: n === 0 ? [c, c2] : [c1, c] });

  let conteudo;
  if (etapa === "Visita 1") conteudo = <Atendimento key="a1" sessaoId={id} idioma={idioma} atendimento={1} caso={s.casos[0]} aoDecidir={decidiu(0)} />;
  else if (etapa === "Correção 1")
    conteudo = (
      <>
        <Correcao c={c1!} caso={s.casos[0]} atendimento={1} idioma={idioma} />
        <Seguir onClick={() => setSeguiu(true)}>{t.continuar}</Seguir>
      </>
    );
  else if (etapa === "Preceptor") conteudo = <Preceptor sessaoId={id} idioma={idioma} aoTerminar={(segundos) => setS({ ...s, preceptorSegundos: segundos })} />;
  else if (etapa === "Visita 2") conteudo = <Atendimento key="a2" sessaoId={id} idioma={idioma} atendimento={2} caso={s.casos[1]} aoDecidir={decidiu(1)} />;
  else if (etapa === "Correção 2")
    conteudo = (
      <>
        <Correcao c={c2!} caso={s.casos[1]} atendimento={2} idioma={idioma} />
        <Seguir onClick={() => setVerResultado(true)}>{t.verResultado}</Seguir>
      </>
    );
  else conteudo = <Resultado sessaoId={id} idioma={idioma} casos={s.casos} c1={c1!} c2={c2!} preparoInicial={s.preparo} />;

  return (
    <div lang={textos[idioma].lang} className="contents">
      <Topo idioma={idioma}>
        <Progresso etapa={etapa} idioma={idioma} />
      </Topo>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">{conteudo}</main>
    </div>
  );
}

function Seguir({ onClick, children }: { onClick(): void; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl border-t border-linha pt-8">
      <button onClick={onClick} className={`${primario} sm:w-auto`}>
        {children}
        <ArrowRight size={20} weight="bold" aria-hidden />
      </button>
    </div>
  );
}
