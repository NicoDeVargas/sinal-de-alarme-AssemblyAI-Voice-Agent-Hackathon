import Link from "next/link";
import { sql } from "@/lib/db";
import { CASOS_PRIVADOS } from "@/lib/casos/privado";
import { CASOS_PUBLICOS } from "@/lib/casos/publico";
import { corrigir } from "@/lib/estudo/corrigir";
import { carregarAvaliacoesEm, carregarEventosEm, type LinhaSessao } from "@/lib/estudo/carregar";
import { agregar, type SessaoCorrigida } from "@/lib/estudo/agregar";
import { PAPEIS, type Papel } from "@/lib/casos/tipos";
import { SetaExterna, SetaPara, Topo } from "@/components/ui";

export const dynamic = "force-dynamic";

const pct = (x: number) => `${Math.round(x * 100)}%`;

function LinhaDelta({ rotulo, antes, depois }: { rotulo: string; antes: React.ReactNode; depois: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 border-t border-linha py-4">
      <dt className="font-semibold">{rotulo}</dt>
      <dd className="flex items-baseline gap-3 tabular-nums">
        <span className="text-suave">{antes}</span>
        <SetaPara />
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

export default async function Estudo() {
  const linhas = await sql<LinhaSessao[]>`
    select id, papel, caso_1, caso_2, encaminhamento_1, encaminhamento_2, preparo, tokens, preceptor_segundos
    from sessoes where encaminhamento_2 is not null and lower(apelido) <> 'teste' order by criada_em`;
  const ids = linhas.map((l) => l.id);
  const [eventosPorSessao, avaliacoesPorSessao] = await Promise.all([carregarEventosEm(ids), carregarAvaliacoesEm(ids)]);
  const sessoes: SessaoCorrigida[] = linhas.map((s) => ({
    papel: s.papel,
    c1: corrigir(CASOS_PRIVADOS[s.caso_1], CASOS_PUBLICOS[s.caso_1], eventosPorSessao.get(`${s.id}:1`) ?? [], s.encaminhamento_1!, avaliacoesPorSessao.get(`${s.id}:1`) ?? null),
    c2: corrigir(CASOS_PRIVADOS[s.caso_2], CASOS_PUBLICOS[s.caso_2], eventosPorSessao.get(`${s.id}:2`) ?? [], s.encaminhamento_2!, avaliacoesPorSessao.get(`${s.id}:2`) ?? null),
    preparo: s.preparo,
    fezPreceptor: (s.preceptor_segundos ?? 0) > 0,
  }));
  const p = agregar(sessoes);

  return (
    <>
      <Topo>
        <Link href="/" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-suave hover:text-tinta">
          Fazer o treino
          <SetaExterna />
        </Link>
      </Topo>
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">O estudo em números</h1>
        <p className="mt-4 max-w-[60ch] leading-relaxed text-suave">
          Cada pessoa atende dois pacientes por voz, sem ajuda. Entre uma visita e outra, recebe a correção e pode conversar com um preceptor virtual. A ordem dos dois casos segue um rodízio entre as 20 combinações possíveis, para a diferença de dificuldade entre os casos não virar “aprendizado”.
        </p>

        {p.n === 0 ? (
          <p className="mt-10 rounded-2xl border border-linha bg-superficie px-5 py-8 text-center text-lg text-suave">Ainda sem participantes.</p>
        ) : (
          <>
            <div className="mt-10 rounded-2xl border border-linha bg-superficie p-5 sm:p-8">
              <Numero rotulo={p.n === 1 ? "pessoa concluiu as duas visitas" : "pessoas concluíram as duas visitas"} valor={String(p.n)} />
              <dl className="mt-2">
                <LinhaDelta rotulo="Nota média" antes={Math.round(p.nota1)} depois={Math.round(p.nota2)} />
                <LinhaDelta rotulo="Achados críticos descobertos" antes={pct(p.achados1)} depois={pct(p.achados2)} />
                <LinhaDelta rotulo="Encaminhamento correto" antes={pct(p.acerto1)} depois={pct(p.acerto2)} />
              </dl>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-linha bg-superficie p-5 sm:p-6">
                <Numero rotulo={p.melhoraram === 1 ? "de 1 teve nota maior na segunda visita" : `de ${p.n} tiveram nota maior na segunda visita`} valor={String(p.melhoraram)} />
              </div>
              <div className="rounded-2xl border border-linha bg-superficie p-5 sm:p-6">
                <Numero rotulo={p.fizeramPreceptor === 1 ? "pessoa conversou com o preceptor" : "pessoas conversaram com o preceptor"} valor={String(p.fizeramPreceptor)} />
              </div>
            </div>

            {p.preparoMedio !== null && (
              <p className="mt-6 leading-relaxed">
                “Me sinto mais preparado(a) para reconhecer um sinal de alarme”: média <b className="font-display tabular-nums">{p.preparoMedio.toFixed(1)}</b> de 5.
              </p>
            )}

            <div className="mt-8">
              <p className="font-semibold">Quem participou</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {(Object.entries(p.porPapel) as [Papel, number][]).map(([papel, n]) => (
                  <li key={papel} className="flex items-center justify-between gap-4 border-t border-linha py-2">
                    <span>{PAPEIS[papel]}</span>
                    <span className="font-semibold tabular-nums">{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        <section className="mt-12 border-t border-linha pt-8">
          <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Como funciona o estudo</h2>
          <div className="mt-4 grid gap-4 leading-relaxed text-suave">
            <p>Cada participante faz duas visitas por voz, sozinho, sem ajuda. Entre as duas, recebe a correção da primeira visita e pode conversar por até três minutos com um preceptor virtual antes de seguir para a segunda.</p>
            <p>A ordem dos dois casos sorteados segue um rodízio balanceado entre as 20 combinações possíveis, para que a dificuldade de cada caso não se confunda com o efeito de aprender entre uma visita e outra.</p>
            <p>A nota de cada visita soma cinco partes: achados críticos (40 pontos), encaminhamento (20), anamnese essencial (15), orientações dadas ao paciente (15) e a resposta a uma pergunta do paciente (10). As duas últimas dependem de um modelo de linguagem, que só marca um item como cumprido quando encontra uma citação da própria conversa que comprove isso.</p>
          </div>
        </section>

        <section className="mt-8 border-t border-linha pt-8">
          <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">Limites</h2>
          <div className="mt-4 grid gap-4 leading-relaxed text-suave">
            <p>Amostra pequena e por conveniência, sem grupo de controle: os números acima descrevem quem participou até agora, não uma população.</p>
            <p>As notas de orientações e da resposta ao paciente vêm de um modelo de linguagem, que avalia com base numa citação verificada da conversa, não numa leitura humana.</p>
            <p>O mesmo modelo classifica cada pergunta feita pelo participante dentro de um assunto da ficha do caso, e essa classificação pode errar.</p>
            <p>O conteúdo dos casos clínicos é uma minuta ainda não revisada por um profissional de saúde.</p>
            <p>Todos os pacientes falam com a mesma voz masculina, o que não representa a diversidade real de pacientes.</p>
          </div>
        </section>
      </main>
    </>
  );
}
