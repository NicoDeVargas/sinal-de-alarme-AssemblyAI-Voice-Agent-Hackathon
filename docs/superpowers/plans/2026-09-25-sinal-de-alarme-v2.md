# Sinal de Alarme v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ampliar o Sinal de Alarme para 5 casos com achados críticos, paciente que pergunta de volta, correção em 5 dimensões (determinística + LLM com citação verificada), preceptor por voz entre os atendimentos, painel novo e visual refeito.

**Architecture:** Sobre o app v1 (Next.js App Router, Voice Agent API da AssemblyAI, Postgres/Supabase). Fatos e gabaritos continuam só no servidor. O LLM avalia a transcrição via endpoint compatível com OpenAI (padrão: LLM Gateway da AssemblyAI), e uma função pura descarta qualquer item sem citação literal do profissional.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, Vitest, `postgres`, `zod`, AssemblyAI Voice Agent API + LLM Gateway.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-24-sinal-de-alarme-design.md`, **seção "Versão 2"** (prevalece sobre a V1 onde conflitar).
- Código simples, **sem comentários**. UI e conteúdo em pt-BR. Identificadores em português.
- Voz `rafael`, `input.language_codes: ["pt"]`, modelo conversacional gerenciado (sem campo `llm`).
- `lib/casos/privado.ts` (fatos, achados, respostas esperadas) nunca chega ao navegador nem a prompt de paciente; importa `server-only`. O prompt do **preceptor** pode conter a correção (já decidida).
- Apelido nunca aparece em `/estudo`; sessões com `lower(apelido) = 'teste'` ficam fora do estudo.
- Pesos da nota: achados 40, encaminhamento 20, anamnese 15, orientações 15, pergunta 10.
- LLM configurável: `LLM_BASE_URL` (padrão `https://llm-gateway.assemblyai.com/v1`), `LLM_MODELO` (padrão `qwen3.5-4b-32k-fast`), `LLM_API_KEY` (padrão `ASSEMBLYAI_API_KEY`). Chamada `POST {base}/chat/completions` com header `authorization: <key>` quando o base for o da AssemblyAI, e `Authorization: Bearer <key>` caso contrário; `response_format: {type:"json_schema", json_schema:{name, schema, strict:true}}`; timeout 25 s.
- Build local exige `NEXT_TELEMETRY_DISABLED=1`. Commits sem trailer, identidade já configurada, sem push. Nunca commitar `.superpowers/`, `.claude/`, `.env.local`.
- Banco real em `.env.local` (Supabase ca-central-1). Migrações só aditivas (`create table if not exists`, `alter table ... add column if not exists`).

---

### Task 8: Casos v2

**Files:** Modify `lib/casos/tipos.ts`, `lib/casos/publico.ts`, `lib/casos/privado.ts`, `lib/casos/prompt.ts`, `lib/estudo/pares.ts`, `lib/estudo/ficha.ts`, tests `tests/prompt.test.ts`, `tests/estudo.test.ts`.

**Interfaces (produces):**

