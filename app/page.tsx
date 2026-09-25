"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, CaretDown } from "@phosphor-icons/react";
import { PAPEIS, type Papel } from "@/lib/casos/tipos";
import { Aviso, Topo, primario } from "@/components/ui";

const PASSOS = [
  { titulo: "Visita por voz", texto: "Converse com o paciente ou com quem cuida dele e descubra o que não é dito de cara." },
  { titulo: "Correção", texto: "Nota de 0 a 100 com o que você descobriu, perguntou, orientou e decidiu." },
  { titulo: "Preceptor", texto: "Até 3 minutos, opcionais, para pensar no que faria diferente." },
  { titulo: "Segunda visita", texto: "Um caso novo para pôr em prática." },
];

const campo = "min-h-12 w-full rounded-xl border border-linha bg-superficie px-4 text-base text-tinta transition focus:border-tinta";

export default function Abertura() {
  const router = useRouter();
  const [apelido, setApelido] = useState("");
  const [papel, setPapel] = useState<Papel>("acs");
  const [consentimento, setConsentimento] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function comecar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const r = await fetch("/api/sessoes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apelido, papel, consentimento }),
      });
      const corpo = await r.json().catch(() => ({}));
      if (r.ok) return router.push(`/s/${corpo.id}`);
      setErro(corpo.erro ?? "Não foi possível começar. Tente de novo.");
    } catch {
      setErro("Sem conexão com o servidor. Confira a internet e tente de novo.");
    }
    setEnviando(false);
  }

  return (
    <>
      <Topo>
        <Link href="/estudo" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-suave hover:text-tinta">
          Painel do estudo
          <ArrowUpRight size={16} weight="bold" aria-hidden />
        </Link>
      </Topo>
      <main className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-x-16 lg:gap-y-12 lg:py-20">
        <div>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Treine o olhar para os sinais de alarme da dengue.
          </h1>
          <p className="mt-5 max-w-[52ch] leading-relaxed sm:text-lg text-suave">
            Você vai fazer duas visitas domiciliares por voz a pacientes com suspeita de dengue. Converse, descubra o que está acontecendo e decida o encaminhamento. Leva uns 15 minutos. Use fone ou fique num lugar silencioso.
          </p>
        </div>

        <form onSubmit={comecar} className="grid content-start gap-6 rounded-2xl border border-linha bg-superficie p-5 sm:p-8 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Antes de começar</h2>
          <label className="grid gap-2">
            <span className="font-semibold">Apelido</span>
            <input value={apelido} onChange={(e) => setApelido(e.target.value)} maxLength={40} required autoComplete="nickname" className={campo} />
            <span className="text-sm text-suave">Não precisa ser seu nome. Não aparece no painel.</span>
          </label>
          <label className="grid gap-2">
            <span className="font-semibold">Você é</span>
            <span className="relative">
              <select value={papel} onChange={(e) => setPapel(e.target.value as Papel)} className={`${campo} appearance-none pr-10`}>
                {Object.entries(PAPEIS).map(([v, rotulo]) => (
                  <option key={v} value={v}>
                    {rotulo}
                  </option>
                ))}
              </select>
              <CaretDown size={18} weight="bold" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-suave" aria-hidden />
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-linha bg-fundo p-4">
            <input
              type="checkbox"
              checked={consentimento}
              onChange={(e) => setConsentimento(e.target.checked)}
              required
              className="mt-0.5 size-6 shrink-0 accent-[var(--alarme)]"
            />
            <span className="text-sm leading-relaxed">
              Concordo que minha voz seja processada e gravada pela AssemblyAI durante os atendimentos, e que minhas respostas entrem, sem meu apelido, no painel público do estudo.
            </span>
          </label>
          {erro && <Aviso>{erro}</Aviso>}
          <button disabled={enviando} className={primario}>
            {enviando ? "Preparando…" : "Começar o treino"}
            {!enviando && <ArrowRight size={20} weight="bold" aria-hidden />}
          </button>
        </form>

        <ol className="grid gap-6 sm:grid-cols-2 lg:col-start-1">
            {PASSOS.map((p, i) => (
              <li key={p.titulo} className="flex gap-4">
                <span className="font-display text-3xl font-bold leading-none text-alarme-texto tabular-nums">{i + 1}</span>
                <span>
                  <span className="block font-semibold">{p.titulo}</span>
                  <span className="mt-1 block leading-relaxed text-suave">{p.texto}</span>
                </span>
              </li>
            ))}
        </ol>
      </main>
    </>
  );
}
