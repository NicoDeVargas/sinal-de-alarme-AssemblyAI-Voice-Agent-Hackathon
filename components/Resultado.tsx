"use client";
import { useState } from "react";
import type { Correcao } from "@/lib/casos/tipos";

export function Resultado({ sessaoId, c1, c2, preparoInicial }: { sessaoId: string; c1: Correcao; c2: Correcao; preparoInicial: number | null }) {
  const [preparo, setPreparo] = useState(preparoInicial);
  const [erro, setErro] = useState("");

  async function responder(n: number) {
    setErro("");
    const r = await fetch(`/api/sessoes/${sessaoId}/preparo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ preparo: n }),
    });
    if (r.ok) setPreparo(n);
    else setErro("Não foi possível salvar. Tente de novo.");
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">Seu resultado</h2>
      <p>Atendimento 1: {c1.descobertos} de {c1.total} sinais · encaminhamento {c1.acertou ? "certo" : "errado"}</p>
      <p>Atendimento 2: {c2.descobertos} de {c2.total} sinais · encaminhamento {c2.acertou ? "certo" : "errado"}</p>
      {preparo === null ? (
        <div className="space-y-2">
          <p className="font-medium">Você se sente mais preparado(a) para reconhecer um sinal de alarme? (1 = nada, 5 = muito)</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => responder(n)} className="h-12 w-12 rounded border font-semibold hover:bg-gray-50">{n}</button>
            ))}
          </div>
          {erro && <p className="text-red-700">{erro}</p>}
        </div>
      ) : (
        <p>Obrigado! <a href="/estudo" className="underline">Ver o painel do estudo</a></p>
      )}
    </section>
  );
}
