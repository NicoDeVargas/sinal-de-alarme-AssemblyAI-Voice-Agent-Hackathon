"use client";
import type { CasoPublico, Correcao as TCorrecao, Encaminhamento } from "@/lib/casos/tipos";
import { textos, type Idioma } from "@/lib/i18n";
import { Citacao, Selo, nomeDe } from "./ui";


function Barra({ idioma, nome, valor, peso }: { idioma: Idioma; nome: string; valor: number | null; peso: number }) {
  const t = textos[idioma];
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[11rem_minmax(0,1fr)_5.5rem]">
      <span className="font-semibold">{nome}</span>
      <span className="text-right text-sm tabular-nums text-suave sm:order-last">
        {valor === null ? t.correcao.naoAvaliado : (
          <>
            <b className="font-display text-lg text-tinta">{valor.toLocaleString(t.locale, { maximumFractionDigits: 1 })}</b> {t.correcao.de}{" "}
            <span className="font-display">{peso}</span>
          </>
        )}
      </span>
      <span className="col-span-2 sm:col-span-1" aria-hidden>
        <span
          className={`block h-2.5 overflow-hidden rounded-full ${valor === null ? "border border-dashed border-suave/60" : "bg-linha"}`}
          style={{ width: `${(peso / 40) * 100}%` }}
        >
          {valor !== null && <span className="block h-full rounded-full bg-tinta" style={{ width: `${(valor / peso) * 100}%` }} />}
        </span>
      </span>
    </li>
  );
}