```ts
export type CasoId = "davi" | "joaquim" | "rafa" | "juliana" | "celia";
export const CASO_IDS: CasoId[] = ["davi", "joaquim", "rafa", "juliana", "celia"];

export interface CasoPublico { id; titulo; contexto; quem; persona; queixa; saudacao; perguntaDoPaciente: string; revisadoPor: string | null; revisadoEm: string | null }

export interface Achado { id: string; nome: string; tipo: "alarme" | "risco"; perguntaModelo: string }
export interface EntradaFicha { fato: string; achado?: string }
export interface CasoPrivado {
  id: CasoId; respostaNormal: string;
  ficha: Partial<Record<Assunto, EntradaFicha>>;
  achados: Achado[];
  encaminhamento: Encaminhamento; motivo: string;
  respostaEsperada: string;
  palavrasProibidas: string[];
}
export interface Evento { assunto: Assunto; achado: string | null; ultimaFala: string; criadoEm: string }

export const ANAMNESE: { id: string; nome: string; assuntos: Assunto[]; perguntaModelo: string }[] = [
  { id: "dia_da_doenca", nome: "Há quantos dias começou a febre", assuntos: ["evolucao_da_febre"], perguntaModelo: "Há quantos dias começou a febre? Ela já passou?" },
  { id: "hidratacao", nome: "Hidratação e diurese", assuntos: ["alimentacao_hidratacao", "urina"], perguntaModelo: "Está conseguindo beber líquido? Está urinando normal?" },
  { id: "doencas_remedios", nome: "Doenças e remédios em uso", assuntos: ["doencas_e_remedios"], perguntaModelo: "Tem alguma doença? Está tomando algum remédio?" },
];

export const ORIENTACOES: { id: string; nome: string; criterio: string }[] = [
  { id: "hidratacao_oral", nome: "Hidratação oral", criterio: "orientou beber mais líquido (água, soro, sucos)" },
  { id: "sem_aas_aine", nome: "Sem AAS ou anti-inflamatório", criterio: "orientou não usar AAS, aspirina, ibuprofeno, diclofenaco ou outro anti-inflamatório" },
  { id: "sinais_de_retorno", nome: "Sinais para procurar ajuda", criterio: "explicou algum sinal que exige procurar atendimento imediatamente (ex.: vômitos, dor na barriga, sangramento, tontura, sonolência)" },
  { id: "para_onde_e_quando", nome: "Para onde ir e quando", criterio: "disse para onde a pessoa deve ir (UBS, UPA, pronto-socorro) e quando" },
];
```

`Evento.sinal` vira `Evento.achado` em todo o código (rotas usam o nome da coluna `sinal` no banco — manter a coluna `sinal` e mapear para `achado` em `carregarEventos`).

- [ ] **Step 1: Conteúdo.** Reescrever `publico.ts` e `privado.ts` com os 5 casos do spec V2.1. Casos `davi`, `joaquim`, `rafa`: mesmo conteúdo da v1, `sinais` → `achados` com `tipo:"alarme"`, `sinal` → `achado` na ficha, mais `perguntaDoPaciente` e `respostaEsperada`:
  - davi: pergunta "Posso dar AAS pra baixar a febre dele?"; esperada "Não. AAS (aspirina) é contraindicado na suspeita de dengue. Para febre, dipirona ou paracetamol na dose indicada, e levar o Davi agora para a urgência."
  - joaquim: "Preciso ir mesmo? Já tô melhor, a febre passou."; esperada "Precisa, e agora. Quando a febre passa começa a fase mais perigosa da dengue, e tontura ao levantar e falta de ar são sinais de alarme."
  - rafa: "Posso tomar mais daquele anti-inflamatório? Ajudou na dor."; esperada "Não. Anti-inflamatório é contraindicado na dengue e aumenta o risco de sangramento, ainda mais com a gengiva sangrando. Para dor e febre, dipirona ou paracetamol."
  - juliana: persona Pedro, 31, marido, tranquilo, acha que é gripe, fala sobre a Juliana; queixa "a Juliana está com febre há dois dias e dor no corpo, está deitada lá dentro"; saudação "Oi, boa tarde! É a Juliana, minha esposa, tá de cama com febre desde ontem de manhã."; ficha: `gestacao` {fato: "Tá grávida sim, de sete meses. É nosso primeiro.", achado: "gestacao"}, `idade` {"Vinte e oito."}, `evolucao_da_febre` {"Começou ontem de manhã, trinta e oito e pouco."}, `alimentacao_hidratacao` {"Tá bebendo água, comendo pouco."}, `urina` {"Normal, acho."}, `doencas_e_remedios` {"Ela não tem nada. Tomou um paracetamol ontem."}; achados [{id:"gestacao", nome:"Gestante (grupo de risco)", tipo:"risco", perguntaModelo:"Ela está grávida ou pode estar?"}]; encaminhamento "B"; motivo "Gestante com suspeita de dengue é grupo de risco: sem sinais de alarme, vai à UBS hoje, com prioridade, para avaliação e acompanhamento."; pergunta "Ela pode tomar aquele remédio de gripe que tem aqui?"; esperada "Melhor não. Muitos antigripais têm AAS ou outros componentes que não são indicados. Na gravidez, só paracetamol se precisar, e ela deve ser avaliada hoje na UBS."; palavrasProibidas ["gravid", "gestan", "bebê", "sete meses"].
  - celia: persona Roberto, 38, filho, preocupado mas prático, fala sobre a mãe; queixa "a mãe está com febre há três dias, dor nas juntas e muito cansada"; saudação "Bom dia! Entra, por favor. É a minha mãe, Dona Célia, tá com febre faz uns três dias."; ficha: `doencas_e_remedios` {fato:"Ela é diabética, toma insulina de manhã e de noite. E remédio de pressão.", achado:"diabetes"}, `idade` {"Sessenta e quatro."}, `evolucao_da_febre` {"Começou segunda. Ainda tá com febre."}, `alimentacao_hidratacao` {"Tá comendo menos, mas bebendo água."}, `urina` {"Tá normal."}; achados [{id:"diabetes", nome:"Diabetes em uso de insulina (grupo de risco)", tipo:"risco", perguntaModelo:"Ela tem alguma doença, como diabetes ou pressão alta? Usa algum remédio?"}]; encaminhamento "B"; motivo "Diabetes é condição de risco na dengue: mesmo sem sinais de alarme, ela deve ser avaliada hoje na UBS, com prioridade."; pergunta "Precisa mesmo levar ela no posto? Ela detesta ir lá."; esperada "Precisa, hoje. Diabética com suspeita de dengue é grupo de risco e deve ser avaliada na UBS com prioridade."; palavrasProibidas ["diabet", "insulin", "açúcar", "pressão"].
