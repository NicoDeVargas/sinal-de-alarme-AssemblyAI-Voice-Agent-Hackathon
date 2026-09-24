# Sinal de Alarme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App web de treino por voz em que profissionais de saúde entrevistam um paciente simulado (AssemblyAI Voice Agent API) para descobrir sinais de alarme da dengue. A correção é determinística, e um painel público mostra o antes/depois.

**Architecture:** Next.js (App Router) na Vercel. O navegador abre o WebSocket da Voice Agent API com token temporário e configuração inline montada pelo servidor. Os fatos escondidos do paciente vivem só no servidor: o modelo pede cada fato pela tool client-side `consultar_ficha(assunto)`, o navegador repassa para `/api/ficha`, e o servidor devolve o fato e grava o evento no Postgres (Supabase). A correção é uma função pura sobre os eventos gravados.

**Tech Stack:** Next.js + TypeScript + Tailwind, Vitest, `postgres` (porsager) contra o Supabase, `zod`, AssemblyAI Voice Agent API (`wss://agents.assemblyai.com/v1/ws`), Vercel.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-24-sinal-de-alarme-design.md`. Ler antes de qualquer tarefa.
- Toda a interface e todo o conteúdo em português do Brasil. Identificadores de código em português, como no spec (`corrigir`, `ficha`, `sessoes`, `eventos`).
- Código simples e **sem comentários**.
- Voz: `rafael`. `language_codes: ["pt"]`. Modelo: o gerenciado padrão da AssemblyAI, **sem** campo `llm`.
- Casos do estudo: somente `davi`, `joaquim` e `rafa`. Resposta certa de todos: `C`.
- Encaminhamentos: `A` = hidratação + UBS para avaliação; `B` = UBS hoje, com prioridade; `C` = urgência agora.
- Fatos escondidos (`lib/casos/privado.ts`) nunca chegam ao navegador nem a um *system prompt*. O arquivo importa `server-only`.
- A chave `ASSEMBLYAI_API_KEY` só existe no servidor.
- Apelido nunca aparece em `/estudo`.
- Variáveis de ambiente: `ASSEMBLYAI_API_KEY`, `DATABASE_URL` (pooler do Supabase em modo transação, porta 6543), `IP_SALT`.
- **Commits:** a mensagem é sempre do Nicolas, sem `Co-Authored-By`. Identidade: `Nicolas de Vargas <contato.nicodevargas@gmail.com>`, já configurada no repositório. As mensagens de commit abaixo são sugestões que precisam da aprovação dele.
- Prazo: envio na lablab até 29/09/2026. O app precisa estar no ar na Vercel ao fim da Task 5.

## File Structure

```
lib/casos/tipos.ts        tipos de domínio (Assunto, CasoId, Encaminhamento, CasoPublico, CasoPrivado, Evento, Correcao)
lib/casos/publico.ts      persona, queixa, saudação e contexto dos 3 casos (pode ir ao navegador)
lib/casos/privado.ts      ficha, sinais, encaminhamento e motivo (server-only)
lib/casos/prompt.ts       montarSessao(caso) -> objeto `session` do session.update
lib/estudo/ficha.ts       resolverFicha(caso, assunto) -> { resposta, sinal }
lib/estudo/corrigir.ts    corrigir(caso, eventos, escolhido) -> Correcao
lib/estudo/pares.ts       PARES, parDaVez(n)
lib/estudo/agregar.ts     agregar(atendimentos) -> Painel
lib/db.ts                 cliente postgres
lib/ip.ts                 hashIp(request)
db/schema.sql             tabelas
scripts/migrar.mjs        aplica db/schema.sql
app/api/sessoes/route.ts                                 POST cria sessão
app/api/sessoes/[id]/route.ts                            GET estado da sessão
app/api/sessoes/[id]/atendimentos/[n]/config/route.ts    GET session.update do atendimento
app/api/sessoes/[id]/preparo/route.ts                    POST resposta final
app/api/token/route.ts                                   POST token temporário
app/api/ficha/route.ts                                   POST fato + evento
app/api/decisao/route.ts                                 POST encaminhamento -> Correcao
lib/voz/fila.ts           fila de tool.result (pura, testada)
lib/voz/audio.ts          captura e reprodução PCM16 24 kHz
lib/voz/conversa.ts       iniciarConversa(): protocolo do WebSocket
public/pcm-processor.js   AudioWorklet com reamostragem
app/page.tsx              abertura
app/s/[id]/page.tsx       fluxo da sessão
components/Atendimento.tsx, components/Correcao.tsx, components/Resultado.tsx
app/estudo/page.tsx       painel público
tests/*.test.ts
```

---

### Task 1: Esqueleto, domínio e conteúdo dos casos

**Files:**
- Create: projeto Next.js na raiz, `vitest.config.ts`, `tests/vazio.ts`, `lib/casos/tipos.ts`, `lib/casos/publico.ts`, `lib/casos/privado.ts`, `lib/casos/prompt.ts`
- Test: `tests/prompt.test.ts`

**Interfaces:**
- Produces: todos os tipos de `lib/casos/tipos.ts`; `CASOS_PUBLICOS: Record<CasoId, CasoPublico>`; `CASOS_PRIVADOS: Record<CasoId, CasoPrivado>`; `ASSUNTOS: readonly Assunto[]`; `montarSessao(caso: CasoPublico): SessaoVoz`.

- [ ] **Step 1: Criar o projeto Next.js ao lado dos docs**

A raiz já tem `.git` e `docs/`, então o projeto nasce numa pasta temporária e depois é movido.

```bash
cd ~/dev/sinal-de-alarme
npx create-next-app@latest tmp-app --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes
rm -rf tmp-app/.git
cp -r tmp-app/. .
rm -rf tmp-app
npm i postgres zod server-only
npm i -D vitest
```

Em `package.json`, dentro de `"scripts"`, acrescentar `"test": "vitest run"` e `"migrar": "node scripts/migrar.mjs"`.

- [ ] **Step 2: Configurar o Vitest**

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      "server-only": path.resolve(__dirname, "tests/vazio.ts"),
    },
  },
  test: { include: ["tests/**/*.test.ts"] },
});
```

`tests/vazio.ts`:

```ts
export {};
```

- [ ] **Step 3: Tipos de domínio**

`lib/casos/tipos.ts`:

```ts
export const ASSUNTOS = [
  "sangramento",
  "vomito",
  "dor_abdominal",
  "tontura_desmaio",
  "sonolencia_irritabilidade",
  "falta_de_ar_inchaco",
  "urina",
  "evolucao_da_febre",
  "gestacao",
  "doencas_e_remedios",
  "idade",
  "alimentacao_hidratacao",
  "outro",
] as const;

export type Assunto = (typeof ASSUNTOS)[number];
export type CasoId = "davi" | "joaquim" | "rafa";
export type Encaminhamento = "A" | "B" | "C";
export type Papel = "acs" | "tecnico_enfermagem" | "estudante_medicina" | "estudante_enfermagem" | "outro";

export const ENCAMINHAMENTOS: Record<Encaminhamento, string> = {
  A: "Hidratação e ir à UBS para avaliação",
  B: "UBS hoje, com prioridade",
  C: "Urgência agora",
};

export const PAPEIS: Record<Papel, string> = {
  acs: "Agente comunitário de saúde",
  tecnico_enfermagem: "Técnico(a) de enfermagem",
  estudante_medicina: "Estudante de medicina",
  estudante_enfermagem: "Estudante de enfermagem",
  outro: "Outro",
};

export interface CasoPublico {
  id: CasoId;
  titulo: string;
  contexto: string;
  quem: string;
  persona: string;
  queixa: string;
  saudacao: string;
  revisadoPor: string | null;
  revisadoEm: string | null;
}

export interface Sinal {
  id: string;
  nome: string;
  perguntaModelo: string;
}

export interface EntradaFicha {
  fato: string;
  sinal?: string;
}

export interface CasoPrivado {
  id: CasoId;
  respostaNormal: string;
  ficha: Partial<Record<Assunto, EntradaFicha>>;
  sinais: Sinal[];
  encaminhamento: Encaminhamento;
  motivo: string;
  palavrasProibidas: string[];
}

export interface Evento {
  assunto: Assunto;
  sinal: string | null;
  ultimaFala: string;
  criadoEm: string;
}

export interface SinalCorrigido {
  id: string;
  nome: string;
  descoberto: boolean;
  evidencia: string;
}

export interface Correcao {
  sinais: SinalCorrigido[];
  descobertos: number;
  total: number;
  escolhido: Encaminhamento;
  correto: Encaminhamento;
  acertou: boolean;
  motivo: string;
}
```

- [ ] **Step 4: Casos públicos**

`lib/casos/publico.ts`:

```ts
import type { CasoId, CasoPublico } from "./tipos";

