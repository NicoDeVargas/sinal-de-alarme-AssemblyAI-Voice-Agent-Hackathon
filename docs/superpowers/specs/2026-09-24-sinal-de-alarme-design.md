# Sinal de Alarme: design

Data: 24/09/2026
Destino: AssemblyAI Voice Agent Hackathon (lablab.ai), envio até 29/09/2026 à noite
(prazo oficial: 30/09/2026, 12:00 BST = 08:00 de Brasília).

## 1. O que é

Treino por voz para agentes comunitários de saúde, técnicos de enfermagem e estudantes
de medicina e enfermagem. O objetivo é que eles não deixem passar os sinais de alarme
da dengue. A pessoa faz uma visita domiciliar simulada e conversa em voz alta com um
paciente, que só revela o que esconde se ela perguntar do jeito certo. Depois ela decide
o encaminhamento e recebe a correção, com as próprias frases como evidência.

A tese do projeto: **o modelo não sabe os sinais escondidos. O código é dono dos fatos
e da nota.**

Hackathons seguintes para os quais este projeto pode evoluir (fora do escopo agora):
Google Agents for Impact (jan/2027) e HSIL (mar/2027).

## 2. Público e medição

- Validação com cerca de 10 pessoas, misturando ACS/técnicos de enfermagem e estudantes
  de medicina/enfermagem.
- Uma tarefa só, a do ACS: descobrir os sinais de alarme perguntando e escolher o
  encaminhamento.
- A medição fica dentro do app. Atendimento 1 sem ajuda → correção → atendimento 2
  sem ajuda. A mesma métrica nos dois: sinais descobertos / sinais do caso, e se o
  encaminhamento está correto.
- Contrabalanceamento: os dois atendimentos do estudo usam só os 3 casos com sinal
  escondido (`davi`, `joaquim`, `rafa`), porque um caso sem sinal não mede nada. A ordem
  vem de um rodízio entre as 6 permutações (a sessão n usa a permutação n mod 6), que
  equilibra melhor que sorteio com ~10 pessoas.
- Limite conhecido: no estudo a resposta certa é sempre `C`, então o acerto de
  encaminhamento é métrica secundária. A principal é a de sinais descobertos.
- No fim, uma pergunta de uma linha, 1 a 5: "Você se sente mais preparado para
  reconhecer um sinal de alarme?"

## 3. Experiência (uma sessão de ~15 min)

1. **Abertura.** Apelido, papel (`acs`, `tecnico_enfermagem`, `estudante_medicina`,
   `estudante_enfermagem`, `outro`) e consentimento para gravar a voz no provedor.
   Sem login.
2. **Atendimento 1.** Contexto em uma frase na tela e conversa por voz livre. O botão
   **Decidir** encerra a conversa e abre as três opções:
   - `A`: hidratação + ir à UBS para avaliação (sem alarme, fora de grupo de risco)
   - `B`: UBS hoje, com prioridade (grupo de risco, sem alarme)
   - `C`: urgência agora (qualquer sinal de alarme)
3. **Correção.** Para cada sinal de alarme do caso:
   - descoberto: mostra a frase transcrita da pessoa que o revelou;
   - perdido: mostra a pergunta que o teria revelado.

   Mostra também o encaminhamento certo e o motivo.
4. **Atendimento 2.** O outro caso do par, na mesma dinâmica.
5. **Resultado.** "Atendimento 1: x de y sinais · Atendimento 2: x de y sinais", os
   encaminhamentos e a pergunta final.
6. **Painel público (`/estudo`).** Números agregados de todas as sessões concluídas,
   sem nomes nem apelidos: n, média de sinais descobertos no atendimento 1 e no 2,
   acerto de encaminhamento no 1 e no 2, distribuição por papel e média da pergunta
   final. É o link principal da submissão.

## 4. Casos

Todos com um homem falando (a Voice Agent API só tem uma voz em português, `rafael`).
Numa visita domiciliar é comum um familiar relatar os sintomas.

