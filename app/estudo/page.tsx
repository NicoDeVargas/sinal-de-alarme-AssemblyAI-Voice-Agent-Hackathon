import Link from "next/link";
import { sql } from "@/lib/db";
import { CASOS_PRIVADOS } from "@/lib/casos/privado";
import { CASOS_PUBLICOS } from "@/lib/casos/publico";
import { corrigir } from "@/lib/estudo/corrigir";
import { carregarEventos, type LinhaSessao } from "@/lib/estudo/carregar";
import { agregar, type SessaoCorrigida } from "@/lib/estudo/agregar";
import { PAPEIS, type Papel } from "@/lib/casos/tipos";

export const dynamic = "force-dynamic";

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default async function Estudo() {
  const linhas = await sql<LinhaSessao[]>`
    select id, papel, caso_1, caso_2, encaminhamento_1, encaminhamento_2, preparo, tokens
    from sessoes where encaminhamento_2 is not null and lower(apelido) <> 'teste' order by criada_em`;
  const sessoes: SessaoCorrigida[] = [];
  for (const s of linhas) {
    sessoes.push({
      papel: s.papel,
      c1: corrigir(CASOS_PRIVADOS[s.caso_1], CASOS_PUBLICOS[s.caso_1], await carregarEventos(s.id, 1), s.encaminhamento_1!, null),
      c2: corrigir(CASOS_PRIVADOS[s.caso_2], CASOS_PUBLICOS[s.caso_2], await carregarEventos(s.id, 2), s.encaminhamento_2!, null),
      preparo: s.preparo,
      fezPreceptor: false,
    });
  }
  const p = agregar(sessoes);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Sinal de Alarme: o estudo</h1>
      <p>Cada pessoa atende dois pacientes por voz, sem ajuda. Entre um e outro, recebe a correção. A ordem dos casos segue um rodízio entre todas as combinações, para a diferença de dificuldade entre os casos não virar “aprendizado”.</p>
      <p className="text-lg"><b>{p.n}</b> pessoas concluíram.</p>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b"><th className="py-2"></th><th>Atendimento 1</th><th>Atendimento 2</th></tr>
        </thead>
        <tbody>
          <tr className="border-b"><td className="py-2">Nota média</td><td>{Math.round(p.nota1)}</td><td>{Math.round(p.nota2)}</td></tr>
          <tr className="border-b"><td className="py-2">Achados descobertos (média)</td><td>{pct(p.achados1)}</td><td>{pct(p.achados2)}</td></tr>
          <tr className="border-b"><td className="py-2">Encaminhamento correto</td><td>{pct(p.acerto1)}</td><td>{pct(p.acerto2)}</td></tr>
        </tbody>
      </table>
      <p>{p.melhoraram} de {p.n} tiveram nota maior no segundo atendimento.</p>
      {p.preparoMedio !== null && <p>“Me sinto mais preparado(a)”: média {p.preparoMedio.toFixed(1)} de 5.</p>}
      <div>
        <p className="font-medium">Quem participou</p>
        <ul>{(Object.entries(p.porPapel) as [Papel, number][]).map(([papel, n]) => <li key={papel}>{PAPEIS[papel]}: {n}</li>)}</ul>
      </div>
      <div className="text-sm text-suave space-y-1">
        <p>Limites: amostra pequena e por conveniência; no estudo a resposta certa é sempre “urgência”, então o acerto de encaminhamento é métrica secundária; o modelo de linguagem classifica cada pergunta num assunto, e o código é dono dos fatos e da nota.</p>
      </div>
      <Link href="/" className="underline">Fazer o treino</Link>
    </main>
  );
}