export const CASOS_PUBLICOS: Record<CasoId, CasoPublico> = {
  davi: {
    id: "davi",
    titulo: "Davi, 1 ano e 8 meses",
    contexto: "Visita domiciliar. Marcos, pai do Davi (1 ano e 8 meses), atende a porta.",
    quem: "Marcos, 29 anos, pai do Davi, um menino de 1 ano e 8 meses",
    persona: "Você está preocupado, mas acha que é só uma virose. Você fala sobre o Davi, não sobre você.",
    queixa: "o Davi está com febre há 3 dias, chegou a 39 graus, e está chorando mais que o normal",
    saudacao: "Oi, bom dia! Pode entrar. É o Davi, tá com febre desde domingo.",
    revisadoPor: null,
    revisadoEm: null,
  },
  joaquim: {
    id: "joaquim",
    titulo: "Seu Joaquim, 70 anos",
    contexto: "Visita domiciliar. Seu Joaquim, 70 anos, hipertenso, está na varanda.",
    quem: "Joaquim, 70 anos, aposentado",
    persona: "Você é simpático e minimiza tudo, sempre diz que não é nada.",
    queixa: "teve febre alta nos últimos dias, mas acha que já está melhorando",
    saudacao: "Bom dia, meu filho! Pode sentar. Tive uma febre braba aí, mas acho que já tô melhor.",
    revisadoPor: null,
    revisadoEm: null,
  },
  rafa: {
    id: "rafa",
    titulo: "Rafa, 22 anos",
    contexto: "Visita domiciliar. Rafa, 22 anos, abre a porta de moletom.",
    quem: "Rafa, 22 anos, estudante",
    persona: "Você é meio desleixado com a saúde e acha que tudo vai passar sozinho.",
    queixa: "está com febre há 4 dias e o corpo todo doendo",
    saudacao: "E aí, tudo bem? Pode entrar. Tô meio largado, febre faz uns quatro dias.",
    revisadoPor: null,
    revisadoEm: null,
  },
};
```

- [ ] **Step 5: Casos privados**

`lib/casos/privado.ts`:

```ts
import "server-only";
import type { CasoId, CasoPrivado } from "./tipos";

export const CASOS_PRIVADOS: Record<CasoId, CasoPrivado> = {
  davi: {
    id: "davi",
    respostaNormal: "Não, isso não, que eu tenha reparado.",
    ficha: {
      vomito: { fato: "Vomitou sim, umas quatro vezes só hoje. Tudo que dou, ele põe pra fora.", sinal: "vomitos_persistentes" },
      sonolencia_irritabilidade: { fato: "Agora que você falou, ele tá muito molinho, dormindo o tempo todo, difícil de acordar.", sinal: "letargia" },
      alimentacao_hidratacao: { fato: "Não quer mamar direito. Bebe um golinho e depois vomita." },
      idade: { fato: "Um ano e oito meses." },
      evolucao_da_febre: { fato: "Começou domingo. Baixa com remédio e depois volta." },
      doencas_e_remedios: { fato: "Só dei dipirona em gotas. Ele não tem nenhum problema de saúde." },
      urina: { fato: "Tá fazendo xixi, a fralda vem molhada." },
    },
    sinais: [
      { id: "vomitos_persistentes", nome: "Vômitos persistentes", perguntaModelo: "Ele vomitou? Quantas vezes hoje?" },
      { id: "letargia", nome: "Sonolência ou irritabilidade (letargia)", perguntaModelo: "Ele está mais molinho ou sonolento que o normal? Está difícil de acordar?" },
    ],
    encaminhamento: "C",
    motivo: "Vômitos persistentes e sonolência são sinais de alarme. Uma criança com qualquer um deles precisa de avaliação de urgência.",
    palavrasProibidas: ["vomit", "molinho", "sonolen", "dormindo"],
  },
  joaquim: {
    id: "joaquim",
    respostaNormal: "Não, isso eu não tenho não.",
    ficha: {
      tontura_desmaio: { fato: "Ah, quando eu levanto da cama fica tudo escuro, tenho que sentar de novo. Hoje quase caí no banheiro.", sinal: "hipotensao_postural" },
      falta_de_ar_inchaco: { fato: "Desde ontem eu fico com falta de ar quando deito. Dormi sentado na poltrona.", sinal: "acumulo_liquidos" },
      evolucao_da_febre: { fato: "A febre foi de quinta até ontem de manhã. Ontem parou, graças a Deus." },
      doencas_e_remedios: { fato: "Tenho pressão alta, tomo losartana todo dia." },
      idade: { fato: "Setenta anos, fiz em março." },
      alimentacao_hidratacao: { fato: "Tô comendo pouco, bebendo uma água aqui e ali." },
    },
    sinais: [
      { id: "hipotensao_postural", nome: "Tontura ao levantar ou quase desmaio (hipotensão postural)", perguntaModelo: "O senhor sente tontura quando levanta? Chegou a desmaiar?" },
      { id: "acumulo_liquidos", nome: "Falta de ar (possível acúmulo de líquidos)", perguntaModelo: "O senhor está sentindo falta de ar?" },
    ],
    encaminhamento: "C",
    motivo: "Tontura ao levantar e falta de ar são sinais de alarme. Eles costumam aparecer justamente quando a febre passa, na fase crítica. Idoso hipertenso com esses sinais vai para urgência.",
    palavrasProibidas: ["tontura", "escuro", "falta de ar", "sentado", "parou"],
  },
  rafa: {
    id: "rafa",
    respostaNormal: "Não, nada disso.",
    ficha: {
      sangramento: { fato: "A gengiva sangrou bastante quando escovei hoje cedo. Mas ela sempre sangra um pouco, né.", sinal: "sangramento_mucosa" },
      dor_abdominal: { fato: "Tá doendo a barriga sim, uma dor forte que não passa desde ontem à noite.", sinal: "dor_abdominal" },
      alimentacao_hidratacao: { fato: "Tô comendo quase nada. Bebendo refrigerante." },
      doencas_e_remedios: { fato: "Não tenho nada. Tomei um anti-inflamatório que tinha em casa." },
      evolucao_da_febre: { fato: "Começou sábado e ainda tá indo e voltando." },
      idade: { fato: "Vinte e dois." },
    },
    sinais: [
      { id: "sangramento_mucosa", nome: "Sangramento de mucosa (gengiva)", perguntaModelo: "Você teve algum sangramento? Na gengiva, no nariz?" },
      { id: "dor_abdominal", nome: "Dor abdominal intensa e contínua", perguntaModelo: "Você está com dor na barriga? Ela é forte, passa ou é contínua?" },
    ],
    encaminhamento: "C",
    motivo: "Sangramento de gengiva e dor abdominal intensa e contínua são sinais de alarme. Além disso, anti-inflamatório é contraindicado na suspeita de dengue.",
    palavrasProibidas: ["gengiva", "sangr", "barriga", "anti-inflamat"],
  },
};
```

- [ ] **Step 6: Escrever o teste do prompt (falha primeiro)**

`tests/prompt.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CASOS_PUBLICOS } from "@/lib/casos/publico";
import { CASOS_PRIVADOS } from "@/lib/casos/privado";
import { montarSessao } from "@/lib/casos/prompt";
import { ASSUNTOS, type CasoId } from "@/lib/casos/tipos";

const ids = Object.keys(CASOS_PUBLICOS) as CasoId[];

describe("montarSessao", () => {
  it.each(ids)("não vaza nenhum fato escondido do caso %s", (id) => {
    const sessao = montarSessao(CASOS_PUBLICOS[id]);
    const texto = `${sessao.system_prompt}\n${sessao.greeting}`.toLowerCase();
    const privado = CASOS_PRIVADOS[id];
    for (const entrada of Object.values(privado.ficha)) {
      expect(texto).not.toContain(entrada!.fato.toLowerCase());
    }
    for (const palavra of privado.palavrasProibidas) {
      expect(texto).not.toContain(palavra.toLowerCase());
    }
  });

  it("configura voz, idioma e a tool consultar_ficha com a lista fechada", () => {
    const sessao = montarSessao(CASOS_PUBLICOS.rafa);
    expect(sessao.output.voice).toBe("rafael");
    expect(sessao.input.language_codes).toEqual(["pt"]);
    expect(sessao.tools).toHaveLength(1);
    expect(sessao.tools[0].name).toBe("consultar_ficha");
    expect(sessao.tools[0].parameters.properties.assunto.enum).toEqual([...ASSUNTOS]);
    expect(sessao.greeting).toBe(CASOS_PUBLICOS.rafa.saudacao);
  });

  it("todo sinal de cada caso tem um assunto na ficha que o revela", () => {
    for (const id of ids) {
      const privado = CASOS_PRIVADOS[id];
      const revelados = Object.values(privado.ficha).map((e) => e!.sinal).filter(Boolean);
      expect(revelados.sort()).toEqual(privado.sinais.map((s) => s.id).sort());
    }
  });
});
```

- [ ] **Step 7: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL. O módulo `@/lib/casos/prompt` ainda não existe.

- [ ] **Step 8: Implementar `montarSessao`**

`lib/casos/prompt.ts`:

```ts
import { ASSUNTOS, type CasoPublico } from "./tipos";

