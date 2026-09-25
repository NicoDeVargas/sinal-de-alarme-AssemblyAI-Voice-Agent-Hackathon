"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChalkboardTeacher, PhoneDisconnect } from "@phosphor-icons/react";
import { iniciarConversa, type EstadoConversa, type Linha, type Voz } from "@/lib/voz/conversa";
import { Conversa } from "./Conversa";
import { Aviso, EstadoDaVoz, primario, secundario } from "./ui";
import { textos, type Idioma } from "@/lib/i18n";

const LIMITE = 180;

const relogio = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function Preceptor({ sessaoId, idioma, aoTerminar }: { sessaoId: string; idioma: Idioma; aoTerminar(segundos: number): void }) {
  const t = textos[idioma].preceptor;
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [estado, setEstado] = useState<EstadoConversa | "parado">("parado");
  const [voz, setVoz] = useState<Voz>("ouvindo");
  const [detalhe, setDetalhe] = useState("");
  const [inicio, setInicio] = useState<number | null>(null);
  const [agora, setAgora] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const conversa = useRef<{ encerrar(): void } | null>(null);
  const terminou = useRef(false);
  const autoEncerrou = useRef(false);
  const geracao = useRef(0);

  const decorridos = inicio === null ? 0 : Math.min(LIMITE, Math.floor((agora - inicio) / 1000));
  const restantes = LIMITE - decorridos;

  useEffect(
    () => () => {
      geracao.current++;
      conversa.current?.encerrar();
    },
    [],
  );

  useEffect(() => {
    if (inicio === null || estado !== "pronto") return;
    const t = setInterval(() => setAgora(Date.now()), 250);
    return () => clearInterval(t);
  }, [inicio, estado]);

  async function registrar(segundos: number) {
    if (terminou.current) return;
    terminou.current = true;
    geracao.current++;
    conversa.current?.encerrar();
    setEstado((e) => (e === "pronto" || e === "conectando" ? "encerrado" : e));
    setSalvando(true);
    setErro("");
    try {
      const r = await fetch(`/api/sessoes/${sessaoId}/preceptor`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ segundos }),
      });
      if (r.ok || r.status === 409) return aoTerminar(segundos);
      setErro(t.erroSalvar);
    } catch {
      setErro(t.semConexao);
    }
    terminou.current = false;
    setSalvando(false);
  }

  useEffect(() => {
    if (inicio === null || restantes > 0 || autoEncerrou.current) return;
    autoEncerrou.current = true;
    registrar(LIMITE);
  });

  async function comecar() {
    setDetalhe("");
    const g = ++geracao.current;
    const vale = () => g === geracao.current;
    try {
      const c = await iniciarConversa({
        sessaoId,
        idioma,
        configUrl: `/api/sessoes/${sessaoId}/preceptor/config`,
        comFicha: false,
        aoFalar: (l) => {
          if (vale()) setLinhas((x) => (x.some((y) => y.id === l.id) ? x.map((y) => (y.id === l.id ? l : y)) : [...x, l]));
        },
        aoEstado: (e, d) => {
          if (!vale()) return;
          setEstado(e);
          if (d) setDetalhe(d);
          if (e === "pronto") {
            const t = Date.now();
            setInicio((i) => i ?? t);
            setAgora(t);
          }
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

  const ativo = estado === "pronto" || estado === "conectando";
  const parou = estado === "encerrado" || estado === "erro";

  return (
    <div className="mx-auto max-w-3xl pb-28 sm:pb-0">
      <div>
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-suave">
            <ChalkboardTeacher size={20} aria-hidden />
            {t.antes}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{t.titulo}</h1>
          <p className={`mt-3 max-w-[60ch] leading-relaxed text-suave ${estado === "parado" ? "" : "hidden sm:block"}`}>
            {t.explicacao}
          </p>
        </div>
      </div>

      {estado !== "parado" && (
        <div className="mt-6 flex items-center justify-between gap-4">
          <EstadoDaVoz estado={estado} voz={voz} nome={t.nome} idioma={idioma} />
          {inicio !== null && (
            <p
              role="timer"
              className={`font-display text-5xl font-bold leading-none tabular-nums tracking-tight sm:text-6xl ${restantes <= 30 ? "text-alarme-texto" : ""}`}
            >
              <span aria-hidden>{relogio(restantes)}</span>
              <span className="sr-only">{t.faltam(Math.floor(restantes / 60), restantes % 60)}</span>
            </p>
          )}
        </div>
      )}
      {(detalhe || erro) && (
        <div className="mt-4">
          <Aviso>{erro || detalhe}</Aviso>
        </div>
      )}

      {estado === "parado" ? (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button onClick={comecar} className={`${primario} sm:w-auto`}>
            <ChalkboardTeacher size={20} weight="bold" aria-hidden />
            {t.conversar}
          </button>
          <button onClick={() => registrar(0)} disabled={salvando} className={`${secundario} sm:w-auto`}>
            {t.pular}
            <ArrowRight size={20} weight="bold" aria-hidden />
          </button>
        </div>
      ) : (
        <div className="mt-6">
          {linhas.some((l) => l.texto.trim()) ? (
            <Conversa linhas={linhas} outro={t.rotulo} idioma={idioma} />
          ) : (
            <p className="rounded-2xl border border-dashed border-linha px-5 py-10 text-center text-suave">
              {estado === "conectando" ? t.chamando : t.aparece}
            </p>
          )}
        </div>
      )}

      {(ativo || parou) && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-linha bg-fundo/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:mt-8 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <div className="mx-auto flex max-w-xl gap-3 sm:mx-0">
            {parou && inicio === null ? (
              <>
                <button onClick={comecar} className={`${secundario} sm:w-auto`}>
                  {t.tentarDeNovo}
                </button>
                <button onClick={() => registrar(0)} disabled={salvando} className={`${primario} sm:w-auto`}>
                  {t.pular}
                </button>
              </>
            ) : (
              <button onClick={() => registrar(decorridos)} disabled={salvando} className={`${primario} sm:w-auto`}>
                {parou ? (
                  <>
                    {t.seguir}
                    <ArrowRight size={20} weight="bold" aria-hidden />
                  </>
                ) : (
                  <>
                    <PhoneDisconnect size={20} weight="bold" aria-hidden />
                    {t.encerrar}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