- [ ] **Step 2: Prompt.** `montarSessao` acrescenta ao system prompt, depois das regras existentes: `Em algum momento natural, depois de pelo menos três trocas ou quando o profissional começar a orientar, pergunte uma única vez: "${caso.perguntaDoPaciente}". Depois, reaja à resposta com naturalidade.` Nada mais muda na sessão.
- [ ] **Step 3: Pares.** `PARES` passa a ser gerado de `CASO_IDS` (todas as 20 permutações ordenadas, na ordem de `CASO_IDS`); `escolherPar` inalterado.
- [ ] **Step 4: Testes.** Atualizar `tests/prompt.test.ts` (it.each sobre 5 casos; garantir que cada `achado` tem entrada na ficha que o revela; a pergunta do paciente aparece no prompt; nenhum fato/palavra proibida no prompt). `tests/estudo.test.ts`: `PARES` tem 20 pares distintos sem repetição interna; `resolverFicha` devolve `{resposta, achado}` (renomear campo). Rodar RED antes de mexer no código, depois GREEN.
- [ ] **Step 5:** `npm test`, `npm run lint`, build. Commit `casos v2`.

---

### Task 9: Correção v2 e avaliação por LLM

**Files:** Create `lib/estudo/normalizar.ts`, `lib/estudo/verificar.ts`, `lib/estudo/avaliar.ts`; rewrite `lib/estudo/corrigir.ts`; update `lib/estudo/agregar.ts`; tests `tests/verificar.test.ts`, `tests/corrigir.test.ts` (replace the corrigir/agregar parts of `tests/estudo.test.ts`).

**Interfaces (produces):**

```ts
export function normalizar(texto: string): string
export interface Fala { quem: "profissional" | "paciente"; texto: string }
export interface AvaliacaoBruta {
  orientacoes: { id: string; cumprida: boolean; citacao: string }[];
  respostaPaciente: { respondeu: boolean; correta: boolean; citacao: string; comentario: string };
  comunicacao: { tipo: "positivo" | "melhorar"; texto: string; citacao: string }[];
}
export interface Avaliacao {
  orientacoes: { id: string; nome: string; cumprida: boolean; citacao: string | null }[];
  respostaPaciente: { correta: boolean; citacao: string | null; comentario: string };
  comunicacao: { tipo: "positivo" | "melhorar"; texto: string; citacao: string }[];
}
export function verificar(bruta: AvaliacaoBruta, falas: Fala[]): Avaliacao
export async function avaliar(caso: CasoPrivado, publico: CasoPublico, falas: Fala[]): Promise<Avaliacao | null>

export interface ItemCorrigido { id: string; nome: string; feito: boolean; evidencia: string }
export interface Correcao {
  achados: ItemCorrigido[];
  anamnese: ItemCorrigido[];
  orientacoes: { id: string; nome: string; feito: boolean; evidencia: string | null }[] | null;
  respostaPaciente: { pergunta: string; correta: boolean; citacao: string | null; comentario: string; esperada: string } | null;
  comunicacao: { tipo: "positivo" | "melhorar"; texto: string; citacao: string }[];
  escolhido: Encaminhamento; correto: Encaminhamento; acertou: boolean; motivo: string;
  partes: { achados: number; encaminhamento: number; anamnese: number; orientacoes: number | null; pergunta: number | null };
  nota: number;
  notaDeterministica: number;
}
export function corrigir(caso: CasoPrivado, publico: CasoPublico, eventos: Evento[], escolhido: Encaminhamento, avaliacao: Avaliacao | null): Correcao
```

