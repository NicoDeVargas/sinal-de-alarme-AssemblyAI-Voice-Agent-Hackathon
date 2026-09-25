"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, ArrowLeft, DoorOpen, Headphones, PhoneDisconnect } from "@phosphor-icons/react";
import { iniciarConversa, type EstadoConversa, type Linha, type Voz } from "@/lib/voz/conversa";
import { assinar, diagnostico } from "@/lib/voz/diagnostico";
import type { CasoPublico, Correcao, Encaminhamento, Fala } from "@/lib/casos/tipos";
import { textos, type Idioma } from "@/lib/i18n";
import { Conversa } from "./Conversa";
import { Aviso, EstadoDaVoz, nomeDe, primario, secundario } from "./ui";

function PainelDiagnostico() {
  const [, forcar] = useState(0);
  useEffect(() => assinar(() => forcar((n) => n + 1)), []);
  return (
    <pre className="fixed bottom-24 left-2 z-50 max-h-[60dvh] max-w-xs overflow-auto whitespace-pre-wrap rounded-lg bg-superficie/90 p-2 font-mono text-xs shadow-lg">
      {JSON.stringify(diagnostico, null, 2)}
    </pre>
  );
}

type Conexao = { encerrar(): void; transcricao(): Fala[] };

export function Atendimento({
  sessaoId,
  idioma,
  atendimento,
  caso,
  aoDecidir,
}: {
  sessaoId: string;
  idioma: Idioma;
  atendimento: 1 | 2;
  caso: CasoPublico;
  aoDecidir(c: Correcao): void;
}) {
  const t = textos[idioma].atendimento;
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [estado, setEstado] = useState<EstadoConversa | "parado">("parado");
  const [voz, setVoz] = useState<Voz>("ouvindo");
  const [detalhe, setDetalhe] = useState("");
  const [decidindo, setDecidindo] = useState(false);
  const [escolha, setEscolha] = useState<Encaminhamento | null>(null);
  const [corrigindo, setCorrigindo] = useState(false);
  const [erroDecisao, setErroDecisao] = useState("");
  const [debug, setDebug] = useState(false);
  const conversa = useRef<Conexao | null>(null);
  const anteriores = useRef<Fala[]>([]);
  const geracao = useRef(0);
  const nome = nomeDe(caso);

  useEffect(() => {
    setDebug(new URLSearchParams(location.search).get("debug") === "1");
  }, []);

  useEffect(
    () => () => {
      geracao.current++;
      conversa.current?.encerrar();
    },
    [],
  );

  async function comecar() {
    setDetalhe("");
    if (conversa.current) {
      anteriores.current = [...anteriores.current, ...conversa.current.transcricao()];
      conversa.current = null;
    }
    const g = ++geracao.current;
    const vale = () => g === geracao.current;
    try {
      const c = await iniciarConversa({
        sessaoId,
        idioma,
        atendimento,
        configUrl: `/api/sessoes/${sessaoId}/atendimentos/${atendimento}/config`,
        comFicha: true,
        aoFalar: (l) => {
          if (vale()) setLinhas((x) => (x.some((y) => y.id === l.id) ? x.map((y) => (y.id === l.id ? l : y)) : [...x, l]));
        },
        aoEstado: (e, d) => {
          if (!vale()) return;
          setEstado(e);
          if (d) setDetalhe(d);
        },
        aoVoz: (v) => {
          if (vale()) setVoz(v);
        },
      });
      if (vale()) conversa.current = c;
      else c.encerrar();
    } catch (e) {
      if (!vale()) return;
      setEstado("erro");
      setDetalhe((d) => d || (e as Error).message);
    }
  }

  function decidir() {
    geracao.current++;
    conversa.current?.encerrar();
    setEstado((e) => (e === "pronto" || e === "conectando" ? "encerrado" : e));
    setDecidindo(true);
    scrollTo({ top: 0 });
  }

  async function confirmar() {
    if (!escolha) return;
    setErroDecisao("");
    setCorrigindo(true);
    const transcricao = [...anteriores.current, ...(conversa.current?.transcricao() ?? [])].slice(-300);
    try {
      const r = await fetch("/api/decisao", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessaoId, atendimento, encaminhamento: escolha, transcricao }),
      });
      if (r.ok) return aoDecidir(await r.json());
      const corpo = await r.json().catch(() => ({}));
      if (r.status === 409) {
        const sessao = await fetch(`/api/sessoes/${sessaoId}`).then((x) => (x.ok ? x.json() : null)).catch(() => null);
        const correcao = sessao?.correcoes?.[atendimento - 1];
        if (correcao) return aoDecidir(correcao);
      }
      setErroDecisao(corpo.erro ?? t.erroDecisao);
    } catch {
      setErroDecisao(t.semConexao);
    }
    setCorrigindo(false);
  }

  if (corrigindo) return <Corrigindo idioma={idioma} />;

  const emConversa = estado === "pronto" || estado === "conectando";
  const parou = estado === "encerrado" || estado === "erro";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-12">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <p className="text-sm font-semibold text-suave">{t.visita(atendimento)}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{caso.titulo}</h1>
        <div className={estado === "parado" && !decidindo ? "" : "hidden lg:block"}>
          <p className="mt-3 leading-relaxed text-suave">{caso.contexto}</p>
          <dl className="mt-4 border-t border-linha pt-4 text-sm">
            <dt className="text-suave">{t.quemConversa}</dt>
            <dd className="mt-0.5 font-semibold">{caso.quem}</dd>
          </dl>
          {!caso.revisadoPor && <p className="mt-4 text-xs text-suave">{t.rascunho}</p>}
        </div>
        {!decidindo && (
          <div className="mt-6 hidden flex-col gap-3 lg:flex">
            <Acoes idioma={idioma} emConversa={emConversa} parou={parou} aoDecidir={decidir} aoRetomar={comecar} />
          </div>
        )}
      </aside>

      <section className={`min-w-0 lg:pb-0 ${parou ? "pb-40" : "pb-24"}`}>
        {decidindo ? (
          <Decisao
            idioma={idioma}
            nome={nome}
            escolha={escolha}
            erro={erroDecisao}
            aoEscolher={setEscolha}
            aoConfirmar={confirmar}
            aoVoltar={() => setDecidindo(false)}
            linhas={linhas}
          />
        ) : (
          <>
            {estado !== "parado" && (
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <EstadoDaVoz estado={estado} voz={voz} nome={nome} idioma={idioma} />
              </div>
            )}
            {detalhe && (
              <div className="mb-5">
                <Aviso>{detalhe}</Aviso>
              </div>
            )}
            {estado === "parado" ? (
              <div className="rounded-2xl border border-linha bg-superficie p-6 sm:p-8">
                <h2 className="font-display text-2xl font-semibold tracking-tight">{t.antesDeEntrar}</h2>
                <ul className="mt-4 space-y-3 leading-relaxed">
                  <li className="flex gap-3">
                    <Headphones size={22} className="mt-0.5 shrink-0 text-suave" aria-hidden />
                    {t.dicas[0]}
                  </li>
                  <li className="flex gap-3">
                    <DoorOpen size={22} className="mt-0.5 shrink-0 text-suave" aria-hidden />
                    {t.dicas[1]}
                  </li>
                  <li className="flex gap-3">
                    <PhoneDisconnect size={22} className="mt-0.5 shrink-0 text-suave" aria-hidden />
                    {t.dicas[2]}
                  </li>
                </ul>
                <button onClick={comecar} className={`${primario} mt-6 sm:w-auto`}>
                  <DoorOpen size={20} weight="bold" aria-hidden />
                  {t.bater}
                </button>
              </div>
            ) : linhas.some((l) => l.texto.trim()) ? (
              <Conversa linhas={linhas} outro={nome} idioma={idioma} />
            ) : (
              <p className="rounded-2xl border border-dashed border-linha px-5 py-10 text-center text-suave">
                {estado === "conectando" ? t.abrindo : t.aparece}
              </p>
            )}
          </>
        )}
      </section>

      {!decidindo && (emConversa || parou) && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-linha bg-fundo/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-xl flex-col gap-2">
            <Acoes idioma={idioma} emConversa={emConversa} parou={parou} aoDecidir={decidir} aoRetomar={comecar} />
          </div>
        </div>
      )}
      {debug && <PainelDiagnostico />}
    </div>
  );
}