export interface SessaoVoz {
  system_prompt: string;
  greeting: string;
  tools: {
    type: "function";
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: { assunto: { type: "string"; enum: string[]; description: string } };
      required: string[];
    };
    execution_mode: "interactive";
    timeout_seconds: number;
  }[];
  input: { language_codes: string[]; keyterms: string[] };
  output: { voice: string };
}

const KEYTERMS = ["dengue", "febre", "UBS", "posto", "soro", "hidratação", "dipirona", "paracetamol", "xixi", "fralda", "pressão", "plaqueta"];

export function montarSessao(caso: CasoPublico): SessaoVoz {
  const system_prompt = [
    `Você interpreta ${caso.quem}, numa visita domiciliar feita por um profissional de saúde no Brasil. Quem fala com você é esse profissional.`,
    caso.persona,
    `O que você conta logo, sem precisar perguntar: ${caso.queixa}.`,
    "Regras:",
    "- Fale como gente comum do Brasil, em frases curtas, no máximo duas por vez.",
    "- Nunca dê diagnóstico, nunca use termo médico e nunca diga que isto é uma simulação.",
    "- Não ofereça, por conta própria, nenhum sintoma além do que está acima.",
    "- Se o profissional perguntar sobre qualquer coisa que não esteja acima, chame consultar_ficha com o assunto que melhor corresponde à pergunta e responda somente com o que ela devolver, com as suas palavras. Nunca invente.",
    "- Se a pergunta for genérica, como 'mais alguma coisa?', repita só o que está acima, sem chamar a ferramenta.",
    "- Se a ferramenta devolver erro, peça para o profissional repetir a pergunta.",
    "- Se o profissional disser o que você deve fazer, agradeça e diga que vai seguir a orientação.",
  ].join("\n");

  return {
    system_prompt,
    greeting: caso.saudacao,
    tools: [
      {
        type: "function",
        name: "consultar_ficha",
        description:
          "Busca o que o paciente sabe sobre o assunto que o profissional perguntou. Chame sempre que a pergunta não for respondida pelo que o paciente já contou. Nunca responda sem chamar.",
        parameters: {
          type: "object",
          properties: {
            assunto: {
              type: "string",
              enum: [...ASSUNTOS],
              description:
                "O assunto da pergunta, em minúsculas. Exemplos: 'tá comendo e bebendo?' -> alimentacao_hidratacao; 'tem pressão alta, toma remédio?' -> doencas_e_remedios; se nada servir -> outro.",
            },
          },
          required: ["assunto"],
        },
        execution_mode: "interactive",
        timeout_seconds: 10,
      },
    ],
    input: { language_codes: ["pt"], keyterms: KEYTERMS },
    output: { voice: "rafael" },
  };
}
```

- [ ] **Step 9: Rodar e ver passar**

Run: `npm test`
Expected: PASS nos 5 testes (3 do `it.each` e mais 2).

- [ ] **Step 10: Commit** (mensagem sugerida; confirmar com o Nicolas)

```bash
git add -A
git commit -m "esqueleto e casos"
```

---

### Task 2: Ficha, correção, pares e agregação (funções puras)

**Files:**
- Create: `lib/estudo/ficha.ts`, `lib/estudo/corrigir.ts`, `lib/estudo/pares.ts`, `lib/estudo/agregar.ts`
- Test: `tests/estudo.test.ts`

**Interfaces:**
- Consumes: tipos de `lib/casos/tipos.ts` e `CASOS_PRIVADOS`.
- Produces:
  - `resolverFicha(caso: CasoPrivado, assunto: Assunto): { resposta: string; sinal: string | null }`
  - `corrigir(caso: CasoPrivado, eventos: Evento[], escolhido: Encaminhamento): Correcao`
  - `PARES: [CasoId, CasoId][]` e `parDaVez(n: number): [CasoId, CasoId]`
  - `agregar(sessoes: SessaoCorrigida[]): Painel`, com `SessaoCorrigida = { papel: Papel; c1: Correcao; c2: Correcao; preparo: number | null }` e `Painel = { n: number; sinais1: number; sinais2: number; acerto1: number; acerto2: number; melhoraram: number; porPapel: Partial<Record<Papel, number>>; preparoMedio: number | null }`. `sinais1`/`sinais2` são a média da proporção descobertos/total (0–1); `acerto1`/`acerto2` são proporções (0–1); `melhoraram` é a contagem de sessões com proporção 2 > proporção 1.

- [ ] **Step 1: Escrever os testes**

`tests/estudo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CASOS_PRIVADOS } from "@/lib/casos/privado";
import { resolverFicha } from "@/lib/estudo/ficha";
import { corrigir } from "@/lib/estudo/corrigir";
import { PARES, parDaVez } from "@/lib/estudo/pares";
import { agregar } from "@/lib/estudo/agregar";
import type { Evento } from "@/lib/casos/tipos";

const rafa = CASOS_PRIVADOS.rafa;

function evento(p: Partial<Evento>): Evento {
  return { assunto: "outro", sinal: null, ultimaFala: "", criadoEm: "2026-09-25T10:00:00Z", ...p };
}

describe("resolverFicha", () => {
  it("devolve o fato e o sinal quando o assunto tem entrada", () => {
    expect(resolverFicha(rafa, "sangramento")).toEqual({ resposta: rafa.ficha.sangramento!.fato, sinal: "sangramento_mucosa" });
  });
  it("devolve o fato sem sinal para entrada comum", () => {
    expect(resolverFicha(rafa, "idade")).toEqual({ resposta: "Vinte e dois.", sinal: null });
  });
  it("devolve a resposta normal quando o assunto não tem entrada", () => {
    expect(resolverFicha(rafa, "urina")).toEqual({ resposta: rafa.respostaNormal, sinal: null });
  });
});

describe("corrigir", () => {
  it("marca descoberto com a primeira fala que revelou o sinal", () => {
    const eventos = [
      evento({ assunto: "sangramento", sinal: "sangramento_mucosa", ultimaFala: "sangrou alguma coisa?", criadoEm: "2026-09-25T10:02:00Z" }),
      evento({ assunto: "sangramento", sinal: "sangramento_mucosa", ultimaFala: "a gengiva sangra?", criadoEm: "2026-09-25T10:01:00Z" }),
    ];
    const c = corrigir(rafa, eventos, "B");
    expect(c.sinais[0]).toEqual({ id: "sangramento_mucosa", nome: rafa.sinais[0].nome, descoberto: true, evidencia: "a gengiva sangra?" });
    expect(c.sinais[1]).toEqual({ id: "dor_abdominal", nome: rafa.sinais[1].nome, descoberto: false, evidencia: rafa.sinais[1].perguntaModelo });
    expect(c.descobertos).toBe(1);
    expect(c.total).toBe(2);
    expect(c.acertou).toBe(false);
    expect(c.correto).toBe("C");
    expect(c.escolhido).toBe("B");
    expect(c.motivo).toBe(rafa.motivo);
  });
  it("sem eventos, nada é descoberto", () => {
    const c = corrigir(rafa, [], "C");
    expect(c.descobertos).toBe(0);
    expect(c.acertou).toBe(true);
  });
});

describe("pares", () => {
  it("tem as 6 permutações distintas dos 3 casos", () => {
    const chaves = new Set(PARES.map((p) => p.join(">")));
    expect(chaves.size).toBe(6);
    for (const [a, b] of PARES) expect(a).not.toBe(b);
  });
  it("faz rodízio pelo número da sessão", () => {
    expect(parDaVez(0)).toEqual(PARES[0]);
    expect(parDaVez(7)).toEqual(PARES[1]);
  });
});

