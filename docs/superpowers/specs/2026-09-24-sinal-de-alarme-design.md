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
- Contrabalanceamento: o código sorteia um par de casos distintos e a ordem entre eles.
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
| `antonio` | Seu Antônio, 34 | febre há 3 dias, dor no corpo e atrás dos olhos | nada | A |
| `davi` | Pai do Davi, 1 ano e 8 meses | febre há 3 dias | vômitos persistentes (4 hoje); sonolência/"molinho" | C |
| `juliana` | Marido da Juliana, gestante de 28 semanas | ela com febre há 2 dias, dor no corpo | nada além da gestação (grupo de risco, citado se perguntarem) | B |
| `joaquim` | Seu Joaquim, 70, hipertenso | teve febre alta, "agora tá melhor" | febre cessou ontem (fase crítica); tontura ao levantar | C |
| `rafa` | Rafa, 22 | febre há 4 dias | sangramento de gengiva ("sempre sangra um pouco"); dor abdominal intensa e contínua | C |

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
  (`language_codes: ["pt"]`), detecção de turno, interrupção, LLM Claude pelo LLM
  Gateway da AssemblyAI e voz `rafael`. Configuração inline por `session.update`
  antes de `session.ready`, com *key terms* do vocabulário de dengue para o STT.
- O navegador conecta com um **token temporário** emitido por `POST /api/token`.
  A chave da AssemblyAI fica só no servidor.

```
navegador ──POST /api/token──► servidor ──► AssemblyAI (token temporário)
navegador ══WebSocket══► Voice Agent API (STT pt · turno · Claude · voz rafael)
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

Dois níveis (classificação A/B/C/D do Ministério), casos gerados por IA, variação sorteada
de persona, modo texto, login, voz brasileira de outro provedor e qualquer coisa de AWS.
