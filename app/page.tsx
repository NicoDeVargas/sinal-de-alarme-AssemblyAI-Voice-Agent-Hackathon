"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PAPEIS, type Papel } from "@/lib/casos/tipos";

export default function Abertura() {
  const router = useRouter();
  const [apelido, setApelido] = useState("");
  const [papel, setPapel] = useState<Papel>("acs");
  const [consentimento, setConsentimento] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function comecar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const r = await fetch("/api/sessoes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ apelido, papel, consentimento }),
    });
    const corpo = await r.json();
    if (!r.ok) {
      setErro(corpo.erro ?? "Não foi possível começar.");
      setEnviando(false);
      return;
    }
    router.push(`/s/${corpo.id}`);
  }

  return (
    <main className="mx-auto max-w-xl p-6 space-y-6">
      <h1 className="text-3xl font-bold">Sinal de Alarme</h1>
      <p>Você vai fazer duas visitas domiciliares por voz a pacientes com suspeita de dengue. Converse, descubra o que está acontecendo e decida o encaminhamento. Leva uns 15 minutos. Use fone ou fique num lugar silencioso.</p>
      <form onSubmit={comecar} className="space-y-4">
        <label className="block">
          <span className="block font-medium">Apelido</span>
          <input value={apelido} onChange={(e) => setApelido(e.target.value)} maxLength={40} required className="mt-1 w-full rounded border p-2" />
        </label>
        <label className="block">
          <span className="block font-medium">Você é</span>
          <select value={papel} onChange={(e) => setPapel(e.target.value as Papel)} className="mt-1 w-full rounded border p-2">
            {Object.entries(PAPEIS).map(([v, rotulo]) => <option key={v} value={v}>{rotulo}</option>)}
          </select>
        </label>
        <label className="flex gap-2 items-start">
          <input type="checkbox" checked={consentimento} onChange={(e) => setConsentimento(e.target.checked)} required className="mt-1" />
          <span>Concordo que minha voz seja processada e gravada pela AssemblyAI durante os atendimentos, e que minhas respostas entrem, sem meu apelido, no painel público do estudo.</span>
        </label>
        {erro && <p className="text-red-700">{erro}</p>}
        <button disabled={enviando} className="w-full rounded bg-red-700 p-3 font-semibold text-white disabled:opacity-50">Começar</button>
      </form>
      <a href="/estudo" className="underline">Ver o painel do estudo</a>
    </main>
  );
}
