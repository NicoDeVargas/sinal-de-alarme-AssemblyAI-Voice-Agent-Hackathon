import type { CasoPublico, Correcao } from "./tipos";
import { keyterms, type SessaoVoz } from "./prompt";
import { textos, type Idioma } from "@/lib/i18n";

const SAUDACAO: Record<Idioma, string> = {
  pt: "Oi! Sou o preceptor. Vamos conversar dois minutinhos sobre a visita que você acabou de fazer?",
  en: "Hi! I'm your preceptor. Can we talk for a couple of minutes about the visit you just did?",
};

const VOZ: Record<Idioma, string> = { pt: "rafael", en: "charles" };

function resumoPt(publico: CasoPublico, c: Correcao) {
  const e = textos.pt.encaminhamentos;
  const achados = c.achados.map((a) => (a.feito ? `- Descobriu: ${a.nome}.` : `- Não descobriu: ${a.nome}. Pergunta que revelaria: "${a.evidencia}"`));
  const anamnese = c.anamnese.map((a) => (a.feito ? `- Perguntou: ${a.nome}.` : `- Não perguntou: ${a.nome}. Pergunta-modelo: "${a.evidencia}"`));
  const orientacoes = c.orientacoes
    ? c.orientacoes.map((o) => (o.feito ? `- Deu: ${o.nome}.` : `- Faltou: ${o.nome}.`))
    : ["- Não foi possível avaliar as orientações desta visita."];
  const pergunta = c.respostaPaciente
    ? `${c.respostaPaciente.correta ? "Respondeu bem" : "Não respondeu bem"}. ${c.respostaPaciente.comentario} Resposta esperada: "${c.respostaPaciente.esperada}"`
    : "Não foi possível avaliar a resposta.";
  return [
    `Caso: ${publico.quem}. Queixa: ${publico.queixa}.`,
    "Achados do caso:",
    ...achados,
    "Anamnese básica:",
    ...anamnese,
    "Orientações:",
    ...orientacoes,
    `Pergunta do paciente: "${publico.perguntaDoPaciente}". ${pergunta}`,
    `Encaminhamento escolhido: ${c.escolhido} (${e[c.escolhido]}). Correto: ${c.correto} (${e[c.correto]}). ${c.acertou ? "Acertou." : "Errou."}`,
    `Motivo: ${c.motivo}`,
  ].join("\n");
}

function resumoEn(publico: CasoPublico, c: Correcao) {
  const e = textos.en.encaminhamentos;
  const achados = c.achados.map((a) => (a.feito ? `- Found: ${a.nome}.` : `- Missed: ${a.nome}. A question that would have revealed it: "${a.evidencia}"`));
  const anamnese = c.anamnese.map((a) => (a.feito ? `- Asked about: ${a.nome}.` : `- Didn't ask about: ${a.nome}. Model question: "${a.evidencia}"`));
  const orientacoes = c.orientacoes
    ? c.orientacoes.map((o) => (o.feito ? `- Gave: ${o.nome}.` : `- Missing: ${o.nome}.`))
    : ["- The advice given on this visit couldn't be assessed."];
  const pergunta = c.respostaPaciente
    ? `${c.respostaPaciente.correta ? "Answered well" : "Didn't answer well"}. ${c.respostaPaciente.comentario} Expected answer: "${c.respostaPaciente.esperada}"`
    : "The answer couldn't be assessed.";
  return [
    `Case: ${publico.quem}. Complaint: ${publico.queixa}.`,
    "Case findings:",
    ...achados,
    "Basic history:",
    ...anamnese,
    "Advice:",
    ...orientacoes,
    `Patient's question: "${publico.perguntaDoPaciente}". ${pergunta}`,
    `Referral chosen: ${c.escolhido} (${e[c.escolhido]}). Correct: ${c.correto} (${e[c.correto]}). ${c.acertou ? "Got it right." : "Got it wrong."}`,
    `Reason: ${c.motivo}`,
  ].join("\n");
}

function promptPt(publico: CasoPublico, correcao: Correcao) {
  return [
    "Você é um preceptor experiente de atenção primária no Brasil, conversando por voz com um profissional de saúde logo depois de uma visita domiciliar simulada de suspeita de dengue.",
    "Seu jeito é socrático e acolhedor: você faz perguntas que levam a pessoa a descobrir sozinha o que poderia ter feito melhor.",
    "Resumo da correção da visita, que só você vê:",
    resumoPt(publico, correcao),
    "Regras:",
    "- Fale em português do Brasil, em frases curtas, no máximo duas por vez.",
    "- A conversa dura no máximo 3 minutos.",
    "- Comece perguntando como a pessoa acha que foi a visita.",
    "- Foque em no máximo dois pontos a melhorar, os mais importantes para a segurança do paciente. Faça perguntas até a pessoa chegar à resposta; só explique se ela não chegar.",
    "- Reconheça com sinceridade o que ela fez bem.",
    "- Nunca leia a lista inteira da correção.",
    "- Nunca fale sobre o próximo caso ou próximo paciente.",
    "- Se a pessoa pedir para encerrar, agradeça e despeça-se em uma frase.",
  ].join("\n");
}

function promptEn(publico: CasoPublico, correcao: Correcao) {
  return [
    "You are an experienced primary care preceptor in Brazil, talking by voice with a health worker right after a simulated home visit for suspected dengue.",
    "Your style is Socratic and warm: you ask questions that lead the person to figure out on their own what they could have done better.",
    "Summary of the visit feedback, which only you can see:",
    resumoEn(publico, correcao),
    "Rules:",
    "- Speak English, in short sentences, two at most at a time.",
    "- The conversation lasts 3 minutes at most.",
    "- Start by asking how the person thinks the visit went.",
    "- Focus on two things to improve at most, the ones that matter most for patient safety. Keep asking questions until the person gets to the answer; only explain if they don't.",
    "- Sincerely acknowledge what they did well.",
    "- Never read out the whole feedback list.",
    "- Never talk about the next case or the next patient.",
    "- If the person asks to stop, thank them and say goodbye in one sentence.",
  ].join("\n");
}

export function montarPreceptor(publico: CasoPublico, correcao: Correcao, idioma: Idioma): SessaoVoz {
  return {
    system_prompt: idioma === "pt" ? promptPt(publico, correcao) : promptEn(publico, correcao),
    greeting: SAUDACAO[idioma],
    input: { language_codes: [idioma], keyterms: keyterms(idioma) },
    output: { voice: VOZ[idioma] },
  };
}
