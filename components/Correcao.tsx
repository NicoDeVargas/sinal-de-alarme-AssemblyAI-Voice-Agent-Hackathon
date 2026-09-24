import { ENCAMINHAMENTOS, type Correcao as TCorrecao } from "@/lib/casos/tipos";

export function Correcao({ c }: { c: TCorrecao }) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">Nota {c.nota}</h2>
      <p>Você descobriu {c.achados.filter((a) => a.feito).length} de {c.achados.length} achados</p>
      <ul className="space-y-3">
        {c.achados.map((s) => (
          <li key={s.id} className={`rounded border-l-4 p-3 ${s.feito ? "border-green-600 bg-green-50" : "border-red-600 bg-red-50"}`}>
            <p className="font-semibold">{s.feito ? "Descoberto" : "Passou"}: {s.nome}</p>
            <p className="text-sm">{s.feito ? `Você perguntou: “${s.evidencia}”` : `Uma pergunta que revelaria: “${s.evidencia}”`}</p>
          </li>
        ))}
      </ul>
      <p><b>Seu encaminhamento:</b> {c.escolhido}. {ENCAMINHAMENTOS[c.escolhido]} {c.acertou ? "✓" : "✗"}</p>
      <p><b>Correto:</b> {c.correto}. {ENCAMINHAMENTOS[c.correto]}</p>
      <p>{c.motivo}</p>
    </section>
  );
}
