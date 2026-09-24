import { ENCAMINHAMENTOS, type Correcao as TCorrecao } from "@/lib/casos/tipos";

export function Correcao({ c }: { c: TCorrecao }) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">Você descobriu {c.descobertos} de {c.total} sinais de alarme</h2>
      <ul className="space-y-3">
        {c.sinais.map((s) => (
          <li key={s.id} className={`rounded border-l-4 p-3 ${s.descoberto ? "border-green-600 bg-green-50" : "border-red-600 bg-red-50"}`}>
            <p className="font-semibold">{s.descoberto ? "Descoberto" : "Passou"}: {s.nome}</p>
            <p className="text-sm">{s.descoberto ? `Você perguntou: “${s.evidencia}”` : `Uma pergunta que revelaria: “${s.evidencia}”`}</p>
          </li>
        ))}
      </ul>
      <p><b>Seu encaminhamento:</b> {c.escolhido}. {ENCAMINHAMENTOS[c.escolhido]} {c.acertou ? "✓" : "✗"}</p>
      <p><b>Correto:</b> {c.correto}. {ENCAMINHAMENTOS[c.correto]}</p>
      <p>{c.motivo}</p>
    </section>
  );
}