describe("agregar", () => {
  const c = (descobertos: number, total: number, acertou: boolean) => ({ ...corrigir(rafa, [], "C"), descobertos, total, acertou });
  it("calcula médias, acertos, melhoras e papéis", () => {
    const p = agregar([
      { papel: "acs", c1: c(0, 2, false), c2: c(2, 2, true), preparo: 5 },
      { papel: "estudante_medicina", c1: c(1, 2, true), c2: c(1, 2, true), preparo: 3 },
    ]);
    expect(p).toEqual({
      n: 2,
      sinais1: 0.25,
      sinais2: 0.75,
      acerto1: 0.5,
      acerto2: 1,
      melhoraram: 1,
      porPapel: { acs: 1, estudante_medicina: 1 },
      preparoMedio: 4,
    });
  });
  it("sem sessões devolve zeros e preparo nulo", () => {
    expect(agregar([])).toEqual({ n: 0, sinais1: 0, sinais2: 0, acerto1: 0, acerto2: 0, melhoraram: 0, porPapel: {}, preparoMedio: null });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL, porque os módulos de `lib/estudo/` não existem.

- [ ] **Step 3: Implementar**

`lib/estudo/ficha.ts`:

```ts
import type { Assunto, CasoPrivado } from "@/lib/casos/tipos";

export function resolverFicha(caso: CasoPrivado, assunto: Assunto) {
  const entrada = caso.ficha[assunto];
  if (!entrada) return { resposta: caso.respostaNormal, sinal: null };
  return { resposta: entrada.fato, sinal: entrada.sinal ?? null };
}
```

`lib/estudo/corrigir.ts`:

```ts
import type { CasoPrivado, Correcao, Encaminhamento, Evento } from "@/lib/casos/tipos";

export function corrigir(caso: CasoPrivado, eventos: Evento[], escolhido: Encaminhamento): Correcao {
  const ordenados = [...eventos].sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  const sinais = caso.sinais.map((s) => {
    const primeiro = ordenados.find((e) => e.sinal === s.id);
    return primeiro
      ? { id: s.id, nome: s.nome, descoberto: true, evidencia: primeiro.ultimaFala }
      : { id: s.id, nome: s.nome, descoberto: false, evidencia: s.perguntaModelo };
  });
  return {
    sinais,
    descobertos: sinais.filter((s) => s.descoberto).length,
    total: sinais.length,
    escolhido,
    correto: caso.encaminhamento,
    acertou: escolhido === caso.encaminhamento,
    motivo: caso.motivo,
  };
}
```

`lib/estudo/pares.ts`:

```ts
import type { CasoId } from "@/lib/casos/tipos";

export const PARES: [CasoId, CasoId][] = [
  ["davi", "joaquim"],
  ["joaquim", "davi"],
  ["davi", "rafa"],
  ["rafa", "davi"],
  ["joaquim", "rafa"],
  ["rafa", "joaquim"],
];

export function parDaVez(n: number): [CasoId, CasoId] {
  return PARES[n % PARES.length];
}
```

`lib/estudo/agregar.ts`:

```ts
import type { Correcao, Papel } from "@/lib/casos/tipos";

export interface SessaoCorrigida {
  papel: Papel;
  c1: Correcao;
  c2: Correcao;
  preparo: number | null;
}

export interface Painel {
  n: number;
  sinais1: number;
  sinais2: number;
  acerto1: number;
  acerto2: number;
  melhoraram: number;
  porPapel: Partial<Record<Papel, number>>;
  preparoMedio: number | null;
}

const proporcao = (c: Correcao) => (c.total === 0 ? 0 : c.descobertos / c.total);
const media = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

export function agregar(sessoes: SessaoCorrigida[]): Painel {
  const porPapel: Partial<Record<Papel, number>> = {};
  for (const s of sessoes) porPapel[s.papel] = (porPapel[s.papel] ?? 0) + 1;
  const preparos = sessoes.map((s) => s.preparo).filter((p): p is number => p !== null);
  return {
    n: sessoes.length,
    sinais1: media(sessoes.map((s) => proporcao(s.c1))),
    sinais2: media(sessoes.map((s) => proporcao(s.c2))),
    acerto1: media(sessoes.map((s) => (s.c1.acertou ? 1 : 0))),
    acerto2: media(sessoes.map((s) => (s.c2.acertou ? 1 : 0))),
    melhoraram: sessoes.filter((s) => proporcao(s.c2) > proporcao(s.c1)).length,
    porPapel,
    preparoMedio: preparos.length === 0 ? null : media(preparos),
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS em todos os testes.

- [ ] **Step 5: Commit** (mensagem sugerida)

```bash
git add -A
git commit -m "correção, ficha, pares e agregação"
```

---

### Task 3: Banco e rotas da API

**Files:**
- Create: `db/schema.sql`, `scripts/migrar.mjs`, `lib/db.ts`, `lib/ip.ts`, `.env.example`, as rotas listadas em File Structure, exceto as de voz (Task 4 usa `/api/token`, mas ela é criada aqui)

**Interfaces:**
- Consumes: `CASOS_PUBLICOS`, `CASOS_PRIVADOS`, `montarSessao`, `resolverFicha`, `corrigir`, `parDaVez`, `ASSUNTOS`.
- Produces (contratos HTTP usados pelas Tasks 4–6):
  - `POST /api/sessoes` body `{ papel: Papel, apelido: string (1–40), consentimento: true }` → `201 { id }` · `429` se o IP criou 30 sessões ou mais na última hora.
  - `GET /api/sessoes/:id` → `{ id, casos: [CasoPublico, CasoPublico], encaminhamentos: [Encaminhamento|null, Encaminhamento|null], correcoes: [Correcao|null, Correcao|null], preparo: number|null }`.
  - `GET /api/sessoes/:id/atendimentos/:n/config` → `SessaoVoz` do caso daquele atendimento · `409` se o atendimento já foi decidido.
  - `POST /api/token` body `{ sessaoId }` → `{ token }` · `429` se a sessão já pediu 8 tokens.
  - `POST /api/ficha` body `{ sessaoId, atendimento: 1|2, assunto: Assunto, ultimaFala: string }` → `{ resposta }` · `409` se o atendimento já foi decidido.
  - `POST /api/decisao` body `{ sessaoId, atendimento: 1|2, encaminhamento: Encaminhamento }` → `Correcao` · `409` se já decidido ou se o 2 vier antes do 1.
  - `POST /api/sessoes/:id/preparo` body `{ preparo: 1..5 }` → `204` · `409` se o atendimento 2 não foi decidido.

- [ ] **Step 1: Esquema e migração**

`db/schema.sql`:

```sql
create table if not exists sessoes (
  id uuid primary key default gen_random_uuid(),
  numero serial,
  papel text not null,
  apelido text not null,
  caso_1 text not null,
  caso_2 text not null,
  encaminhamento_1 text,
  encaminhamento_2 text,
  preparo int,
  ip_hash text not null,
  tokens int not null default 0,
  criada_em timestamptz not null default now(),
  concluida_em timestamptz
);

create table if not exists eventos (
  id bigserial primary key,
  sessao_id uuid not null references sessoes(id) on delete cascade,
  atendimento int not null check (atendimento in (1, 2)),
  assunto text not null,
  sinal text,
  ultima_fala text not null,
  criado_em timestamptz not null default now()
);

create index if not exists eventos_sessao on eventos (sessao_id, atendimento);
create index if not exists sessoes_ip on sessoes (ip_hash, criada_em);
```

`scripts/migrar.mjs`:

```js
import { readFileSync } from "node:fs";
import postgres from "postgres";

process.loadEnvFile(".env.local");
const sql = postgres(process.env.DATABASE_URL, { prepare: false });
await sql.unsafe(readFileSync("db/schema.sql", "utf8"));
await sql.end();
console.log("ok");
```

`.env.example`:

```
ASSEMBLYAI_API_KEY=
DATABASE_URL=postgresql://postgres.xxxx:senha@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
IP_SALT=
```

- [ ] **Step 2: Nicolas preenche `.env.local` e migra**

Pedir ao Nicolas: criar o projeto no Supabase e copiar a *connection string* do pooler em modo transação (porta 6543) para `DATABASE_URL`, colar a chave da AssemblyAI e gerar `IP_SALT` com `node -e "console.log(crypto.randomUUID())"`. Depois:

Run: `npm run migrar`
Expected: `ok`

- [ ] **Step 3: `lib/db.ts` e `lib/ip.ts`**

```ts
import "server-only";
import postgres from "postgres";

export const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
```

```ts
import "server-only";
import { createHash } from "node:crypto";

export function hashIp(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return createHash("sha256").update(ip + process.env.IP_SALT).digest("hex");
}
```

- [ ] **Step 4: Carregar sessão e eventos (utilitário das rotas)**

`lib/estudo/carregar.ts`:

```ts
import "server-only";
import { sql } from "@/lib/db";
import { CASOS_PRIVADOS } from "@/lib/casos/privado";
import { corrigir } from "@/lib/estudo/corrigir";
import type { Assunto, CasoId, Correcao, Encaminhamento, Evento, Papel } from "@/lib/casos/tipos";

export interface LinhaSessao {
  id: string;
  papel: Papel;
  caso_1: CasoId;
  caso_2: CasoId;
  encaminhamento_1: Encaminhamento | null;
  encaminhamento_2: Encaminhamento | null;
  preparo: number | null;
  tokens: number;
}

export async function carregarSessao(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [linha] = await sql<LinhaSessao[]>`select id, papel, caso_1, caso_2, encaminhamento_1, encaminhamento_2, preparo, tokens from sessoes where id = ${id}`;
  return linha ?? null;
}

export async function carregarEventos(sessaoId: string, atendimento: 1 | 2): Promise<Evento[]> {
  const linhas = await sql<{ assunto: Assunto; sinal: string | null; ultima_fala: string; criado_em: Date }[]>`
    select assunto, sinal, ultima_fala, criado_em from eventos where sessao_id = ${sessaoId} and atendimento = ${atendimento}`;
  return linhas.map((l) => ({ assunto: l.assunto, sinal: l.sinal, ultimaFala: l.ultima_fala, criadoEm: l.criado_em.toISOString() }));
}

export async function correcoesDa(s: LinhaSessao): Promise<[Correcao | null, Correcao | null]> {
  const c1 = s.encaminhamento_1 ? corrigir(CASOS_PRIVADOS[s.caso_1], await carregarEventos(s.id, 1), s.encaminhamento_1) : null;
  const c2 = s.encaminhamento_2 ? corrigir(CASOS_PRIVADOS[s.caso_2], await carregarEventos(s.id, 2), s.encaminhamento_2) : null;
  return [c1, c2];
}

export function casoDoAtendimento(s: LinhaSessao, n: 1 | 2): CasoId {
  return n === 1 ? s.caso_1 : s.caso_2;
}

export function decidido(s: LinhaSessao, n: 1 | 2) {
  return (n === 1 ? s.encaminhamento_1 : s.encaminhamento_2) !== null;
}
```

- [ ] **Step 5: Rotas de sessão**

`app/api/sessoes/route.ts`:

```ts
import { z } from "zod";
import { sql } from "@/lib/db";
import { hashIp } from "@/lib/ip";
import { parDaVez } from "@/lib/estudo/pares";
import { PAPEIS } from "@/lib/casos/tipos";

const Corpo = z.object({
  papel: z.enum(Object.keys(PAPEIS) as [string, ...string[]]),
  apelido: z.string().trim().min(1).max(40),
  consentimento: z.literal(true),
});

export async function POST(request: Request) {
  const corpo = Corpo.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return Response.json({ erro: "dados inválidos" }, { status: 400 });
  const ipHash = hashIp(request);
  const [{ recentes }] = await sql<{ recentes: number }[]>`
    select count(*)::int as recentes from sessoes where ip_hash = ${ipHash} and criada_em > now() - interval '1 hour'`;
  if (recentes >= 30) return Response.json({ erro: "muitas sessões desta rede, tente mais tarde" }, { status: 429 });
  const [{ total }] = await sql<{ total: number }[]>`select count(*)::int as total from sessoes`;
  const [caso1, caso2] = parDaVez(total);
  const [{ id }] = await sql<{ id: string }[]>`
    insert into sessoes (papel, apelido, caso_1, caso_2, ip_hash)
    values (${corpo.data.papel}, ${corpo.data.apelido}, ${caso1}, ${caso2}, ${ipHash}) returning id`;
  return Response.json({ id }, { status: 201 });
}
```

`app/api/sessoes/[id]/route.ts`:

```ts
import { CASOS_PUBLICOS } from "@/lib/casos/publico";
import { carregarSessao, correcoesDa } from "@/lib/estudo/carregar";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await carregarSessao((await params).id);
  if (!s) return Response.json({ erro: "sessão não encontrada" }, { status: 404 });
  return Response.json({
    id: s.id,
    casos: [CASOS_PUBLICOS[s.caso_1], CASOS_PUBLICOS[s.caso_2]],
    encaminhamentos: [s.encaminhamento_1, s.encaminhamento_2],
    correcoes: await correcoesDa(s),
    preparo: s.preparo,
  });
}
```

`app/api/sessoes/[id]/atendimentos/[n]/config/route.ts`:

```ts
import { CASOS_PUBLICOS } from "@/lib/casos/publico";
import { montarSessao } from "@/lib/casos/prompt";
import { carregarSessao, casoDoAtendimento, decidido } from "@/lib/estudo/carregar";

export async function GET(_: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const { id, n } = await params;
  const atendimento = n === "1" ? 1 : n === "2" ? 2 : null;
  const s = await carregarSessao(id);
  if (!s || !atendimento) return Response.json({ erro: "não encontrado" }, { status: 404 });
  if (decidido(s, atendimento)) return Response.json({ erro: "atendimento já decidido" }, { status: 409 });
  return Response.json(montarSessao(CASOS_PUBLICOS[casoDoAtendimento(s, atendimento)]));
}
```

`app/api/sessoes/[id]/preparo/route.ts`:

```ts
import { z } from "zod";
import { sql } from "@/lib/db";
import { carregarSessao } from "@/lib/estudo/carregar";

const Corpo = z.object({ preparo: z.number().int().min(1).max(5) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const corpo = Corpo.safeParse(await request.json().catch(() => null));
  const s = await carregarSessao((await params).id);
  if (!corpo.success || !s) return Response.json({ erro: "dados inválidos" }, { status: 400 });
  if (!s.encaminhamento_2) return Response.json({ erro: "termine os atendimentos antes" }, { status: 409 });
  await sql`update sessoes set preparo = ${corpo.data.preparo}, concluida_em = coalesce(concluida_em, now()) where id = ${s.id}`;
  return new Response(null, { status: 204 });
}
```

- [ ] **Step 6: Rotas de token, ficha e decisão**

`app/api/token/route.ts`:

```ts
import { z } from "zod";
import { sql } from "@/lib/db";
import { carregarSessao } from "@/lib/estudo/carregar";

const Corpo = z.object({ sessaoId: z.string() });

export async function POST(request: Request) {
  const corpo = Corpo.safeParse(await request.json().catch(() => null));
  const s = corpo.success ? await carregarSessao(corpo.data.sessaoId) : null;
  if (!s) return Response.json({ erro: "sessão não encontrada" }, { status: 404 });
  if (s.encaminhamento_2) return Response.json({ erro: "sessão encerrada" }, { status: 409 });
  if (s.tokens >= 8) return Response.json({ erro: "limite de conexões desta sessão" }, { status: 429 });
  await sql`update sessoes set tokens = tokens + 1 where id = ${s.id}`;
  const url = new URL("https://agents.assemblyai.com/v1/token");
  url.searchParams.set("expires_in_seconds", "120");
  url.searchParams.set("max_session_duration_seconds", "900");
  const resposta = await fetch(url, { headers: { Authorization: `Bearer ${process.env.ASSEMBLYAI_API_KEY}` } });
  if (!resposta.ok) return Response.json({ erro: "falha ao gerar token" }, { status: 502 });
  const { token } = await resposta.json();
  return Response.json({ token });
}
```

`app/api/ficha/route.ts`:

```ts
import { z } from "zod";
import { sql } from "@/lib/db";
import { CASOS_PRIVADOS } from "@/lib/casos/privado";
import { ASSUNTOS } from "@/lib/casos/tipos";
import { resolverFicha } from "@/lib/estudo/ficha";
import { carregarSessao, casoDoAtendimento, decidido } from "@/lib/estudo/carregar";

const Corpo = z.object({
  sessaoId: z.string(),
  atendimento: z.union([z.literal(1), z.literal(2)]),
  assunto: z.enum(ASSUNTOS),
  ultimaFala: z.string().max(1000),
});

export async function POST(request: Request) {
  const corpo = Corpo.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return Response.json({ erro: "dados inválidos" }, { status: 400 });
  const { sessaoId, atendimento, assunto, ultimaFala } = corpo.data;
  const s = await carregarSessao(sessaoId);
  if (!s) return Response.json({ erro: "sessão não encontrada" }, { status: 404 });
  if (decidido(s, atendimento)) return Response.json({ erro: "atendimento já decidido" }, { status: 409 });
  const { resposta, sinal } = resolverFicha(CASOS_PRIVADOS[casoDoAtendimento(s, atendimento)], assunto);
  await sql`insert into eventos (sessao_id, atendimento, assunto, sinal, ultima_fala) values (${s.id}, ${atendimento}, ${assunto}, ${sinal}, ${ultimaFala})`;
  return Response.json({ resposta });
}
```

`app/api/decisao/route.ts`:

```ts
import { z } from "zod";
import { sql } from "@/lib/db";
import { CASOS_PRIVADOS } from "@/lib/casos/privado";
import { corrigir } from "@/lib/estudo/corrigir";
import { carregarEventos, carregarSessao, casoDoAtendimento, decidido } from "@/lib/estudo/carregar";

const Corpo = z.object({
  sessaoId: z.string(),
  atendimento: z.union([z.literal(1), z.literal(2)]),
  encaminhamento: z.enum(["A", "B", "C"]),
});

export async function POST(request: Request) {
  const corpo = Corpo.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return Response.json({ erro: "dados inválidos" }, { status: 400 });
  const { sessaoId, atendimento, encaminhamento } = corpo.data;
  const s = await carregarSessao(sessaoId);
  if (!s) return Response.json({ erro: "sessão não encontrada" }, { status: 404 });
  if (decidido(s, atendimento) || (atendimento === 2 && !s.encaminhamento_1)) {
    return Response.json({ erro: "decisão fora de ordem" }, { status: 409 });
  }
  if (atendimento === 1) await sql`update sessoes set encaminhamento_1 = ${encaminhamento} where id = ${s.id} and encaminhamento_1 is null`;
  else await sql`update sessoes set encaminhamento_2 = ${encaminhamento} where id = ${s.id} and encaminhamento_2 is null`;
  const caso = CASOS_PRIVADOS[casoDoAtendimento(s, atendimento)];
  return Response.json(corrigir(caso, await carregarEventos(s.id, atendimento), encaminhamento));
}
```

- [ ] **Step 7: Verificar ponta a ponta com curl**

Run `npm run dev` (porta 3000) e, em outro terminal:

```bash
ID=$(curl -s -X POST localhost:3000/api/sessoes -H 'content-type: application/json' -d '{"papel":"acs","apelido":"teste","consentimento":true}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).id')
curl -s localhost:3000/api/sessoes/$ID/atendimentos/1/config | head -c 300; echo
curl -s -X POST localhost:3000/api/ficha -H 'content-type: application/json' -d "{\"sessaoId\":\"$ID\",\"atendimento\":1,\"assunto\":\"sangramento\",\"ultimaFala\":\"teve sangramento?\"}"; echo
curl -s -X POST localhost:3000/api/decisao -H 'content-type: application/json' -d "{\"sessaoId\":\"$ID\",\"atendimento\":1,\"encaminhamento\":\"C\"}"; echo
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/api/decisao -H 'content-type: application/json' -d "{\"sessaoId\":\"$ID\",\"atendimento\":1,\"encaminhamento\":\"A\"}"
curl -s -X POST localhost:3000/api/token -H 'content-type: application/json' -d "{\"sessaoId\":\"$ID\"}" | head -c 60; echo
```

Expected: a config começa com `{"system_prompt":"Você interpreta`; a ficha devolve `{"resposta":...}`; a decisão devolve uma `Correcao` com `"correto":"C"`; a segunda decisão devolve `409`; o token devolve `{"token":"`.

Depois apagar a sessão de teste: `delete from sessoes where apelido = 'teste'` no SQL editor do Supabase.

- [ ] **Step 8: Commit** (mensagem sugerida)

```bash
git add -A
git commit -m "banco e rotas da API"
```

---

### Task 4: Cliente de voz

**Files:**
- Create: `lib/voz/fila.ts`, `lib/voz/audio.ts`, `lib/voz/conversa.ts`, `public/pcm-processor.js`
- Test: `tests/fila.test.ts`

**Interfaces:**
- Consumes: `GET /api/sessoes/:id/atendimentos/:n/config`, `POST /api/token`, `POST /api/ficha`.
- Produces:
  - `criarFila(enviar: (msg: object) => void): { evento(tipo: string, status?: string): void; chamada(callId: string): void; resultado(callId: string, result: string): void }`
  - `iniciarConversa(opcoes: { sessaoId: string; atendimento: 1 | 2; aoFalar(linha: Linha): void; aoEstado(estado: EstadoConversa, detalhe?: string): void }): Promise<{ encerrar(): void }>` com `Linha = { quem: "voce" | "paciente"; texto: string }` e `EstadoConversa = "conectando" | "pronto" | "encerrado" | "erro"`.

- [ ] **Step 1: Teste da fila de resultados**

`tests/fila.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { criarFila } from "@/lib/voz/fila";

function montar() {
  const enviados: object[] = [];
  return { enviados, fila: criarFila((m) => enviados.push(m)) };
}

describe("criarFila", () => {
  it("segura o resultado enquanto há resposta em andamento e envia no reply.done", () => {
    const { enviados, fila } = montar();
    fila.evento("reply.started");
    fila.chamada("c1");
    fila.resultado("c1", "{}");
    expect(enviados).toEqual([]);
    fila.evento("reply.done", "completed");
    expect(enviados).toEqual([{ type: "tool.result", call_id: "c1", result: "{}" }]);
  });

  it("envia na hora se já está ocioso", () => {
    const { enviados, fila } = montar();
    fila.evento("reply.started");
    fila.chamada("c1");
    fila.evento("reply.done", "completed");
    fila.resultado("c1", "{}");
    expect(enviados).toHaveLength(1);
  });

  it("descarta chamadas de uma resposta interrompida, mesmo se o resultado chegar depois", () => {
    const { enviados, fila } = montar();
    fila.evento("reply.started");
    fila.chamada("c1");
    fila.evento("reply.done", "interrupted");
    fila.resultado("c1", "{}");
    expect(enviados).toEqual([]);
  });

  it("ignora resultado de chamada desconhecida", () => {
    const { enviados, fila } = montar();
    fila.resultado("x", "{}");
    expect(enviados).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL, porque `@/lib/voz/fila` não existe.

- [ ] **Step 3: Implementar a fila**

`lib/voz/fila.ts`:

```ts
export function criarFila(enviar: (msg: object) => void) {
  let ocupado = false;
  const aguardando = new Set<string>();
  const prontos: { call_id: string; result: string }[] = [];

  function drenar() {
    if (ocupado) return;
    for (const p of prontos.splice(0)) enviar({ type: "tool.result", call_id: p.call_id, result: p.result });
  }

  return {
    evento(tipo: string, status?: string) {
      if (tipo === "reply.started" || tipo === "input.speech.started") ocupado = true;
      if (tipo === "reply.done") {
        ocupado = false;
        if (status === "interrupted") {
          aguardando.clear();
          prontos.length = 0;
        } else drenar();
      }
    },
    chamada(callId: string) {
      aguardando.add(callId);
    },
    resultado(callId: string, result: string) {
      if (!aguardando.delete(callId)) return;
      prontos.push({ call_id: callId, result });
      drenar();
    },
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Worklet de captura com reamostragem**

`public/pcm-processor.js`:

```js
class PCMProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.ratio = options.processorOptions.inputSampleRate / 24000;
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    const n = Math.floor(input.length / this.ratio);
    const pcm16 = new Int16Array(n);
    for (let i = 0; i < n; i++) {
      const s = input[Math.floor(i * this.ratio)] ?? 0;
      pcm16[i] = Math.max(-32768, Math.min(32767, Math.round(s * 32767)));
    }
    this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    return true;
  }
}
registerProcessor("pcm-processor", PCMProcessor);
```

- [ ] **Step 6: Áudio (captura e reprodução)**

`lib/voz/audio.ts`:

```ts
function paraBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binario = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binario);
}

export async function abrirAudio(aoCapturar: (base64: string) => void) {
  const ctx = new AudioContext();
  await ctx.resume();
  await ctx.audioWorklet.addModule("/pcm-processor.js");
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false } });
  const fonte = ctx.createMediaStreamSource(stream);
  const worklet = new AudioWorkletNode(ctx, "pcm-processor", { processorOptions: { inputSampleRate: ctx.sampleRate } });
  worklet.port.onmessage = (e) => aoCapturar(paraBase64(e.data));
  const mudo = ctx.createGain();
  mudo.gain.value = 0;
  fonte.connect(worklet).connect(mudo).connect(ctx.destination);

  let fim = ctx.currentTime;
  const tocando = new Set<AudioBufferSourceNode>();

  return {
    tocar(base64: string) {
      const bruto = atob(base64);
      const amostras = new Float32Array(bruto.length / 2);
      for (let i = 0; i < amostras.length; i++) {
        const v = bruto.charCodeAt(i * 2) | (bruto.charCodeAt(i * 2 + 1) << 8);
        amostras[i] = (v >= 0x8000 ? v - 0x10000 : v) / 32768;
      }
      const buffer = ctx.createBuffer(1, amostras.length, 24000);
      buffer.getChannelData(0).set(amostras);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      fim = Math.max(fim, ctx.currentTime);
      src.start(fim);
      fim += buffer.duration;
      tocando.add(src);
      src.onended = () => tocando.delete(src);
    },
    silenciar() {
      for (const src of tocando) src.stop();
      tocando.clear();
      fim = ctx.currentTime;
    },
    fechar() {
      stream.getTracks().forEach((t) => t.stop());
      ctx.close();
    },
  };
}
```

- [ ] **Step 7: Protocolo da conversa**

`lib/voz/conversa.ts`:

```ts
import { abrirAudio } from "./audio";
import { criarFila } from "./fila";

export type EstadoConversa = "conectando" | "pronto" | "encerrado" | "erro";
export interface Linha {
  quem: "voce" | "paciente";
  texto: string;
}

interface Opcoes {
  sessaoId: string;
  atendimento: 1 | 2;
  aoFalar(linha: Linha): void;
  aoEstado(estado: EstadoConversa, detalhe?: string): void;
}

async function json(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).erro ?? `erro ${r.status}`);
  return r.json();
}

