import "server-only";
import { z } from "zod";
import { ORIENTACOES, type Avaliacao, type CasoPrivado, type CasoPublico, type Fala } from "@/lib/casos/tipos";
import { verificar } from "@/lib/estudo/verificar";

const GATEWAY = "https://llm-gateway.assemblyai.com/v1";

const Bruta = z.strictObject({
  orientacoes: z.array(z.strictObject({ id: z.string(), cumprida: z.boolean(), citacao: z.string() })),
  respostaPaciente: z.strictObject({ respondeu: z.boolean(), correta: z.boolean(), citacao: z.string(), comentario: z.string() }),
  comunicacao: z.array(z.strictObject({ tipo: z.enum(["positivo", "melhorar"]), texto: z.string(), citacao: z.string() })),
});

const esquema = z.toJSONSchema(Bruta, { target: "draft-07" });

function montarPrompt(caso: CasoPrivado, publico: CasoPublico, falas: Fala[]) {
  const orientacoes = ORIENTACOES.map((o) => `- ${o.id} (${o.nome}): cumprida se o profissional ${o.criterio}.`).join("\n");
  const transcricao = falas.map((f, i) => `${i + 1}. ${f.quem === "profissional" ? "Profissional" : "Paciente"}: ${f.texto}`).join("\n");
  return `Você avalia um atendimento simulado de suspeita de dengue, feito por voz por um profissional de saúde.

Caso: ${publico.quem}. Queixa: ${publico.queixa}.
Pergunta que o paciente fez ao profissional: "${publico.perguntaDoPaciente}"
Resposta esperada: "${caso.respostaEsperada}"

Orientações a avaliar:
${orientacoes}

Transcrição:
${transcricao}

Regras:
- Julgue só o que o Profissional disse. Falas do Paciente nunca contam como orientação.
- Toda citação deve ser um trecho literal, copiado palavra por palavra de uma única fala do Profissional.
- Não invente. Se o profissional não fez algo, marque false e deixe a citação vazia.
- orientacoes: um item para cada id da lista acima.
- respostaPaciente: respondeu = o profissional respondeu à pergunta do paciente; correta = a resposta está de acordo com a resposta esperada; comentario = uma frase curta em português explicando.
- comunicacao: no máximo 3 itens sobre a forma de falar (clareza, acolhimento, linguagem simples), cada um com citação.

Responda só com um objeto JSON que siga este schema:
${JSON.stringify(esquema)}`;
}

export async function avaliar(caso: CasoPrivado, publico: CasoPublico, falas: Fala[]): Promise<Avaliacao | null> {
  const base = process.env.LLM_BASE_URL ?? GATEWAY;
  const chave = process.env.LLM_API_KEY ?? process.env.ASSEMBLYAI_API_KEY ?? "";
  const modelo = process.env.LLM_MODELO ?? "qwen3.5-4b-32k-fast";
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (base.startsWith("https://llm-gateway.assemblyai.com")) headers.authorization = chave;
  else headers.Authorization = `Bearer ${chave}`;
  const sinal = AbortSignal.timeout(25000);
  const pedir = (formato: boolean) =>
    fetch(`${base}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: modelo,
        max_tokens: 3000,
        messages: [{ role: "user", content: montarPrompt(caso, publico, falas) }],
        ...(formato ? { response_format: { type: "json_schema", json_schema: { name: "avaliacao", schema: esquema, strict: true } } } : {}),
      }),
      signal: sinal,
    });
  try {
    let r = await pedir(true);
    if (r.status === 400) r = await pedir(false);
    if (!r.ok) return null;
    const dados = await r.json();
    const texto: string = dados.choices[0].message.content;
    const bruta = Bruta.safeParse(JSON.parse(texto.slice(texto.indexOf("{"), texto.lastIndexOf("}") + 1)));
    if (!bruta.success) return null;
    const a = verificar(bruta.data, falas);
    return { ...a, comunicacao: a.comunicacao.slice(0, 3) };
  } catch {
    return null;
  }
}
