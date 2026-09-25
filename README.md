# Sinal de Alarme

Voice training for dengue warning signs, built for the AssemblyAI Voice Agent Hackathon (lablab.ai).

Live app: LIVE_URL

## The problem

Brazil has had record dengue years. In a home visit, a community health agent (ACS),
nursing technician, or student talks to a patient who often does not volunteer the
findings that matter — a warning sign, or a risk condition like pregnancy or diabetes.
They surface only if the visitor asks the right question, and even then the right
next step (which referral, what guidance to give) is not always obvious. Missing
either can mean a late referral.

Practicing this today usually means role-play with a colleague or learning on real
patients. Sinal de Alarme lets someone run a simulated home visit by voice, against a
virtual patient who hides what matters the way real patients do, asks a question of
their own, and then gets a graded correction with their own words as evidence.

## What the app does

The person picks a role, gets a one-line context for a case, and talks to the patient
out loud. At some point the patient asks a question back (e.g. "can I give her that
flu medicine we have here?"), and expects an answer. When ready, the person presses
Decide and chooses a referral: hydrate and go to the clinic, go today with priority,
or seek urgent care now. A correction screen then scores the visit across five
dimensions and shows evidence for each. Next comes an optional voice conversation with
a preceptor, then a second visit with the other case of the pair, and a final
side-by-side result with a one-question self-assessment.

## The five cases

Every case hides something that changes the correct action — there is no "nothing to
find" case:

| Case | Who answers the door | Hidden finding | Correct referral |
|---|---|---|---|
| `davi` (1y8m) | Marcos, his father | persistent vomiting; lethargy | C — urgent care now |
| `joaquim` (70) | himself | postural dizziness; shortness of breath lying down | C — urgent care now |
| `rafa` (22) | himself | gum bleeding; continuous abdominal pain | C — urgent care now |
| `juliana` | Pedro, her husband | pregnancy (7 months) | B — UBS today, priority |
| `celia` (64) | Roberto, her son | diabetes on insulin | B — UBS today, priority |

The three C cases hide a dengue warning sign (WHO/Ministry of Health list); the two B
cases hide a risk condition without a warning sign. Referral A (hydrate and go to the
UBS for evaluation) is a valid option on screen but is never the correct answer for
any of the five cases — reserved for a case type not yet in this build. Each case also
has a question the patient asks back partway through the conversation, with an
expected answer known only to the server.

Case content is an AI-assisted draft based on the Brazilian Ministry of Health's
dengue warning-sign list, pending review by health students; a case without a
recorded reviewer is labeled "Rascunho, sem revisão clínica" (draft, no clinical
review) on screen.

## The thesis: the model doesn't know the hidden facts

The voice model plays a role, not a script. Its system prompt contains the patient's
persona and the complaint they mention up front — nothing else. When the person asks
about anything not already covered, the model calls a client-side tool,
`consultar_ficha`, with the subject it thinks was asked about, chosen from a fixed
enum of 13 topics (bleeding, vomiting, abdominal pain, dizziness/fainting,
drowsiness/irritability, breathing/swelling, urination, fever progression, pregnancy,
medical history and medication, age, food and hydration, other). The app looks up the
real answer for that subject in the case file and hands it back for the model to
speak. The model only classifies what was asked; the code owns the facts, the score,
and the correction.

## Scoring: five dimensions, 0-100

| Dimension | Points | How it's graded |
|---|---|---|
| Critical findings | 40 | deterministic, from `consultar_ficha` tool-call events that hit a finding |
| Referral | 20 | deterministic, chosen referral vs. the case's correct one |
| Essential history-taking | 15 | deterministic: asked about fever progression, hydration/urination, and pre-existing conditions and medication |
| Guidance given | 15 | LLM-graded: oral hydration, avoid aspirin/anti-inflammatories, warning signs to watch for, where and when to go |
| Answer to the patient's question | 10 | LLM-graded against an expected answer kept server-side (the patient model never sees it) |

The first three dimensions come straight from logged events, no model involved. The
last two ask the configured LLM to read the full transcript and judge them, but every
claim it makes has to survive a verification step in code: each item the LLM marks as
fulfilled must come with a quote, and the quote is only accepted if it is at least two
words and eight characters long, and appears as whole words inside a single
utterance the professional actually said (matched case- and accent-insensitively,
punctuation collapsed). If the quote doesn't check out, the item doesn't count — and
what the correction screen displays is never the LLM's paraphrase, only the original
transcript text found at that spot. The same rule applies to the "communication"
feedback the app returns for reference (open vs. leading questions, jargon), which
does not affect the score. If the LLM call fails or is unavailable, guidance and the
patient-question dimension are shown as "not evaluated" and the score falls back to
the three deterministic dimensions, rescaled to 0-100; the study dashboard shows both
numbers when they exist.

## The patient's question

The question is public — it is printed on the case's own prompt, so it is not a
secret the model could leak by accident — but the expected answer lives only on the
server. The model is instructed to ask it once, after at least three exchanges or once
the professional starts giving guidance, and to react naturally to the answer.

## The voice preceptor

After the correction for visit 1, the person can start a second, independent Voice
Agent session with a preceptor character (voice `rafael`, no tools) instead of moving
straight to visit 2. It already knows that visit's correction — informing its prompt,
not shown to the trainee — and takes a Socratic approach: it asks what the person
would do differently, reinforces at most one or two points, and never reads the full
list back. The session is capped at 3 minutes, ends automatically at that mark, and
has a Skip button; the seconds spent are recorded on the session as
`preceptor_segundos`.

## The study (`/estudo`)

A small validation study (about 10 people, mixing ACS/nursing technicians and
medicine/nursing students) runs the two-visit flow described above: an unaided visit,
correction, optional preceptor, then a second unaided visit with the other case of the
pair. Case pairs are ordered pairs drawn from all 5 cases (5 x 4 = 20 possible ordered
pairs); each new session gets the least-used pair so far, which keeps the 20 pairs
balanced without relying on random draw at this sample size.

Aggregated, anonymous results (no names or nicknames) are public at `/estudo`: average
score before/after, critical findings found, referral accuracy, how many improved
their score, how many did the preceptor conversation, breakdown by role, and the
average self-assessment answer.

## Architecture

Next.js (App Router, TypeScript) on Vercel, Postgres on Supabase, and AssemblyAI for
both the voice conversation and the LLM grading step.

```
browser ──POST /api/token──► server ──► AssemblyAI (temporary token)
browser ══WebSocket══► Voice Agent API (STT pt · turn detection · managed model · rafael voice)
Voice Agent ──tool.call consultar_ficha{assunto}──► browser
browser ──POST /api/ficha {sessao, atendimento, assunto, ultima_fala}──► server
server ──logs event, returns fact──► browser ──tool.result──► Voice Agent
browser ──POST /api/decisao {sessao, atendimento, encaminhamento, transcricao}──► server
server ──► LLM Gateway (grading) ──► correction, saved, returned to browser
```

The same flow runs a second time, without the `consultar_ficha` tool, for the
preceptor conversation.

## AssemblyAI products used

- **Voice Agent API**, for every spoken conversation (patient and preceptor):
  - Session configuration sent inline as a single `session.update` message right
    after the WebSocket opens, rather than configured out of band.
  - A client-side function tool, `consultar_ficha`, with a single `assunto`
    parameter restricted to a closed enum of 13 topics, for the patient sessions.
  - Live transcript deltas (`transcript.user.delta`, `transcript.agent.delta`) drive
    the on-screen captions as the conversation happens.
  - Barge-in handled on the client: when the server reports `reply.done` with
    `status: "interrupted"`, playback of the in-flight reply is cut immediately.
  - On teardown (navigation away or ending the visit) the client sends
    `session.end` to close the conversation cleanly, both from a normal exit and
    from the `pagehide` event.
  - The browser never sees the AssemblyAI API key; it authenticates with a
    single-use temporary token minted server-side by `POST /api/token`.
- **LLM Gateway**, OpenAI-compatible, for the two graded dimensions of the
  correction. The base URL, model, and key are all configurable through
  environment variables; the current default model, `qwen3.5-4b-32k-fast`, rejects
  requests that include `response_format`, so the evaluator retries once without it
  and parses the JSON out of the plain text reply itself.

## Running it

```bash
cp .env.example .env.local
# fill in ASSEMBLYAI_API_KEY, DATABASE_URL (Supabase Postgres), IP_SALT
# optional: LLM_BASE_URL, LLM_MODELO, LLM_API_KEY (default: AssemblyAI's LLM Gateway with ASSEMBLYAI_API_KEY)
npm install
npm run migrar
npm run dev
```

## Known limitations

- Single voice, male, `rafael` — the only Portuguese output voice the Voice Agent
  API currently offers. Some choppiness audible in the TTS output is from the voice
  itself; confirmed by listening on headphones, not a playback bug in the app.
- The model classifies each question into one of the 13 subjects before the code
  answers; a small model can be inconsistent here, and a misclassification means
  the wrong fact, or none, comes back. The same small-model risk applies to the
  LLM-graded score dimensions, which is why every claim it makes is checked against
  a real quote in code before it counts.
- Case content is an AI-assisted draft based on the Ministry of Health warning-sign
  list, pending review by health students; any case without a recorded reviewer is
  labeled as a draft on screen.
- The study sample is small and drawn by convenience, not randomized.
- In the study pool, the correct referral is never A; referral accuracy is
  therefore a secondary metric, and critical findings/overall score are primary.

## How this was built

The app was built with Claude Code, an AI coding agent, starting from a written
specification and implementation plan rather than ad hoc prompting. Each task in the
plan was implemented and then code-reviewed before moving to the next, with the
author reading and approving the resulting code and product decisions along the way.

## License

MIT, see `LICENSE`.