export async function iniciarConversa({ sessaoId, atendimento, aoFalar, aoEstado }: Opcoes) {
  aoEstado("conectando");
  const config = await json(`/api/sessoes/${sessaoId}/atendimentos/${atendimento}/config`);
  let pronto = false;
  let encerrado = false;
  let ultimaFala = "";
  let ws: WebSocket | null = null;
  let audio: Awaited<ReturnType<typeof abrirAudio>>;
  try {
    audio = await abrirAudio((b64) => {
      if (pronto && ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "input.audio", audio: b64 }));
    });
  } catch {
    aoEstado("erro", "Sem acesso ao microfone. Libere o microfone no navegador e tente de novo.");
    throw new Error("microfone");
  }
  const { token } = await json("/api/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessaoId }),
  });

  const url = new URL("wss://agents.assemblyai.com/v1/ws");
  url.searchParams.set("token", token);
  const socket = new WebSocket(url);
  ws = socket;
  const fila = criarFila((m) => socket.send(JSON.stringify(m)));

  function fechar() {
    if (encerrado) return;
    encerrado = true;
    audio.fechar();
    aoEstado("encerrado");
  }

  socket.onopen = () => socket.send(JSON.stringify({ type: "session.update", session: config }));
  socket.onclose = () => {
    if (!encerrado) aoEstado("erro", "A conexão caiu.");
    encerrado = true;
    audio.fechar();
  };
  socket.onmessage = async (ev) => {
    const msg = JSON.parse(ev.data);
    fila.evento(msg.type, msg.status);
    if (msg.type === "session.ready") {
      pronto = true;
      aoEstado("pronto");
    } else if (msg.type === "reply.audio") audio.tocar(msg.data);
    else if (msg.type === "reply.done" && msg.status === "interrupted") audio.silenciar();
    else if (msg.type === "transcript.user") {
      ultimaFala = msg.text;
      aoFalar({ quem: "voce", texto: msg.text });
    } else if (msg.type === "transcript.agent") aoFalar({ quem: "paciente", texto: msg.text });
    else if (msg.type === "tool.call" && msg.name === "consultar_ficha") {
      fila.chamada(msg.call_id);
      try {
        const { resposta } = await json("/api/ficha", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessaoId, atendimento, assunto: msg.arguments.assunto, ultimaFala }),
        });
        fila.resultado(msg.call_id, JSON.stringify({ resposta }));
      } catch {
        fila.resultado(msg.call_id, JSON.stringify({ erro: "Não foi possível lembrar agora. Peça para o profissional repetir a pergunta." }));
      }
    } else if (msg.type === "session.error") aoEstado("erro", msg.message);
    else if (msg.type === "session.ended") fechar();
  };

  const aoSair = () => socket.readyState === WebSocket.OPEN && socket.send(JSON.stringify({ type: "session.end" }));
  window.addEventListener("pagehide", aoSair);

  return {
    encerrar() {
      window.removeEventListener("pagehide", aoSair);
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "session.end" }));
      fechar();
    },
  };
}
```

- [ ] **Step 8: Página de teste descartável e prova por voz**

Criar `app/teste-voz/page.tsx` só para esta verificação. Ela é apagada no Step 9.

```tsx
"use client";
import { useState } from "react";
import { iniciarConversa, type Linha } from "@/lib/voz/conversa";

