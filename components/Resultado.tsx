"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react";
import type { CasoPublico, Correcao } from "@/lib/casos/tipos";
import { Aviso, Selo } from "./ui";

function Linha({ rotulo, antes, depois }: { rotulo: string; antes: React.ReactNode; depois: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 border-t border-linha py-4">
      <dt className="font-semibold">{rotulo}</dt>
      <dd className="flex items-baseline gap-3 tabular-nums">
        <span className="text-suave">{antes}</span>
        <ArrowRight size={16} className="self-center text-suave" aria-label="para" />
        <span className="font-semibold">{depois}</span>
      </dd>
    </div>
  );
}

export function Resultado({
  sessaoId,
  casos,
  c1,
  c2,
  preparoInicial,
}: {
  sessaoId: string;
  casos: [CasoPublico, CasoPublico];
  c1: Correcao;
  c2: Correcao;
  preparoInicial: number | null;
}) {
  const [preparo, setPreparo] = useState(preparoInicial);
  const [enviando, setEnviando] = useState<number | null>(null);
  const [erro, setErro] = useState("");
  const achados = (c: Correcao) => `${c.achados.filter((a) => a.feito).length} de ${c.achados.length}`;
  const diferenca = c2.nota - c1.nota;
  const pontos = (n: number) => `${n} ${n === 1 ? "ponto" : "pontos"}`;

  async function responder(n: number) {
    setErro("");
    setEnviando(n);
    try {
      const r = await fetch(`/api/sessoes/${sessaoId}/preparo`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ preparo: n }),
      });
      if (r.ok) setPreparo(n);
      else setErro("Não foi possível salvar. Tente de novo.");
    } catch {
      setErro("Sem conexão com o servidor. Tente de novo.");
    }
    setEnviando(null);
  }

  return (
    <article className="mx-auto max-w-3xl">
      <p className="text-sm font-semibold text-suave">Fim do treino</p>
      <h1 className="mt-1 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Seu resultado</h1>

      <div className="mt-8 grid grid-cols-[auto_auto_auto] items-end justify-start gap-4 sm:gap-8">
        <div>
          <p className="text-sm text-suave">{casos[0].titulo}</p>
          <p className="font-display text-6xl font-bold leading-none tracking-tighter text-suave tabular-nums sm:text-7xl">{c1.nota}</p>
        </div>
        <ArrowRight size={32} className="mb-2 text-suave" aria-label="para" />
        <div>
          <p className="text-sm text-suave">{casos[1].titulo}</p>
          <p className="font-display text-6xl font-bold leading-none tracking-tighter tabular-nums sm:text-7xl">{c2.nota}</p>
        </div>
      </div>
      <p className="mt-4 text-lg">
        {diferenca > 0 ? `Sua nota subiu ${pontos(diferenca)}.` : diferenca < 0 ? `Sua nota caiu ${pontos(-diferenca)}.` : "Sua nota ficou igual."} Os casos são diferentes, então compare com cuidado.
      </p>

      <dl className="mt-8 border-b border-linha">
        <Linha rotulo="Achados críticos" antes={achados(c1)} depois={achados(c2)} />
        <div className="grid gap-3 border-t border-linha py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4">
          <dt className="font-semibold">Encaminhamento</dt>
          <dd className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:justify-end">
            <Selo feito={c1.acertou} sim="Visita 1 certo" nao="Visita 1 errado" />
            <Selo feito={c2.acertou} sim="Visita 2 certo" nao="Visita 2 errado" />
          </dd>
        </div>
      </dl>

      <section className="mt-10 rounded-2xl border border-linha bg-superficie p-5 sm:p-8">
        {preparo === null ? (
          <>
            <h2 id="preparo" className="font-display text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
              Você se sente mais preparado(a) para reconhecer um sinal de alarme?
            </h2>
            <div role="group" aria-labelledby="preparo" className="mt-5 grid grid-cols-5 gap-2 sm:max-w-md">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => responder(n)}
                  disabled={enviando !== null}
                  className="grid min-h-14 place-items-center rounded-xl border-2 border-linha bg-fundo font-display text-xl font-bold transition hover:border-tinta active:scale-[0.97] disabled:opacity-50"
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-sm text-suave sm:max-w-md">
              <span>Nada</span>
              <span>Muito</span>
            </div>
            {erro && (
              <div className="mt-4">
                <Aviso>{erro}</Aviso>
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Obrigado por treinar.</h2>
            <p className="mt-2 leading-relaxed text-suave">Sua resposta entra, sem o seu apelido, no painel do estudo.</p>
          </>
        )}
      </section>
      <Link href="/estudo" className="mt-6 inline-flex min-h-11 items-center gap-1.5 font-semibold text-alarme-texto underline underline-offset-4">
        Ver o painel do estudo
        <ArrowUpRight size={18} weight="bold" aria-hidden />
      </Link>
    </article>
  );
}