Rules:
- `normalizar`: minúsculas, remove acentos (NFD + remove `\p{Diacritic}`), troca tudo que não é letra/dígito por espaço, colapsa espaços, trim.
- `verificar`: junta as falas do profissional normalizadas com " | "; uma citação é válida se `normalizar(citacao)` tiver pelo menos 3 caracteres e for substring desse texto. Orientação só fica `cumprida` se `cumprida && citação válida` (citacao `null` se inválida). Ids de orientação fora de `ORIENTACOES` são descartados; ids ausentes viram `cumprida:false`. `respostaPaciente.correta` só se `respondeu && correta && citação válida`. Comunicação: mantém só itens com citação válida.
- `corrigir`: achados pelo primeiro evento com `achado === id` (evidência = `ultimaFala`; perdido → `perguntaModelo`); anamnese pelo primeiro evento com `assunto` em `assuntos` (evidência = `ultimaFala`; não feito → `perguntaModelo`). Partes: achados = 40 × descobertos/total; encaminhamento = 20 se acertou; anamnese = 15 × feitos/3; orientações = 15 × cumpridas/4 (null sem avaliação); pergunta = 10 se correta (null sem avaliação). `notaDeterministica = round((achados + encaminhamento + anamnese) / 75 × 100)`; `nota = avaliacao ? round(soma de todas as partes) : notaDeterministica`.
- `avaliar`: monta um prompt em pt-BR com o caso (quem, queixa, pergunta do paciente, resposta esperada, a lista `ORIENTACOES` com critérios) e a transcrição numerada ("Profissional:" / "Paciente:"); instrui: julgar só o que o profissional disse; citar trecho literal copiado da fala do profissional; não inventar; comunicação no máximo 3 itens. JSON schema estrito correspondente a `AvaliacaoBruta`. Chamada conforme Global Constraints. Qualquer erro, timeout, JSON inválido → `null`. Depois `verificar`.
- `agregar` passa a receber `{ papel, c1, c2, preparo, fezPreceptor }` e devolve `{ n, nota1, nota2, achados1, achados2, acerto1, acerto2, melhoraram, fizeramPreceptor, porPapel, preparoMedio }` (médias 0–1 para achados/acerto, 0–100 para nota; `melhoraram` = nota2 > nota1).

- [ ] **Step 1:** Testes de `normalizar` e `verificar` (citação com acento/pontuação diferente aceita; citação inventada rejeitada; citação de fala do paciente rejeitada; id desconhecido descartado; id ausente vira não cumprida; comunicação sem citação válida removida). RED.
- [ ] **Step 2:** Implementar `normalizar`, `verificar`. GREEN.
- [ ] **Step 3:** Testes de `corrigir` (caso `juliana`: gestação descoberta, anamnese 2/3, encaminhamento A errado, com avaliação 2/4 orientações e pergunta correta → partes e nota exatas; sem avaliação → orientações/pergunta null e nota = notaDeterministica) e de `agregar`. RED → implementar → GREEN.
- [ ] **Step 4:** `avaliar` (sem teste de rede; um teste com `fetch` substituído por `vi.fn` que devolve um JSON válido e confere que o resultado passou por `verificar`, e outro com resposta 500 → `null`).
- [ ] **Step 5:** Script `scripts/experimentar-avaliacao.mjs`? **Não** — YAGNI. Verificação real vem na Task 10.
- [ ] **Step 6:** `npm test`, lint, build. Commit `correção v2 e avaliação`.