function Secao({ titulo, placar, children }: { titulo: string; placar?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-linha py-8">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{titulo}</h2>
        {placar && <p className="shrink-0 text-sm tabular-nums text-suave">{placar}</p>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Item({ nome, feito, sim, nao, children }: { nome: string; feito: boolean; sim: string; nao: string; children?: React.ReactNode }) {
  return (
    <li className={`border-l-[3px] py-1 pl-4 ${feito ? "border-ok" : "border-alarme"}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-lg font-semibold leading-snug">{nome}</p>
        <Selo feito={feito} sim={sim} nao={nao} />
      </div>
      {children}
    </li>
  );
}

function Opcao({ idioma, rotulo, e, destaque }: { idioma: Idioma; rotulo: string; e: Encaminhamento; destaque: boolean }) {
  return (
    <div className={`rounded-2xl border-2 p-4 ${destaque ? "border-tinta" : "border-alarme/50"}`}>
      <p className="text-sm text-suave">{rotulo}</p>
      <p className="mt-2 flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-tinta font-display font-bold text-fundo">{e}</span>
        <span className="font-semibold leading-snug">{textos[idioma].encaminhamentos[e]}</span>
      </p>
    </div>
  );
}

export function Correcao({ c, caso, atendimento, idioma }: { c: TCorrecao; caso: CasoPublico; atendimento: 1 | 2; idioma: Idioma }) {
  const t = textos[idioma].correcao;
  const nome = nomeDe(caso);
  const achou = c.achados.filter((a) => a.feito).length;
  const anamnese = c.anamnese.filter((a) => a.feito).length;
  const positivos = c.comunicacao.filter((x) => x.tipo === "positivo");
  const melhorar = c.comunicacao.filter((x) => x.tipo === "melhorar");
  const semLlm = c.orientacoes === null;

  return (
    <article className="mx-auto max-w-3xl">
      <header className="grid gap-8 pb-8 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end sm:gap-12">
        <div>
          <p className="text-sm font-semibold text-suave">{t.titulo(atendimento)}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{caso.titulo}</h1>
          <p className="mt-5 flex items-baseline gap-2">
            <span className="font-display text-8xl font-bold leading-none tracking-tighter tabular-nums">{c.nota}</span>
            <span className="font-display text-2xl font-semibold text-suave">/100</span>
          </p>
        </div>
        <ul className="grid gap-4" aria-label={t.partes}>
          <Barra idioma={idioma} nome={t.achados} valor={c.partes.achados} peso={40} />
          <Barra idioma={idioma} nome={t.encaminhamento} valor={c.partes.encaminhamento} peso={20} />
          <Barra idioma={idioma} nome={t.anamnese} valor={c.partes.anamnese} peso={15} />
          <Barra idioma={idioma} nome={t.orientacoes} valor={c.partes.orientacoes} peso={15} />
          <Barra idioma={idioma} nome={t.pergunta} valor={c.partes.pergunta} peso={10} />
        </ul>
      </header>
      {semLlm && (
        <p className="mb-8 rounded-xl border border-linha bg-superficie px-4 py-3 text-sm leading-relaxed text-suave">
          {t.semLlm}
        </p>
      )}

      <Secao titulo={t.achados} placar={t.placarAchados(achou, c.achados.length)}>
        <ul className="grid gap-6">
          {c.achados.map((a) => (
            <Item key={a.id} nome={a.nome} feito={a.feito} sim={t.descobriu} nao={t.passou}>
              {a.feito ? (
                <Citacao rotulo={t.vocePerguntou}>{a.evidencia}</Citacao>
              ) : (
                <div className="mt-3 rounded-xl bg-alarme-suave px-4 py-3">
                  <p className="text-sm font-semibold text-alarme-texto">{t.teriaRevelado}</p>
                  <p className="mt-1 text-[1.05rem] italic leading-relaxed">“{a.evidencia}”</p>
                </div>
              )}
            </Item>
          ))}
        </ul>
      </Secao>

      <Secao titulo={t.encaminhamento} placar={c.acertou ? t.correto : t.diferente}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Opcao idioma={idioma} rotulo={t.voceEscolheu} e={c.escolhido} destaque={c.acertou} />
          <Opcao idioma={idioma} rotulo={t.casoPedia} e={c.correto} destaque />
        </div>
        <div className="mt-4">
          <Selo feito={c.acertou} sim={t.acertou} nao={t.errou} />
        </div>
        <p className="mt-3 max-w-[65ch] leading-relaxed">{c.motivo}</p>
      </Secao>

      <Secao titulo={t.anamneseTitulo} placar={t.placarAnamnese(anamnese, c.anamnese.length)}>
        <ul className="grid gap-6">
          {c.anamnese.map((a) => (
            <Item key={a.id} nome={a.nome} feito={a.feito} sim={t.perguntou} nao={t.faltou}>
              <Citacao rotulo={a.feito ? t.vocePerguntou : t.cobriria}>{a.evidencia}</Citacao>
            </Item>
          ))}
        </ul>
      </Secao>

      <Secao titulo={t.orientacoes} placar={c.orientacoes ? t.placarOrientacoes(c.orientacoes.filter((o) => o.feito).length, c.orientacoes.length) : undefined}>
        {c.orientacoes ? (
          <ul className="grid gap-6">
            {c.orientacoes.map((o) => (
              <Item key={o.id} nome={o.nome} feito={o.feito} sim={t.orientou} nao={t.faltou}>
                {o.feito && o.evidencia && <Citacao rotulo={t.voceDisse}>{o.evidencia}</Citacao>}
              </Item>
            ))}
          </ul>
        ) : (
          <p className="text-suave">{t.naoAvaliadoVisita}</p>
        )}
      </Secao>

      <Secao titulo={t.pergunta}>
        <p className="text-sm text-suave">{t.perguntouNome(nome)}</p>
        <p className="mt-1 font-display text-xl font-semibold leading-snug sm:text-2xl">“{caso.perguntaDoPaciente}”</p>
        {c.respostaPaciente ? (
          <div className="mt-5 grid gap-4">
            <Selo feito={c.respostaPaciente.correta} sim={t.respondeuBem} nao={t.insuficiente} />
            {c.respostaPaciente.citacao ? (
              <Citacao rotulo={t.suaResposta}>{c.respostaPaciente.citacao}</Citacao>
            ) : (
              <p className="text-suave">{t.nenhumaFala}</p>
            )}
            {c.respostaPaciente.comentario && <p className="max-w-[65ch] leading-relaxed">{c.respostaPaciente.comentario}</p>}
            <div className="rounded-xl border border-linha bg-superficie px-4 py-3">
              <p className="text-sm font-semibold text-suave">{t.esperada}</p>
              <p className="mt-1 leading-relaxed">{c.respostaPaciente.esperada}</p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-suave">{t.naoAvaliadoVisita}</p>
        )}
      </Secao>

      {c.comunicacao.length > 0 && (
        <Secao titulo={t.comunicacao} placar={t.semNota}>
          <div className="grid gap-8 sm:grid-cols-2">
            {[
              { titulo: t.funcionou, itens: positivos, feito: true },
              { titulo: t.melhorar, itens: melhorar, feito: false },
            ]
              .filter((g) => g.itens.length > 0)
              .map((g) => (
                <div key={g.titulo}>
                  <h3 className="font-semibold">{g.titulo}</h3>
                  <ul className="mt-3 grid gap-5">
                    {g.itens.map((x, i) => (
                      <li key={i} className={`border-l-[3px] pl-4 ${g.feito ? "border-ok" : "border-alarme"}`}>
                        <p className="leading-relaxed">{x.texto}</p>
                        {x.citacao && <Citacao>{x.citacao}</Citacao>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </Secao>
      )}
    </article>
  );
}
