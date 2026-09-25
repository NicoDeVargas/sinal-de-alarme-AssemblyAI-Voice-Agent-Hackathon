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

interface Estado {
  id: string;
  casos: [CasoPublico, CasoPublico];
  correcoes: [TCorrecao | null, TCorrecao | null];
  preparo: number | null;
  preceptorSegundos: number | null;
}

const ETAPAS = ["Visita 1", "Correção 1", "Preceptor", "Visita 2", "Correção 2", "Resultado"] as const;
type Etapa = (typeof ETAPAS)[number];

function Progresso({ etapa }: { etapa: Etapa }) {
  const atual = ETAPAS.indexOf(etapa);
  return (
    <div className="flex items-center gap-3" aria-label={`Etapa ${atual + 1} de ${ETAPAS.length}: ${etapa}`} role="img">
      <span className="hidden text-sm font-semibold text-suave sm:inline">{etapa}</span>
      <span className="flex gap-1">
        {ETAPAS.map((e, i) => (
          <span key={e} className={`h-1.5 w-4 rounded-full sm:w-6 ${i < atual ? "bg-tinta" : i === atual ? "bg-alarme" : "bg-linha"}`} />
        ))}
      </span>
    </div>
  );
}

export default function Sessao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [s, setS] = useState<Estado | null>(null);
  const [erro, setErro] = useState("");
  const [seguiu, setSeguiu] = useState(false);
  const [verResultado, setVerResultado] = useState(false);

  useEffect(() => {
    fetch(`/api/sessoes/${id}`)
      .then(async (r) => (r.ok ? setS(await r.json()) : setErro("Não encontramos esta sessão. O link pode estar incompleto.")))
      .catch(() => setErro("Sem conexão com o servidor. Confira a internet e recarregue a página."));
  }, [id]);

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
      <>
        <Topo />
        <main className="mx-auto w-full max-w-xl px-4 py-16 sm:px-6">
          <h1 className="font-display text-3xl font-semibold tracking-tight">Algo deu errado</h1>
          <p className="mt-3 leading-relaxed text-suave">{erro}</p>
          <Link href="/" className={`${primario} mt-8 sm:w-auto`}>
            Começar um novo treino
          </Link>
        </main>
      </>
    );

  if (!s || !etapa)
    return (
      <>
        <Topo />
        <main className="brilho mx-auto grid w-full max-w-6xl gap-4 px-4 py-10 sm:px-6" role="status" aria-label="Carregando">
          <div className="h-4 w-24 rounded-full bg-linha" />
          <div className="h-10 w-72 max-w-full rounded-xl bg-linha" />
          <div className="h-4 w-96 max-w-full rounded-full bg-linha" />
          <div className="mt-6 h-48 rounded-2xl bg-linha" />
        </main>
      </>
    );

  const [c1, c2] = s.correcoes;
  const decidiu = (n: 0 | 1) => (c: TCorrecao) => setS({ ...s, correcoes: n === 0 ? [c, c2] : [c1, c] });

  let conteudo;
  if (etapa === "Visita 1") conteudo = <Atendimento key="a1" sessaoId={id} atendimento={1} caso={s.casos[0]} aoDecidir={decidiu(0)} />;
  else if (etapa === "Correção 1")
    conteudo = (
      <>
        <Correcao c={c1!} caso={s.casos[0]} atendimento={1} />
        <Seguir onClick={() => setSeguiu(true)}>Continuar</Seguir>
      </>
    );
  else if (etapa === "Preceptor") conteudo = <Preceptor sessaoId={id} aoTerminar={(segundos) => setS({ ...s, preceptorSegundos: segundos })} />;
  else if (etapa === "Visita 2") conteudo = <Atendimento key="a2" sessaoId={id} atendimento={2} caso={s.casos[1]} aoDecidir={decidiu(1)} />;
  else if (etapa === "Correção 2")
    conteudo = (
      <>
        <Correcao c={c2!} caso={s.casos[1]} atendimento={2} />
        <Seguir onClick={() => setVerResultado(true)}>Ver meu resultado</Seguir>
      </>
    );
  else conteudo = <Resultado sessaoId={id} casos={s.casos} c1={c1!} c2={c2!} preparoInicial={s.preparo} />;

  return (
    <>
      <Topo>
        <Progresso etapa={etapa} />
      </Topo>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">{conteudo}</main>
    </>
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
