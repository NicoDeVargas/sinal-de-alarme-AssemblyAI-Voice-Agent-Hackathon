"use client";
import { use, useEffect, useState } from "react";
import { Atendimento } from "@/components/Atendimento";
import { Correcao } from "@/components/Correcao";
import { Resultado } from "@/components/Resultado";
import type { CasoPublico, Correcao as TCorrecao } from "@/lib/casos/tipos";

interface Estado {
  id: string;
  casos: [CasoPublico, CasoPublico];
  correcoes: [TCorrecao | null, TCorrecao | null];
  preparo: number | null;
}

export default function Sessao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [s, setS] = useState<Estado | null>(null);
  const [erro, setErro] = useState("");
  const [seguiu, setSeguiu] = useState(false);
  const [verResultado, setVerResultado] = useState(false);

  useEffect(() => {
    fetch(`/api/sessoes/${id}`).then(async (r) => (r.ok ? setS(await r.json()) : setErro("Sessão não encontrada.")));
  }, [id]);

  if (erro) return <main className="mx-auto max-w-xl p-6">{erro}</main>;
  if (!s) return <main className="mx-auto max-w-xl p-6">Carregando…</main>;

  const [c1, c2] = s.correcoes;
  const decidiu = (n: 0 | 1) => (c: TCorrecao) => setS({ ...s, correcoes: n === 0 ? [c, c2] : [c1, c] });

  let conteudo;
  if (!c1) conteudo = <Atendimento key="a1" sessaoId={id} atendimento={1} caso={s.casos[0]} aoDecidir={decidiu(0)} />;
  else if (!c2 && !seguiu)
    conteudo = (
      <>
        <Correcao c={c1} />
        <button onClick={() => setSeguiu(true)} className="w-full rounded bg-red-700 p-3 font-semibold text-white">Próximo paciente</button>
      </>
    );
  else if (!c2) conteudo = <Atendimento key="a2" sessaoId={id} atendimento={2} caso={s.casos[1]} aoDecidir={decidiu(1)} />;
  else if (!verResultado && s.preparo === null)
    conteudo = (
      <>
        <Correcao c={c2} />
        <button onClick={() => setVerResultado(true)} className="w-full rounded bg-red-700 p-3 font-semibold text-white">Ver meu resultado</button>
      </>
    );
  else conteudo = <Resultado sessaoId={id} c1={c1} c2={c2} preparoInicial={s.preparo} />;

  return <main className="mx-auto max-w-xl space-y-6 p-6">{conteudo}</main>;
}