| id | Quem fala | Queixa principal (no prompt) | Escondido (só pela ficha) | Resposta |
|---|---|---|---|---|
| `davi` | Pai do Davi, 1 ano e 8 meses | febre há 3 dias | vômitos persistentes (4 hoje); sonolência/"molinho" | C |
| `joaquim` | Seu Joaquim, 70, hipertenso | teve febre alta, "agora tá melhor" | tontura ao levantar (quase caiu); falta de ar ao deitar. Contexto sem pontuar: a febre cessou ontem (fase crítica) | C |
| `rafa` | Rafa, 22 | febre há 4 dias | sangramento de gengiva ("sempre sangra um pouco"); dor abdominal intensa e contínua | C |

Os casos `antonio` (sem alarme, resposta A) e `juliana` (gestante, resposta B) ficam
fora desta versão e voltam num modo de treino livre. As opções A e B continuam na
tela, porque quem deixa passar um sinal tende a escolhê-las.

Os sinais seguem a lista do Ministério da Saúde (Dengue: diagnóstico e manejo clínico).
Cada caso tem os campos `revisado_por` e `revisado_em`. Enquanto estiverem vazios, a
tela mostra "rascunho, sem revisão clínica".

### Assuntos da ficha (lista fechada)

`sangramento`, `vomito`, `dor_abdominal`, `tontura_desmaio`, `sonolencia_irritabilidade`,
`falta_de_ar_inchaco`, `urina`, `evolucao_da_febre`, `gestacao`, `doencas_e_remedios`,
`idade`, `alimentacao_hidratacao`, `outro`.

Cada caso define, por assunto, o fato revelado e se ele é um sinal de alarme (e qual).
Assunto sem entrada no caso devolve a resposta normal do caso ("não, nada disso").

## 5. Arquitetura

- **Next.js (App Router, TypeScript) na Vercel**, com Postgres no **Supabase**.
- **Voice Agent API da AssemblyAI** do começo ao fim: STT Universal-3.5 Pro
  (`language_codes: ["pt"]`), detecção de turno, interrupção, **modelo conversacional
  gerenciado da AssemblyAI** e voz `rafael`. O LLM Gateway só faz streaming com modelos
  OpenAI, e um Claude sem streaming somaria latência a cada fala. Configuração inline por `session.update`
  antes de `session.ready`, com *key terms* do vocabulário de dengue para o STT.
- O navegador conecta com um **token temporário** emitido por `POST /api/token`.
  A chave da AssemblyAI fica só no servidor.

```
navegador ──POST /api/token──► servidor ──► AssemblyAI (token temporário)
navegador ══WebSocket══► Voice Agent API (STT pt · turno · modelo gerenciado · voz rafael)
Voice Agent ──tool.call consultar_ficha{assunto}──► navegador
navegador ──POST /api/ficha {sessao, atendimento, assunto, ultima_fala}──► servidor
servidor ──grava evento, devolve fato──► navegador ──tool.result──► Voice Agent
navegador ──POST /api/decisao {sessao, atendimento, encaminhamento}──► servidor ──► correção
```

### O paciente que não sabe

- O *system prompt* do caso contém a persona, quem fala, a queixa principal e as
  regras de fala (frases curtas, português do Brasil coloquial, nunca dar diagnóstico,
  nunca oferecer sintoma sem ser perguntado). **Não contém nenhum fato escondido.**
- A tool client-side `consultar_ficha` tem o parâmetro `assunto`, restrito a um enum
  com a lista acima. O prompt manda chamá-la sempre que perguntarem algo que não está
  na queixa principal, e responder só com o fato devolvido.
- Pergunta genérica ("mais alguma coisa?") recebe só a queixa principal, sem chamar a
  tool.
- `/api/ficha` é determinística: dado o caso e o assunto, devolve o fato e grava o
  evento `{sessao, atendimento, assunto, sinal (ou null), ultima_fala, criado_em}`.
  `ultima_fala` é o último `transcript` final da pessoa recebido pelo navegador.
