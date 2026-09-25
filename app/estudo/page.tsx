import Link from "next/link";
import { sql } from "@/lib/db";
import { CASOS_PRIVADOS } from "@/lib/casos/privado";
import { CASOS_PUBLICOS } from "@/lib/casos/publico";
import { idiomaDe, sufixo, textos, type Idioma } from "@/lib/i18n";
import { corrigir } from "@/lib/estudo/corrigir";
import { carregarAvaliacoesEm, carregarEventosEm, type LinhaSessao } from "@/lib/estudo/carregar";
import { agregar, type SessaoCorrigida } from "@/lib/estudo/agregar";
import type { Papel } from "@/lib/casos/tipos";
import { SeletorIdioma, SetaExterna, SetaPara, Topo } from "@/components/ui";

export const dynamic = "force-dynamic";

const pct = (x: number) => `${Math.round(x * 100)}%`;

function LinhaDelta({ rotulo, antes, depois, idioma }: { rotulo: string; antes: React.ReactNode; depois: React.ReactNode; idioma: Idioma }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 border-t border-linha py-4">
      <dt className="font-semibold">{rotulo}</dt>
      <dd className="flex items-baseline gap-3 tabular-nums">
        <span className="text-suave">{antes}</span>
        <SetaPara idioma={idioma} />
        <span className="font-semibold">{depois}</span>
      </dd>
    </div>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <p className="font-display text-4xl font-bold leading-none tracking-tighter tabular-nums sm:text-5xl">{valor}</p>
      <p className="mt-2 text-sm text-suave">{rotulo}</p>
    </div>
  );
}

export default async function Estudo({ searchParams }: PageProps<"/estudo">) {
  const { lang } = await searchParams;
  const idioma = idiomaDe(typeof lang === "string" ? lang : null);
  const t = textos[idioma].estudo;
  const linhas = await sql<LinhaSessao[]>`
    select id, papel, caso_1, caso_2, encaminhamento_1, encaminhamento_2, preparo, tokens, preceptor_segundos, idioma
    from sessoes where encaminhamento_2 is not null and lower(apelido) <> 'teste' and idioma = 'pt' order by criada_em`;
  const ids = linhas.map((l) => l.id);
  const [eventosPorSessao, avaliacoesPorSessao] = await Promise.all([carregarEventosEm(ids), carregarAvaliacoesEm(ids)]);
  const sessoes: SessaoCorrigida[] = linhas.map((s) => ({
    papel: s.papel,
    c1: corrigir(CASOS_PRIVADOS[s.caso_1], CASOS_PUBLICOS[s.caso_1], eventosPorSessao.get(`${s.id}:1`) ?? [], s.encaminhamento_1!, avaliacoesPorSessao.get(`${s.id}:1`) ?? null, "pt"),
    c2: corrigir(CASOS_PRIVADOS[s.caso_2], CASOS_PUBLICOS[s.caso_2], eventosPorSessao.get(`${s.id}:2`) ?? [], s.encaminhamento_2!, avaliacoesPorSessao.get(`${s.id}:2`) ?? null, "pt"),
    preparo: s.preparo,
    fezPreceptor: (s.preceptor_segundos ?? 0) > 0,
  }));
  const p = agregar(sessoes);

  return (
    <div lang={textos[idioma].lang} className="contents">
      <Topo idioma={idioma}>
        <div className="flex flex-wrap items-center justify-end gap-x-4">
          <SeletorIdioma idioma={idioma} caminho="/estudo" />
          <Link href={`/${sufixo(idioma)}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-suave hover:text-tinta">
            {t.treinar}
            <SetaExterna />
          </Link>
        </div>
      </Topo>
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{t.titulo}</h1>
        {t.origem && <p className="mt-3 font-semibold leading-relaxed">{t.origem}</p>}
        <p className="mt-4 max-w-[60ch] leading-relaxed text-suave">{t.intro}</p>

        {p.n === 0 ? (
          <p className="mt-10 rounded-2xl border border-linha bg-superficie px-5 py-8 text-center text-lg text-suave">{t.vazio}</p>
        ) : (
          <>
            <div className="mt-10 rounded-2xl border border-linha bg-superficie p-5 sm:p-8">
              <Numero rotulo={t.concluiram(p.n)} valor={String(p.n)} />
              <dl className="mt-2">
                <LinhaDelta idioma={idioma} rotulo={t.notaMedia} antes={Math.round(p.nota1)} depois={Math.round(p.nota2)} />
                <LinhaDelta idioma={idioma} rotulo={t.achados} antes={pct(p.achados1)} depois={pct(p.achados2)} />
                <LinhaDelta idioma={idioma} rotulo={t.acerto} antes={pct(p.acerto1)} depois={pct(p.acerto2)} />
              </dl>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-linha bg-superficie p-5 sm:p-6">
                <Numero rotulo={t.melhoraram(p.n)} valor={String(p.melhoraram)} />
              </div>
              <div className="rounded-2xl border border-linha bg-superficie p-5 sm:p-6">
                <Numero rotulo={t.preceptor(p.fizeramPreceptor)} valor={String(p.fizeramPreceptor)} />
              </div>
            </div>

            {p.preparoMedio !== null && (
              <p className="mt-6 leading-relaxed">
                {t.preparoAntes}
                <b className="font-display tabular-nums">{p.preparoMedio.toFixed(1)}</b>
                {t.preparoDepois}
              </p>
            )}

            <div className="mt-8">
              <p className="font-semibold">{t.quem}</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {(Object.entries(p.porPapel) as [Papel, number][]).map(([papel, n]) => (
                  <li key={papel} className="flex items-center justify-between gap-4 border-t border-linha py-2">
                    <span>{textos[idioma].papeis[papel]}</span>
                    <span className="font-semibold tabular-nums">{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        <section className="mt-12 border-t border-linha pt-8">
          <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{t.comoFunciona}</h2>
          <div className="mt-4 grid gap-4 leading-relaxed text-suave">
            {t.funcionamento.map((x) => (
              <p key={x}>{x}</p>
            ))}
          </div>
        </section>

        <section className="mt-8 border-t border-linha pt-8">
          <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{t.limitesTitulo}</h2>
          <div className="mt-4 grid gap-4 leading-relaxed text-suave">
            {t.limites.map((x) => (
              <p key={x}>{x}</p>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