---

### Task 10: Banco e API v2

**Files:** Modify `db/schema.sql`, `lib/estudo/carregar.ts`, `app/api/decisao/route.ts`, `app/api/sessoes/[id]/route.ts`, `app/api/token/route.ts`, `app/api/ficha/route.ts`; create `app/api/sessoes/[id]/preceptor/config/route.ts`, `app/api/sessoes/[id]/preceptor/route.ts`, `lib/casos/preceptor.ts`.

- [ ] **Step 1: Esquema aditivo.**

```sql
create table if not exists falas (
  id bigserial primary key,
  sessao_id uuid not null references sessoes(id) on delete cascade,
  atendimento int not null check (atendimento in (1, 2)),
  ordem int not null,
  quem text not null check (quem in ('profissional', 'paciente')),
  texto text not null
);
create table if not exists avaliacoes (
  sessao_id uuid not null references sessoes(id) on delete cascade,
  atendimento int not null check (atendimento in (1, 2)),
  resultado jsonb,
  criada_em timestamptz not null default now(),
  primary key (sessao_id, atendimento)
);
alter table sessoes add column if not exists preceptor_segundos int;
```

Rodar `npm run migrar`.
- [ ] **Step 2: `/api/ficha`** grava `achado` na coluna `sinal` (nome antigo mantido). Sem outra mudança.
- [ ] **Step 3: `/api/decisao`** aceita `transcricao: {quem: "profissional"|"paciente", texto: string ≤1000}[]` (máx. 300 itens, pode ser vazia). Ordem: valida; UPDATE condicional com `returning id` (409 se nada); grava `falas`; chama `avaliar` (pode levar até 25 s); grava `avaliacoes` (resultado `null` se falhou); responde a `Correcao` v2. Exportar `export const maxDuration = 60`.
- [ ] **Step 4: `carregar.ts`**: `correcoesDa` lê eventos + `avaliacoes.resultado` e chama `corrigir` v2; `carregarSessao` inclui `preceptor_segundos`.
- [ ] **Step 5: Preceptor.** `lib/casos/preceptor.ts` exporta `montarPreceptor(publico: CasoPublico, correcao: Correcao): SessaoVoz` — sem tools, voz `rafael`, `language_codes ["pt"]`, greeting "Oi! Sou o preceptor. Vamos conversar dois minutinhos sobre a visita que você acabou de fazer?", system prompt em pt-BR: preceptor experiente de atenção primária, socrático e acolhedor, frases curtas, no máximo 3 minutos; conhece o resumo da correção (achados descobertos/perdidos com a pergunta-modelo, anamnese, orientações dadas/faltantes, resposta à pergunta do paciente, encaminhamento escolhido vs. correto, motivo); começa perguntando como a pessoa acha que foi; foca em no máximo dois pontos a melhorar, fazendo a pessoa chegar à resposta; nunca lê a lista inteira; nunca fala do próximo caso; se a pessoa pedir para encerrar, despede-se. `montarSessao` e `montarPreceptor` compartilham o tipo `SessaoVoz` (tornar `tools` opcional no tipo).
  - `GET /api/sessoes/:id/preceptor/config`: 409 se atendimento 1 não decidido ou 2 já decidido; devolve `montarPreceptor` com a correção 1.
  - `POST /api/sessoes/:id/preceptor` body `{segundos: 0..600}` grava `preceptor_segundos` (0 = pulou). 409 se já gravado.
- [ ] **Step 6: Token**: limite 12.
- [ ] **Step 7: `GET /api/sessoes/:id`** devolve também `preceptorSegundos`.
- [ ] **Step 8: Verificação real** com o servidor na porta 3032 (`NEXT_TELEMETRY_DISABLED=1 npx next dev -p 3032`, parar ao fim): criar sessão `teste`, 2 eventos de ficha, decisão com transcrição curta de exemplo contendo uma orientação de hidratação e resposta à pergunta; conferir resposta com `orientacoes` avaliadas ou `null` (anotar qual — depende do modelo liberado); conferir 409 na 2ª decisão; preceptor config 200; apagar sessões `teste`. Anotar tempo da decisão.
- [ ] **Step 9:** testes, lint, build. Commit `banco e api v2`.