- Limite assumido na apresentação: o modelo classifica a pergunta num assunto; o código
  é dono dos fatos e da nota.

### Correção

Função pura `corrigir(caso, eventos, encaminhamento)`, sem IA. Devolve, por sinal do
caso, `descoberto` (com a `ultima_fala` do primeiro evento que o revelou) ou `perdido`
(com a pergunta-modelo do caso), além de `encaminhamento_correto` e `motivo`.

### Banco

- `sessoes`: `id`, `papel`, `apelido`, `caso_1`, `caso_2`, `encaminhamento_1`,
  `encaminhamento_2`, `preparo` (1–5), `criada_em`, `concluida_em`.
- `eventos`: `id`, `sessao_id`, `atendimento` (1|2), `assunto`, `sinal`, `ultima_fala`,
  `criado_em`.
- Nenhum áudio guardado aqui; a gravação fica no histórico da AssemblyAI. Apelido nunca
  aparece no painel.

## 6. Erros

- Microfone negado: aviso claro, e o atendimento não começa (não há modo texto).
- WebSocket caiu: botão "retomar atendimento" abre nova sessão de voz com o mesmo caso.
  Os eventos já gravados continuam valendo.
- `/api/ficha` falhou: o `tool.result` diz ao paciente para pedir que repitam a
  pergunta.
- O modelo revelou algo sem chamar a tool: não conta como descoberto. Fica documentado
  como limitação.
- Custo: `/api/token` limitado por IP (30/h) e por sessão (atendimentos 1 e 2).

## 7. Testes

- Unitários (Vitest): `corrigir`, a resolução de assunto → fato de `/api/ficha`, o
  sorteio do par e a agregação do painel.
- Guarda: nenhum *system prompt* gerado contém texto de fato escondido de nenhum caso.
- Manual: uma rodada por voz em cada um dos 5 casos antes de liberar a validação, mais
  um teste de sotaque do `rafael` no dia 26.

## 8. Entrega na lablab

App no ar (Vercel), repositório público com licença MIT, vídeo de demonstração, slides e
texto da submissão com a tese, a arquitetura, os números do painel e as limitações
(voz única masculina, possivelmente com sotaque de Portugal; o modelo classifica o
assunto; conteúdo clínico revisado por estudantes, não por protocolo oficial validado).

## 9. Cronograma

| Dia | Entrega |
|---|---|
| 24/09 | spec, plano, contas (AssemblyAI pelo link de créditos do hackathon, lablab, Vercel, Supabase) |
| 25/09 | conversa por voz + `consultar_ficha` + correção; no ar à noite |
| 26/09 | 5 casos, telas de correção e resultado, revisão clínica, teste de sotaque |
| 27–28/09 | validação com as pessoas + painel `/estudo` |
| 29/09 | vídeo, slides, texto, repositório público, envio |

## 10. Fora do escopo

Os casos `antonio` e `juliana` (treino livre), dois níveis (classificação A/B/C/D do Ministério), casos gerados por IA, variação sorteada
de persona, modo texto, login, voz brasileira de outro provedor e qualquer coisa de AWS.

---

# Versão 2 (25/09/2026) — escopo ampliado depois do primeiro teste de voz

O primeiro teste real mostrou voz com sotaque brasileiro e o paciente segurando os
fatos, mas correção rasa ("achou 1 de 2 + clicou C"). Esta seção substitui as seções
2, 4 e a correção da seção 5 onde houver conflito.

## V2.1 Casos: sempre algo a descobrir, respostas variadas

A métrica passa a ser **achados críticos**: sinal de alarme **ou** condição de risco
escondida. Cinco casos, todos no estudo:

