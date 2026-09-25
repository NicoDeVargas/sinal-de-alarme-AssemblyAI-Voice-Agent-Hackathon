"use client";
import { ENCAMINHAMENTOS, type CasoPublico, type Correcao as TCorrecao, type Encaminhamento } from "@/lib/casos/tipos";
import { Citacao, Selo } from "./ui";

const pts = (x: number) => x.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

function Barra({ nome, valor, peso }: { nome: string; valor: number | null; peso: number }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[11rem_minmax(0,1fr)_5.5rem]">
      <span className="font-semibold">{nome}</span>
      <span className="text-right text-sm tabular-nums text-suave sm:order-last">
        {valor === null ? "não avaliado" : (
          <>
            <b className="font-display text-lg text-tinta">{pts(valor)}</b> de <span className="font-display">{peso}</span>
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

function Opcao({ rotulo, e, destaque }: { rotulo: string; e: Encaminhamento; destaque: boolean }) {
  return (
    <div className={`rounded-2xl border-2 p-4 ${destaque ? "border-tinta" : "border-alarme/50"}`}>
      <p className="text-sm text-suave">{rotulo}</p>
      <p className="mt-2 flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-tinta font-display font-bold text-fundo">{e}</span>
        <span className="font-semibold leading-snug">{ENCAMINHAMENTOS[e]}</span>
      </p>
    </div>
  );
}

export function Correcao({ c, caso, atendimento }: { c: TCorrecao; caso: CasoPublico; atendimento: 1 | 2 }) {
  const nome = caso.quem.split(",")[0];
  const achou = c.achados.filter((a) => a.feito).length;
  const anamnese = c.anamnese.filter((a) => a.feito).length;
  const positivos = c.comunicacao.filter((x) => x.tipo === "positivo");
  const melhorar = c.comunicacao.filter((x) => x.tipo === "melhorar");
  const semLlm = c.orientacoes === null;

  return (
    <article className="mx-auto max-w-3xl">
      <header className="grid gap-8 pb-8 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end sm:gap-12">
        <div>
          <p className="text-sm font-semibold text-suave">Correção da visita {atendimento}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{caso.titulo}</h1>
          <p className="mt-5 flex items-baseline gap-2">
            <span className="font-display text-8xl font-bold leading-none tracking-tighter tabular-nums">{c.nota}</span>
            <span className="font-display text-2xl font-semibold text-suave">/100</span>
          </p>
        </div>
        <ul className="grid gap-4" aria-label="Partes da nota">
          <Barra nome="Achados críticos" valor={c.partes.achados} peso={40} />
          <Barra nome="Encaminhamento" valor={c.partes.encaminhamento} peso={20} />
          <Barra nome="Anamnese" valor={c.partes.anamnese} peso={15} />
          <Barra nome="Orientações" valor={c.partes.orientacoes} peso={15} />
          <Barra nome="Pergunta do paciente" valor={c.partes.pergunta} peso={10} />
        </ul>
      </header>
      {semLlm && (
        <p className="mb-8 rounded-xl border border-linha bg-superficie px-4 py-3 text-sm leading-relaxed text-suave">
          Não conseguimos avaliar as orientações e a resposta à pergunta desta vez. A nota foi calculada só com achados, encaminhamento e anamnese.
        </p>
      )}

      <Secao titulo="Achados críticos" placar={`${achou} de ${c.achados.length} descobertos`}>
        <ul className="grid gap-6">
          {c.achados.map((a) => (
            <Item key={a.id} nome={a.nome} feito={a.feito} sim="Descobriu" nao="Passou">
              {a.feito ? (
                <Citacao rotulo="Você perguntou">{a.evidencia}</Citacao>
              ) : (
                <div className="mt-3 rounded-xl bg-alarme-suave px-4 py-3">
                  <p className="text-sm font-semibold text-alarme-texto">O que teria revelado</p>
                  <p className="mt-1 text-[1.05rem] italic leading-relaxed">“{a.evidencia}”</p>
                </div>
              )}
            </Item>
          ))}
        </ul>
      </Secao>

      <Secao titulo="Encaminhamento" placar={c.acertou ? "Correto" : "Diferente do esperado"}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Opcao rotulo="Você escolheu" e={c.escolhido} destaque={c.acertou} />
          <Opcao rotulo="O caso pedia" e={c.correto} destaque />
        </div>
        <div className="mt-4">
          <Selo feito={c.acertou} sim="Você acertou o encaminhamento" nao="Encaminhamento diferente do correto" />
        </div>
        <p className="mt-3 max-w-[65ch] leading-relaxed">{c.motivo}</p>
      </Secao>

      <Secao titulo="Anamnese essencial" placar={`${anamnese} de ${c.anamnese.length} perguntados`}>
        <ul className="grid gap-6">
          {c.anamnese.map((a) => (
            <Item key={a.id} nome={a.nome} feito={a.feito} sim="Perguntou" nao="Faltou">
              <Citacao rotulo={a.feito ? "Você perguntou" : "Pergunta que cobriria"}>{a.evidencia}</Citacao>
            </Item>
          ))}
        </ul>
      </Secao>

      <Secao titulo="Orientações" placar={c.orientacoes ? `${c.orientacoes.filter((o) => o.feito).length} de ${c.orientacoes.length} dadas` : undefined}>
        {c.orientacoes ? (
          <ul className="grid gap-6">
            {c.orientacoes.map((o) => (
              <Item key={o.id} nome={o.nome} feito={o.feito} sim="Orientou" nao="Faltou">
                {o.feito && o.evidencia && <Citacao rotulo="Você disse">{o.evidencia}</Citacao>}
              </Item>
            ))}
          </ul>
        ) : (
          <p className="text-suave">Não avaliado nesta visita.</p>
        )}
      </Secao>

      <Secao titulo="Pergunta do paciente">
        <p className="text-sm text-suave">{nome} perguntou</p>
        <p className="mt-1 font-display text-xl font-semibold leading-snug sm:text-2xl">“{caso.perguntaDoPaciente}”</p>
        {c.respostaPaciente ? (
          <div className="mt-5 grid gap-4">
            <Selo feito={c.respostaPaciente.correta} sim="Respondeu bem" nao="Resposta insuficiente" />
            {c.respostaPaciente.citacao ? (
              <Citacao rotulo="Sua resposta">{c.respostaPaciente.citacao}</Citacao>
            ) : (
              <p className="text-suave">Nenhuma fala sua foi confirmada como resposta a essa pergunta.</p>
            )}
            {c.respostaPaciente.comentario && <p className="max-w-[65ch] leading-relaxed">{c.respostaPaciente.comentario}</p>}
            <div className="rounded-xl border border-linha bg-superficie px-4 py-3">
              <p className="text-sm font-semibold text-suave">Resposta esperada</p>
              <p className="mt-1 leading-relaxed">{c.respostaPaciente.esperada}</p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-suave">Não avaliado nesta visita.</p>
        )}
      </Secao>

      {c.comunicacao.length > 0 && (
        <Secao titulo="Comunicação" placar="sem nota">
          <div className="grid gap-8 sm:grid-cols-2">
            {[
              { titulo: "O que funcionou", itens: positivos, feito: true },
              { titulo: "Para melhorar", itens: melhorar, feito: false },
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