export default function TesteVoz() {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [estado, setEstado] = useState("parado");
  async function comecar() {
    const r = await fetch("/api/sessoes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ papel: "outro", apelido: "teste", consentimento: true }) });
    const { id } = await r.json();
    await iniciarConversa({ sessaoId: id, atendimento: 1, aoFalar: (l) => setLinhas((x) => [...x, l]), aoEstado: (e, d) => setEstado(d ? `${e}: ${d}` : e) });
  }
  return (
    <main className="p-8 space-y-2">
      <button onClick={comecar} className="border px-4 py-2">Começar</button>
      <p>{estado}</p>
      {linhas.map((l, i) => <p key={i}><b>{l.quem}:</b> {l.texto}</p>)}
    </main>
  );
}
```

Com o `npm run dev`, abrir `http://localhost:3000/teste-voz` no Chrome, clicar em Começar e perguntar em voz alta pelos sinais do caso sorteado. Conferir:
1. o paciente cumprimenta com a saudação do caso;
2. a pergunta direta sobre um sinal escondido faz a resposta sair da ficha. Checar no Supabase: `select assunto, sinal, ultima_fala from eventos order by criado_em desc limit 5`;
3. "mais alguma coisa?" não revela sinal;
4. interromper o paciente no meio da fala faz o áudio parar.

**Pedir ao Nicolas para escutar também e registrar a impressão sobre o sotaque do `rafael`.** Anotar numa linha em `docs/notas-de-teste.md` o que foi observado.

- [ ] **Step 9: Remover a página de teste e as sessões de teste, e fazer commit** (mensagem sugerida)

```bash
rm -rf app/teste-voz
git add -A
git commit -m "cliente de voz"
```

SQL no Supabase: `delete from sessoes where apelido = 'teste'`.

---

### Task 5: Telas do fluxo e deploy

**Files:**
- Create: `app/page.tsx` (substitui o gerado), `app/s/[id]/page.tsx`, `components/Atendimento.tsx`, `components/Correcao.tsx`, `components/Resultado.tsx`
- Modify: `app/layout.tsx` (título, `lang="pt-BR"`)

**Interfaces:**
- Consumes: todas as rotas da Task 3; `iniciarConversa` da Task 4; `ENCAMINHAMENTOS`, `PAPEIS`, `Correcao`, `CasoPublico`.

- [ ] **Step 1: Layout**

Em `app/layout.tsx`, trocar `<html lang="en">` por `<html lang="pt-BR">` e o `metadata` por:

```ts
export const metadata = {
  title: "Sinal de Alarme",
  description: "Treino por voz para reconhecer os sinais de alarme da dengue.",
};
```

- [ ] **Step 2: Abertura**

`app/page.tsx`:

```tsx
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
```

- [ ] **Step 3: Atendimento**

`components/Atendimento.tsx`:

```tsx
"use client";
import { useRef, useState } from "react";
import { iniciarConversa, type EstadoConversa, type Linha } from "@/lib/voz/conversa";
import { ENCAMINHAMENTOS, type CasoPublico, type Correcao, type Encaminhamento } from "@/lib/casos/tipos";

export function Atendimento({ sessaoId, atendimento, caso, aoDecidir }: { sessaoId: string; atendimento: 1 | 2; caso: CasoPublico; aoDecidir(c: Correcao): void }) {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [estado, setEstado] = useState<EstadoConversa | "parado">("parado");
  const [detalhe, setDetalhe] = useState("");
  const [decidindo, setDecidindo] = useState(false);
  const conversa = useRef<{ encerrar(): void } | null>(null);

  async function comecar() {
    setDetalhe("");
    try {
      conversa.current = await iniciarConversa({
        sessaoId,
        atendimento,
        aoFalar: (l) => setLinhas((x) => [...x, l]),
        aoEstado: (e, d) => {
          setEstado(e);
          if (d) setDetalhe(d);
        },
      });
    } catch (e) {
      setEstado("erro");
      setDetalhe((d) => d || (e as Error).message);
    }
  }

  function decidir() {
    conversa.current?.encerrar();
    setDecidindo(true);
  }

  async function escolher(encaminhamento: Encaminhamento) {
    const r = await fetch("/api/decisao", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessaoId, atendimento, encaminhamento }),
    });
    if (r.ok) aoDecidir(await r.json());
  }

  return (
    <section className="space-y-4">
      <p className="text-sm uppercase tracking-wide text-gray-500">Atendimento {atendimento} de 2</p>
      <h2 className="text-2xl font-bold">{caso.titulo}</h2>
      <p>{caso.contexto}</p>
      {!caso.revisadoPor && <p className="text-xs text-amber-700">Rascunho, sem revisão clínica.</p>}
      {!decidindo && (estado === "parado" || estado === "erro") && (
        <button onClick={comecar} className="w-full rounded bg-red-700 p-3 font-semibold text-white">
          {estado === "erro" ? "Retomar atendimento" : "Bater na porta"}
        </button>
      )}
      {estado === "conectando" && <p>Conectando…</p>}
      {detalhe && <p className="text-red-700">{detalhe}</p>}
      <div className="space-y-2">
        {linhas.map((l, i) => (
          <p key={i} className={l.quem === "voce" ? "text-right" : ""}>
            <span className={`inline-block rounded px-3 py-2 ${l.quem === "voce" ? "bg-gray-100" : "bg-red-50"}`}>{l.texto}</span>
          </p>
        ))}
      </div>
      {estado === "pronto" && !decidindo && (
        <button onClick={decidir} className="w-full rounded border-2 border-red-700 p-3 font-semibold text-red-700">Decidir o encaminhamento</button>
      )}
      {decidindo && (
        <div className="space-y-2">
          <p className="font-medium">Qual o encaminhamento?</p>
          {(Object.keys(ENCAMINHAMENTOS) as Encaminhamento[]).map((e) => (
            <button key={e} onClick={() => escolher(e)} className="block w-full rounded border p-3 text-left hover:bg-gray-50">
              <b>{e}.</b> {ENCAMINHAMENTOS[e]}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Correção e resultado**

`components/Correcao.tsx`:

```tsx
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
```

`components/Resultado.tsx`:

```tsx
"use client";
import { useState } from "react";
import type { Correcao } from "@/lib/casos/tipos";

export function Resultado({ sessaoId, c1, c2, preparoInicial }: { sessaoId: string; c1: Correcao; c2: Correcao; preparoInicial: number | null }) {
  const [preparo, setPreparo] = useState(preparoInicial);

  async function responder(n: number) {
    const r = await fetch(`/api/sessoes/${sessaoId}/preparo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ preparo: n }),
    });
    if (r.ok) setPreparo(n);
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
        </div>
      ) : (
        <p>Obrigado! <a href="/estudo" className="underline">Ver o painel do estudo</a></p>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Página da sessão**

`app/s/[id]/page.tsx`:

```tsx
"use client";
import { use, useEffect, useState } from "react";
import { Atendimento } from "@/components/Atendimento";
import { Correcao } from "@/components/Correcao";
import { Resultado } from "@/components/Resultado";
import type { CasoPublico, Correcao as TCorrecao } from "@/lib/casos/tipos";

interface Estado {
  id: string;
  casos: [CasoPublico, CasoPublico];
  correcoes: [TCorrecao | null, TCorrecao | null];
  preparo: number | null;
}

export default function Sessao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [s, setS] = useState<Estado | null>(null);
  const [erro, setErro] = useState("");
  const [seguiu, setSeguiu] = useState(false);
  const [verResultado, setVerResultado] = useState(false);

  useEffect(() => {
    fetch(`/api/sessoes/${id}`).then(async (r) => (r.ok ? setS(await r.json()) : setErro("Sessão não encontrada.")));
  }, [id]);

  if (erro) return <main className="mx-auto max-w-xl p-6">{erro}</main>;
  if (!s) return <main className="mx-auto max-w-xl p-6">Carregando…</main>;

  const [c1, c2] = s.correcoes;
  const decidiu = (n: 0 | 1) => (c: TCorrecao) => setS({ ...s, correcoes: n === 0 ? [c, c2] : [c1, c] });

  let conteudo;
  if (!c1) conteudo = <Atendimento key="a1" sessaoId={id} atendimento={1} caso={s.casos[0]} aoDecidir={decidiu(0)} />;
  else if (!c2 && !seguiu)
    conteudo = (
      <>
        <Correcao c={c1} />
        <button onClick={() => setSeguiu(true)} className="w-full rounded bg-red-700 p-3 font-semibold text-white">Próximo paciente</button>
      </>
    );
  else if (!c2) conteudo = <Atendimento key="a2" sessaoId={id} atendimento={2} caso={s.casos[1]} aoDecidir={decidiu(1)} />;
  else if (!verResultado && s.preparo === null)
    conteudo = (
      <>
        <Correcao c={c2} />
        <button onClick={() => setVerResultado(true)} className="w-full rounded bg-red-700 p-3 font-semibold text-white">Ver meu resultado</button>
      </>
    );
  else conteudo = <Resultado sessaoId={id} c1={c1} c2={c2} preparoInicial={s.preparo} />;

  return <main className="mx-auto max-w-xl space-y-6 p-6">{conteudo}</main>;
}
```

- [ ] **Step 6: Build, testes e fluxo completo local**

Run: `npm test && npm run build`
Expected: testes PASS e build sem erro.

Com o `npm run dev`, fazer uma sessão inteira pelo navegador (abertura → atendimento 1 por voz → correção → atendimento 2 → correção → resultado → nota) e conferir que recarregar a página no meio retoma na etapa certa. Apagar a sessão depois.

- [ ] **Step 7: Deploy na Vercel (com o Nicolas)**

O Nicolas faz `npx vercel login`. Depois:

```bash
npx vercel link --yes
npx vercel env add ASSEMBLYAI_API_KEY production
npx vercel env add DATABASE_URL production
npx vercel env add IP_SALT production
npx vercel --prod
```

Expected: uma URL `https://…vercel.app`. Repetir uma sessão inteira na URL pública, pelo celular também (o microfone exige HTTPS, que a Vercel já dá). Apagar a sessão depois.

- [ ] **Step 8: Commit** (mensagem sugerida)

```bash
git add -A
git commit -m "telas do fluxo"
```

---

### Task 6: Painel público `/estudo`

**Files:**
- Create: `app/estudo/page.tsx`

**Interfaces:**
- Consumes: `sql`, `CASOS_PRIVADOS`, `corrigir`, `carregarEventos`, `agregar`, `PAPEIS`.

- [ ] **Step 1: Página**

`app/estudo/page.tsx`:

```tsx
import { sql } from "@/lib/db";
import { CASOS_PRIVADOS } from "@/lib/casos/privado";
import { corrigir } from "@/lib/estudo/corrigir";
import { carregarEventos, type LinhaSessao } from "@/lib/estudo/carregar";
import { agregar, type SessaoCorrigida } from "@/lib/estudo/agregar";
import { PAPEIS, type Papel } from "@/lib/casos/tipos";

export const dynamic = "force-dynamic";

const pct = (x: number) => `${Math.round(x * 100)}%`;

export default async function Estudo() {
  const linhas = await sql<LinhaSessao[]>`
    select id, papel, caso_1, caso_2, encaminhamento_1, encaminhamento_2, preparo, tokens
    from sessoes where encaminhamento_2 is not null and apelido <> 'teste' order by criada_em`;
  const sessoes: SessaoCorrigida[] = [];
  for (const s of linhas) {
    sessoes.push({
      papel: s.papel,
      c1: corrigir(CASOS_PRIVADOS[s.caso_1], await carregarEventos(s.id, 1), s.encaminhamento_1!),
      c2: corrigir(CASOS_PRIVADOS[s.caso_2], await carregarEventos(s.id, 2), s.encaminhamento_2!),
      preparo: s.preparo,
    });
  }
  const p = agregar(sessoes);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-3xl font-bold">Sinal de Alarme: o estudo</h1>
      <p>Cada pessoa atende dois pacientes por voz, sem ajuda. Entre um e outro, recebe a correção. A ordem dos casos segue um rodízio entre todas as combinações, para a diferença de dificuldade entre os casos não virar “aprendizado”.</p>
      <p className="text-lg"><b>{p.n}</b> pessoas concluíram.</p>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b"><th className="py-2"></th><th>Atendimento 1</th><th>Atendimento 2</th></tr>
        </thead>
        <tbody>
          <tr className="border-b"><td className="py-2">Sinais de alarme descobertos (média)</td><td>{pct(p.sinais1)}</td><td>{pct(p.sinais2)}</td></tr>
          <tr className="border-b"><td className="py-2">Encaminhamento correto</td><td>{pct(p.acerto1)}</td><td>{pct(p.acerto2)}</td></tr>
        </tbody>
      </table>
      <p>{p.melhoraram} de {p.n} descobriram uma proporção maior de sinais no segundo atendimento.</p>
      {p.preparoMedio !== null && <p>“Me sinto mais preparado(a)”: média {p.preparoMedio.toFixed(1)} de 5.</p>}
      <div>
        <p className="font-medium">Quem participou</p>
        <ul>{(Object.entries(p.porPapel) as [Papel, number][]).map(([papel, n]) => <li key={papel}>{PAPEIS[papel]}: {n}</li>)}</ul>
      </div>
      <div className="text-sm text-gray-600 space-y-1">
        <p>Limites: amostra pequena e por conveniência; no estudo a resposta certa é sempre “urgência”, então o acerto de encaminhamento é métrica secundária; o modelo de linguagem classifica cada pergunta num assunto, e o código é dono dos fatos e da nota.</p>
      </div>
      <a href="/" className="underline">Fazer o treino</a>
    </main>
  );
}
```

- [ ] **Step 2: Verificar**

Run: `npm run build`, depois abrir `/estudo` no `npm run dev`.
Expected: página com `0 pessoas concluíram` (ou com as sessões reais) e nenhum apelido visível. Conferir no HTML (`curl -s localhost:3000/estudo | grep -i apelido`) que não sai nada.

- [ ] **Step 3: Deploy e commit** (mensagem sugerida)

```bash
npx vercel --prod
git add -A
git commit -m "painel do estudo"
```

---

### Task 7: Materiais de submissão

**Files:**
- Create: `README.md` (substitui o gerado), `LICENSE`

- [ ] **Step 1: LICENSE MIT** com `Copyright (c) 2026 Nicolas de Vargas`, texto padrão da MIT.

- [ ] **Step 2: README em inglês** (os avaliadores leem inglês). Seções: o problema (dengue no Brasil, sinais de alarme que passam despercebidos na visita domiciliar); o que o app faz; a tese "the model doesn't know the hidden signs"; diagrama da arquitetura (o do spec §5, traduzido); como a Voice Agent API é usada (inline `session.update`, client-side tool `consultar_ficha`, `rafael`, `language_codes: ["pt"]`, keyterms, barge-in, `session.end`); o estudo e o link do `/estudo`; como rodar (`.env.example`, `npm run migrar`, `npm run dev`); limites conhecidos (os do painel + voz masculina única, possível sotaque de Portugal). O texto final precisa ser aprovado pelo Nicolas.

- [ ] **Step 3: Commit** (mensagem sugerida)

```bash
git add README.md LICENSE
git commit -m "readme e licença"
```

Vídeo, slides e o formulário da lablab ficam com o Nicolas no dia 29/09, com apoio do texto do README.