| id | Quem fala | Queixa (no prompt) | Achados escondidos | Resposta | Pergunta do paciente |
|---|---|---|---|---|---|
| `davi` | Marcos, pai do Davi (1a8m) | febre há 3 dias | vômitos persistentes; letargia | C | "Posso dar AAS pra baixar a febre dele?" |
| `joaquim` | Seu Joaquim, 70 | febre alta, "já tô melhor" | tontura ao levantar; falta de ar | C | "Preciso ir mesmo? Já tô melhor, a febre passou." |
| `rafa` | Rafa, 22 | febre há 4 dias, corpo doendo | sangramento de gengiva; dor abdominal contínua | C | "Posso tomar mais daquele anti-inflamatório? Ajudou na dor." |
| `juliana` | Pedro, marido da Juliana | ela com febre há 2 dias, dor no corpo | gestação (7 meses) | B | "Ela pode tomar aquele remédio de gripe que tem aqui?" |
| `celia` | Roberto, filho da Dona Célia (64) | ela com febre há 3 dias, dor nas juntas, cansada | diabetes com insulina | B | "Precisa mesmo levar ela no posto? Ela detesta ir lá." |

Rodízio: par ordenado menos usado entre as 20 permutações (5×4), mesma regra de
sessões consideradas da V1.

## V2.2 Correção em cinco dimensões (nota 0–100)

| Dimensão | Pts | Como |
|---|---|---|
| Achados críticos | 40 | determinístico: eventos da ficha com `achado` |
| Encaminhamento | 20 | determinístico |
| Anamnese essencial | 15 | determinístico: perguntou evolução da febre (`evolucao_da_febre`), hidratação/diurese (`alimentacao_hidratacao` ou `urina`), doenças e remédios (`doencas_e_remedios`) |
| Orientações | 15 | LLM + verificação: hidratação oral; não usar AAS/anti-inflamatório; sinais para voltar/procurar ajuda; para onde ir e quando |
| Resposta à pergunta do paciente | 10 | LLM + verificação, contra a resposta esperada (só no servidor) |

Mais um retorno de **comunicação** sem nota (pergunta aberta vs. induzida, jargão),
cada ponto com citação.

**Regra de verificação:** todo item que o LLM marca como cumprido vem com a citação
exata de uma fala do profissional; o código normaliza (minúsculas, sem acento, sem
pontuação, espaços colapsados) e só aceita se a citação for substring da fala
normalizada do profissional. Sem citação válida, não conta.

Sem avaliação do LLM (falha ou indisponível), orientações e pergunta aparecem como
"não avaliado" e a nota usa só as dimensões determinísticas, reescaladas para 0–100
(`notaDeterministica`); o painel mostra as duas quando existirem.

LLM: endpoint compatível com OpenAI configurado por `LLM_BASE_URL`, `LLM_MODELO`,
`LLM_API_KEY` (padrão: LLM Gateway da AssemblyAI com a mesma chave), saída
`response_format: json_schema`.

## V2.3 Paciente pergunta de volta

A pergunta do paciente está no prompt público (não é segredo); a resposta esperada
fica no servidor. O paciente faz a pergunta uma vez, depois de ao menos três trocas
ou quando o profissional começar a orientar.

## V2.4 Preceptor por voz (entre atendimento 1 e 2)

Depois da correção 1, uma conversa opcional de até 3 minutos com um preceptor
(Voice Agent API, voz `rafael`, sem tools), socrático: conhece a correção (que já não
é segredo), pergunta o que a pessoa faria diferente, reforça um ou dois pontos,
nunca dá a lista inteira. Botão "Pular". O cliente encerra aos 180 s. Registra
`preceptor_segundos` na sessão.

## V2.5 Transcrição e dados

- Transcrição em tempo real na tela (deltas) e, na decisão, o cliente envia as falas
  finais (`transcricao: {quem, texto}[]`) junto com o encaminhamento. O servidor
  guarda em `falas` e a avaliação do LLM em `avaliacoes` (jsonb).
- Token por sessão: limite 12 (dois atendimentos, preceptor, reconexões).

## V2.6 Visual

Refeito do zero, mobile-first, depois da funcionalidade.

## V2.7 Painel

Nota composta média no atendimento 1 vs. 2, achados críticos 1 vs. 2, acerto de
encaminhamento 1 vs. 2, quantos melhoraram a nota, quantos fizeram o preceptor, por
papel, média do "preparado".