---

### Task 11: Cliente e fluxo v2 (funcional, estilo mínimo)

**Files:** Modify `lib/voz/conversa.ts`, `components/Atendimento.tsx`, `components/Correcao.tsx`, `components/Resultado.tsx`, `app/s/[id]/page.tsx`; create `components/Preceptor.tsx`.

- [ ] **Step 1:** `iniciarConversa` ganha `configUrl: string` e `comFicha: boolean` (paciente: `/api/sessoes/:id/atendimentos/:n/config`, `true`; preceptor: `/api/sessoes/:id/preceptor/config`, `false`). Expõe `transcricao(): Fala[]` com as falas finais na ordem (`transcript.user` → profissional, `transcript.agent` → paciente, usando o texto final/interrompido). Manter a transcrição em tempo real feita na depuração anterior.
- [ ] **Step 2:** `Atendimento` envia `transcricao` junto na decisão (inclusive se a conversa já tiver terminado — guardar a última transcrição conhecida) e mostra "Corrigindo…" enquanto espera.
- [ ] **Step 3:** `Correcao` mostra: nota 0–100 e as partes; achados (feito/perdido + evidência); encaminhamento; anamnese; orientações (ou "não avaliado"); pergunta do paciente com a resposta esperada; comunicação.
- [ ] **Step 4:** `Preceptor`: explica em uma frase, botões "Conversar com o preceptor" e "Pular"; durante a conversa mostra transcrição, contador regressivo de 3:00 e "Encerrar"; ao encerrar/pular/zerar, `POST /api/sessoes/:id/preceptor {segundos}` e segue.
- [ ] **Step 5:** Fluxo em `app/s/[id]/page.tsx`: atendimento 1 → correção 1 → preceptor (se `preceptorSegundos === null`) → atendimento 2 → correção 2 → resultado. Recarregar a página retoma na etapa certa.
- [ ] **Step 6:** `Resultado` mostra nota 1 → nota 2 e achados 1 → 2.
- [ ] **Step 7:** testes, lint, build. Commit `fluxo v2`.

---

### Task 12: Painel v2

**Files:** Modify `app/estudo/page.tsx`.

- [ ] Ler sessões concluídas (fora `teste`), corrigir v2 com eventos + avaliação, `agregar` v2 e mostrar: n, nota média 1 vs. 2, achados 1 vs. 2, encaminhamento 1 vs. 2, quantos melhoraram a nota, quantos fizeram o preceptor (`preceptor_segundos > 0`), por papel, média do preparo, e o texto de limites atualizado (amostra pequena; LLM avalia orientações com citação verificada; o modelo classifica cada pergunta num assunto). Carregar eventos/avaliações em uma consulta cada (`where sessao_id in ...`), sem N+1. Commit `painel v2`.

---

### Task 13: Visual

**Files:** `app/globals.css`, `app/layout.tsx`, todas as páginas e componentes.

- [ ] Carregar o skill `design-taste-frontend` (Skill tool) e seguir. Direção: ferramenta de treino clínico séria e acolhedora, mobile-first (375 px), leitura fácil ao sol, alvos de toque ≥ 44 px, contraste AA. Identidade: nome "Sinal de Alarme"; vermelho de alarme só como acento; base neutra quente. Tela de atendimento como uma "visita": cabeçalho com o caso, bolhas de conversa com parcial em cinza, indicador de quem está falando, botão de decidir fixo embaixo. Correção como boletim legível (nota grande, partes em barras, itens com citação). Sem mudar comportamento. Verificar com screenshots em 375 e 1280 no navegador (servidor na 3032, sessão `teste`, apagar depois). Commit `visual`.

---

### Task 14: README, deploy e checagem final

- [ ] README atualizado para a v2 (dimensões, citação verificada, preceptor, casos com respostas variadas; `LIVE_URL` continua marcador).
- [ ] Deploy na Vercel com o Nicolas (login dele), variáveis `ASSEMBLYAI_API_KEY`, `DATABASE_URL`, `IP_SALT`, `LLM_*` se usadas; sessão completa na URL pública pelo celular; apagar sessões `teste`. Commit `readme v2`.
