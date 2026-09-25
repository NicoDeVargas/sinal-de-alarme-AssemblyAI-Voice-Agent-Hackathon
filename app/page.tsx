"use client";
import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, CaretDown } from "@phosphor-icons/react";
import { PAPEIS, type Papel } from "@/lib/casos/tipos";
import { idiomaDe, sufixo, textos } from "@/lib/i18n";
import { Aviso, SeletorIdioma, Topo, primario } from "@/components/ui";

const campo = "min-h-12 w-full rounded-xl border border-linha bg-superficie px-4 text-base text-tinta transition focus:border-tinta";

export default function Abertura({ searchParams }: PageProps<"/">) {
  const { lang } = use(searchParams);
  const idioma = idiomaDe(typeof lang === "string" ? lang : null);
  const t = textos[idioma].abertura;
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
        body: JSON.stringify({ apelido, papel, consentimento, idioma }),
      });
      const corpo = await r.json().catch(() => ({}));
      if (r.ok) return router.push(`/s/${corpo.id}${sufixo(idioma)}`);
      setErro(corpo.erro ?? t.erro);
    } catch {
      setErro(t.semConexao);
    }
    setEnviando(false);
  }

  return (
    <div lang={textos[idioma].lang} className="contents">
      <Topo idioma={idioma}>
        <div className="flex flex-wrap items-center justify-end gap-x-4">
          <SeletorIdioma idioma={idioma} caminho="/" />
          <Link href={`/estudo${sufixo(idioma)}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-suave hover:text-tinta">
            {t.painel}
            <ArrowUpRight size={16} weight="bold" aria-hidden />
          </Link>
        </div>
      </Topo>
      <main className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-x-16 lg:gap-y-12 lg:py-20">
        <div>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            {t.titulo}
          </h1>
          <p className="mt-5 max-w-[52ch] leading-relaxed sm:text-lg text-suave">
            {t.intro}
          </p>
          {t.aviso && (
            <p className="mt-5 max-w-[52ch] border-l-[3px] border-linha pl-4 text-sm leading-relaxed text-suave">
              {t.aviso.antes}
              <Link href="/estudo" className="font-semibold text-tinta underline underline-offset-4">
                {t.aviso.link}
              </Link>
              {t.aviso.depois}
            </p>
          )}
        </div>

        <form onSubmit={comecar} className="grid content-start gap-6 rounded-2xl border border-linha bg-superficie p-5 sm:p-8 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <h2 className="font-display text-2xl font-semibold tracking-tight">{t.antesDeComecar}</h2>
          <label className="grid gap-2">
            <span className="font-semibold">{t.apelido}</span>
            <input value={apelido} onChange={(e) => setApelido(e.target.value)} maxLength={40} required autoComplete="nickname" className={campo} />
            <span className="text-sm text-suave">{t.apelidoAjuda}</span>
          </label>
          <label className="grid gap-2">
            <span className="font-semibold">{t.voceE}</span>
            <span className="relative">
              <select value={papel} onChange={(e) => setPapel(e.target.value as Papel)} className={`${campo} appearance-none pr-10`}>
                {PAPEIS.map((v) => (
                  <option key={v} value={v}>
                    {textos[idioma].papeis[v]}
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
              {t.consentimento}
            </span>
          </label>
          {erro && <Aviso>{erro}</Aviso>}
          <button disabled={enviando} className={primario}>
            {enviando ? t.preparando : t.comecar}
            {!enviando && <ArrowRight size={20} weight="bold" aria-hidden />}
          </button>
        </form>

        <ol className="grid gap-6 sm:grid-cols-2 lg:col-start-1">
            {t.passos.map((p, i) => (
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
    </div>
  );
}