function Acoes({
  idioma,
  emConversa,
  parou,
  aoDecidir,
  aoRetomar,
}: {
  idioma: Idioma;
  emConversa: boolean;
  parou: boolean;
  aoDecidir(): void;
  aoRetomar(): void;
}) {
  if (!emConversa && !parou) return null;
  const t = textos[idioma].atendimento;
  return (
    <>
      {parou && (
        <button onClick={aoRetomar} className={secundario}>
          <ArrowCounterClockwise size={20} weight="bold" aria-hidden />
          {t.retomar}
        </button>
      )}
      <button onClick={aoDecidir} className={primario}>
        {t.decidir}
      </button>
    </>
  );
}

function Decisao({
  idioma,
  nome,
  escolha,
  erro,
  aoEscolher,
  aoConfirmar,
  aoVoltar,
  linhas,
}: {
  idioma: Idioma;
  nome: string;
  escolha: Encaminhamento | null;
  erro: string;
  aoEscolher(e: Encaminhamento): void;
  aoConfirmar(): void;
  aoVoltar(): void;
  linhas: Linha[];
}) {
  const t = textos[idioma].atendimento;
  const encaminhamentos = textos[idioma].encaminhamentos;
  return (
    <div className="entrar">
      <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{t.pergunta}</h2>
      <p className="mt-2 text-suave">{t.instrucao}</p>
      <fieldset className="mt-5 grid gap-3">
        <legend className="sr-only">{t.legenda}</legend>
        {(Object.keys(encaminhamentos) as Encaminhamento[]).map((e) => {
          const marcado = escolha === e;
          return (
            <label
              key={e}
              className={`flex min-h-16 cursor-pointer items-center gap-4 rounded-2xl border-2 bg-superficie px-4 py-3 transition active:scale-[0.99] has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-alarme ${
                marcado ? "border-tinta" : "border-linha hover:border-suave"
              }`}
            >
              <input type="radio" name="encaminhamento" value={e} checked={marcado} onChange={() => aoEscolher(e)} className="sr-only" />
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-full font-display text-lg font-bold ${
                  marcado ? "bg-tinta text-fundo" : "bg-fundo text-tinta"
                }`}
              >
                {e}
              </span>
              <span className="text-lg font-semibold leading-snug">{encaminhamentos[e]}</span>
            </label>
          );
        })}
      </fieldset>
      {erro && (
        <div className="mt-4">
          <Aviso>{erro}</Aviso>
        </div>
      )}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
        <button onClick={aoConfirmar} disabled={!escolha} className={`${primario} sm:w-auto`}>
          {t.confirmar}
        </button>
        <button onClick={aoVoltar} className={`${secundario} sm:w-auto`}>
          <ArrowLeft size={20} weight="bold" aria-hidden />
          {t.voltar}
        </button>
      </div>
      {linhas.some((l) => l.texto.trim()) && (
        <details className="mt-8 border-t border-linha pt-4">
          <summary className="flex min-h-11 cursor-pointer items-center font-semibold">{t.rever}</summary>
          <div className="mt-4">
            <Conversa linhas={linhas} outro={nome} idioma={idioma} />
          </div>
        </details>
      )}
    </div>
  );
}

export function Corrigindo({ idioma }: { idioma: Idioma }) {
  const t = textos[idioma].atendimento;
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-3xl">
      <p className="font-display text-2xl font-semibold tracking-tight">{t.corrigindo}</p>
      <p className="mt-2 text-suave">{t.corrigindoTexto}</p>
      <div className="brilho mt-8 grid gap-4" aria-hidden>
        <div className="h-24 w-40 rounded-2xl bg-linha" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 rounded-full bg-linha" style={{ width: `${[80, 45, 60, 55, 35][i]}%` }} />
        ))}
        <div className="mt-4 h-28 rounded-2xl bg-linha" />
      </div>
    </div>
  );
}
