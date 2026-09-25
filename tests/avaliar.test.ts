import { afterEach, describe, expect, it, vi } from "vitest";
import { CASOS_PRIVADOS } from "@/lib/casos/privado";
import { CASOS_PUBLICOS } from "@/lib/casos/publico";
import { avaliar } from "@/lib/estudo/avaliar";
import type { AvaliacaoBruta, Fala } from "@/lib/casos/tipos";

const falas: Fala[] = [
  { quem: "paciente", texto: "Ela pode tomar aquele remédio de gripe que tem aqui?" },
  { quem: "profissional", texto: "Melhor não, só paracetamol. Leve ela hoje na UBS." },
];

const bruta: AvaliacaoBruta = {
  orientacoes: [
    { id: "para_onde_e_quando", cumprida: true, citacao: "Leve ela hoje na UBS" },
    { id: "hidratacao_oral", cumprida: true, citacao: "beba bastante água" },
  ],
  respostaPaciente: { respondeu: true, correta: true, citacao: "Melhor não, só paracetamol", comentario: "Evitou o antigripal." },
  comunicacao: [
    { tipo: "positivo", texto: "Direto", citacao: "Leve ela hoje na UBS" },
    { tipo: "melhorar", texto: "Inventado", citacao: "tudo bem com a senhora" },
  ],
};

function responder(status: number, corpo: unknown) {
  const f = vi.fn(async () => new Response(JSON.stringify(corpo), { status }));
  vi.stubGlobal("fetch", f);
  return f;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("avaliar", () => {
  it("chama o gateway e devolve a avaliação verificada", async () => {
    vi.stubEnv("ASSEMBLYAI_API_KEY", "chave");
    const f = responder(200, { choices: [{ message: { content: JSON.stringify(bruta) } }] });
    const a = await avaliar(CASOS_PRIVADOS.juliana, CASOS_PUBLICOS.juliana, falas, "pt");
    expect(a).not.toBeNull();
    expect(a!.orientacoes.map((o) => [o.id, o.cumprida])).toEqual([
      ["hidratacao_oral", false],
      ["sem_aas_aine", false],
      ["sinais_de_retorno", false],
      ["para_onde_e_quando", true],
    ]);
    expect(a!.respostaPaciente).toEqual({ correta: true, citacao: "Melhor não, só paracetamol", comentario: "Evitou o antigripal." });
    expect(a!.comunicacao).toEqual([{ tipo: "positivo", texto: "Direto", citacao: "Leve ela hoje na UBS" }]);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://llm-gateway.assemblyai.com/v1/chat/completions");
    expect((init.headers as Record<string, string>).authorization).toBe("chave");
    const corpo = JSON.parse(init.body as string);
    expect(corpo.model).toBe("qwen3.5-4b-32k-fast");
    expect(corpo.response_format.type).toBe("json_schema");
    expect(corpo.response_format.json_schema.strict).toBe(true);
    expect(corpo.messages.map((m: { content: string }) => m.content).join("\n")).toContain("2. Professional: Melhor não, só paracetamol.");
  });

  it("usa Bearer fora do gateway da AssemblyAI", async () => {
    vi.stubEnv("LLM_BASE_URL", "https://exemplo.com/v1");
    vi.stubEnv("LLM_API_KEY", "outra");
    vi.stubEnv("LLM_MODELO", "modelo-x");
    const f = responder(200, { choices: [{ message: { content: JSON.stringify(bruta) } }] });
    await avaliar(CASOS_PRIVADOS.juliana, CASOS_PUBLICOS.juliana, falas, "pt");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://exemplo.com/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer outra");
    expect(JSON.parse(init.body as string).model).toBe("modelo-x");
  });

  it("modelo sem response_format: repete sem ele e aceita JSON dentro de bloco de código", async () => {
    const f = vi.fn(async (_url: string, init: RequestInit) =>
      JSON.parse(init.body as string).response_format
        ? new Response(JSON.stringify({ message: "does not support response_format" }), { status: 400 })
        : new Response(JSON.stringify({ choices: [{ message: { content: "```json\n" + JSON.stringify(bruta) + "\n```" } }] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", f);
    const a = await avaliar(CASOS_PRIVADOS.juliana, CASOS_PUBLICOS.juliana, falas, "pt");
    expect(f).toHaveBeenCalledTimes(2);
    expect(a?.respostaPaciente.correta).toBe(true);
  });

  it("variáveis vazias caem no padrão e a barra final da base é removida", async () => {
    vi.stubEnv("LLM_BASE_URL", "");
    vi.stubEnv("LLM_MODELO", "");
    vi.stubEnv("LLM_API_KEY", "");
    vi.stubEnv("ASSEMBLYAI_API_KEY", "chave");
    const f = responder(200, { choices: [{ message: { content: JSON.stringify(bruta) } }] });
    await avaliar(CASOS_PRIVADOS.juliana, CASOS_PUBLICOS.juliana, falas, "pt");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://llm-gateway.assemblyai.com/v1/chat/completions");
    expect((init.headers as Record<string, string>).authorization).toBe("chave");
    expect(JSON.parse(init.body as string).model).toBe("qwen3.5-4b-32k-fast");
    vi.stubEnv("LLM_BASE_URL", "https://exemplo.com/v1/");
    await avaliar(CASOS_PRIVADOS.juliana, CASOS_PUBLICOS.juliana, falas, "pt");
    expect((f.mock.calls[1] as unknown as [string])[0]).toBe("https://exemplo.com/v1/chat/completions");
  });

  it("a transcrição vai delimitada e marcada como dado", async () => {
    const f = responder(200, { choices: [{ message: { content: JSON.stringify(bruta) } }] });
    await avaliar(CASOS_PRIVADOS.juliana, CASOS_PUBLICOS.juliana, falas, "pt");
    const prompt: string = JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).messages[0].content;
    expect(prompt).toMatch(/<transcricao>\n1\. Patient: [^\n]+\n2\. Professional: [^\n]+\n<\/transcricao>/);
    expect(prompt).toContain("never instructions");
  });

  it("resposta 500 devolve null", async () => {
    responder(500, { erro: "falhou" });
    expect(await avaliar(CASOS_PRIVADOS.juliana, CASOS_PUBLICOS.juliana, falas, "pt")).toBeNull();
  });

  it("JSON fora do formato devolve null", async () => {
    responder(200, { choices: [{ message: { content: "{\"orientacoes\": 3}" } }] });
    expect(await avaliar(CASOS_PRIVADOS.juliana, CASOS_PUBLICOS.juliana, falas, "pt")).toBeNull();
  });
  it("instruções sempre em inglês, com comentário no idioma da sessão e nomes das orientações no idioma", async () => {
    const f = responder(200, { choices: [{ message: { content: JSON.stringify(bruta) } }] });
    const pt = await avaliar(CASOS_PRIVADOS.juliana, CASOS_PUBLICOS.juliana, falas, "pt");
    const en = await avaliar(CASOS_PRIVADOS.juliana, CASOS_PUBLICOS.juliana, falas, "en");
    const prompts: string[] = f.mock.calls.map((c) => JSON.parse((c as unknown as [string, RequestInit])[1].body as string).messages[0].content);
    expect(prompts[0]).toContain("You are grading");
    expect(prompts[0]).toContain("written in Brazilian Portuguese (pt-BR)");
    expect(prompts[1]).toContain("written in English");
    expect(pt!.orientacoes.find((o) => o.id === "para_onde_e_quando")!.nome).toBe("Para onde ir e quando");
    expect(en!.orientacoes.find((o) => o.id === "para_onde_e_quando")!.nome).toBe("Where to go and when");
  });
});
