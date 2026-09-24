# Sinal de Alarme

Voice training for dengue warning signs, built for the AssemblyAI Voice Agent Hackathon (lablab.ai).

Live app: LIVE_URL

## The problem

Brazil has had record dengue years. In a home visit, a community health agent (ACS),
nursing technician, or student talks to a patient who often does not volunteer the
symptoms that matter. The warning signs — persistent vomiting, dizziness on standing,
gum bleeding, abdominal pain, breathing trouble while lying down — surface only if the
visitor asks the right question. Missing one can mean a late referral.

There is no safe way to practice this. Sinal de Alarme lets someone run a simulated
home visit by voice, against a virtual patient who hides symptoms the way real patients
do, then shows exactly which questions would have uncovered them.

## What the app does

The person picks a role, gets a one-line context for a case, and talks to the patient
out loud. When ready, they press Decide and choose a referral: hydrate and go to the
clinic, go today with priority, or seek urgent care now. The correction screen then
goes through each warning sign in the case: if discovered, it shows the person's own
transcribed question that revealed it; if missed, it shows the question that would
have. They then do a second case from the same pair, and see both results together
with a one-question self-assessment.

## The thesis: the model doesn't know the hidden signs

The voice model plays a role, not a script. Its system prompt contains the patient's
persona and the complaint they mention up front — and nothing else. It never sees the
hidden symptoms. When the person asks about anything not already covered, the model
calls a client-side tool, `consultar_ficha`, with the subject it thinks was asked
about, chosen from a fixed list of 13 topics (bleeding, vomiting, abdominal pain,
dizziness/fainting, drowsiness/irritability, breathing/swelling, urination, fever
progression, pregnancy, medical history and medication, age, food and hydration,
other). The app looks up the real answer for that subject in the case file and hands
it back for the model to speak. The model only classifies what was asked; the code
owns the facts, the scoring, and the correction. This keeps the clinical content
auditable and separate from anything the language model could hallucinate.

## Architecture

Next.js (App Router, TypeScript) on Vercel, Postgres on Supabase, and the AssemblyAI
Voice Agent API end to end for speech-to-text, turn detection, the conversational
model, and text-to-speech.

```
browser ──POST /api/token──► server ──► AssemblyAI (temporary token)
browser ══WebSocket══► Voice Agent API (STT pt · turn detection · managed model · rafael voice)
Voice Agent ──tool.call consultar_ficha{subject}──► browser
browser ──POST /api/ficha {session, visit, subject, last_utterance}──► server
server ──logs event, returns fact──► browser ──tool.result──► Voice Agent
browser ──POST /api/decisao {session, visit, referral}──► server ──► correction
```

## How the Voice Agent API is used

- Managed conversational model from AssemblyAI end to end — no custom LLM in the
  loop, so there is no per-turn round trip to a separate provider.
- Speech-to-text set to `language_codes: ["pt"]`, with a list of `keyterms` (dengue,
  febre, UBS, soro, hidratação, dipirona, paracetamol, and similar words) to bias
  recognition toward the domain vocabulary.
- Output voice `rafael`, the only Portuguese voice the API currently offers.
- Session configuration is sent inline as a `session.update` message right after the
  WebSocket opens, before `session.ready`, rather than configured out of band.
- A client-side function tool, `consultar_ficha`, with a single `assunto` parameter
  restricted to a closed enum of 13 topics. The model must call it before answering
  anything outside the patient's opening complaint.
- Barge-in is handled on the client: when the server reports `reply.done` with
  `status: "interrupted"`, playback of the in-flight reply is cut immediately.
- On teardown (navigation away or ending the visit) the client sends `session.end`
  to close the conversation cleanly, both from a normal exit and from the
  `pagehide` event.
- The browser never sees the AssemblyAI API key. It authenticates with a single-use
  temporary token minted server-side by `POST /api/token`, capped per IP and per
  session.

## The study and results

A small validation study (about 10 people, mixing ACS/nursing technicians and
medicine/nursing students) runs the same two-visit flow: an unaided visit, then the
correction, then a second unaided visit with a different case from the same pair. The
outcome measured both times is warning signs discovered out of signs present in the
case, plus whether the referral chosen was correct. Case order is rotated through all
six permutations of the three cases that carry a hidden sign, so visit order does not
bias the comparison.

Aggregated, anonymous results (no names or nicknames) are public at `/estudo` — see
that page for live numbers.

## Running it

```bash
cp .env.example .env.local
# fill in ASSEMBLYAI_API_KEY, DATABASE_URL (Supabase Postgres), IP_SALT
npm install
npm run migrar
npm run dev
```

## Known limitations

- Single voice, male, `rafael`. It may carry a European Portuguese accent rather
  than Brazilian Portuguese.
- The model classifies each question into one of the 13 subjects before the code
  answers; a misclassification means the wrong fact, or none, comes back.
- If the model reveals something without calling `consultar_ficha`, the app does
  not count it as discovered, since only tool calls are logged as evidence.
- If the WebSocket drops mid-visit, the person resumes with a new voice session on
  the same case; events already logged still count.
- Clinical content for each case was reviewed by students, not validated against an
  official protocol.
- In the study, the correct referral is always urgent care, so referral accuracy is
  a secondary metric; signs discovered is the primary one.

## How this was built

The app was built with Claude Code, an AI coding agent, starting from a written
specification and implementation plan rather than ad hoc prompting. Each task in the
plan was implemented and then code-reviewed before moving to the next, with the
author reading and approving the resulting code and product decisions along the way.

## License

MIT, see `LICENSE`.
