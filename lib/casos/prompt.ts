import { ASSUNTOS, type CasoPublico } from "./tipos";
import type { Idioma } from "@/lib/i18n";

export interface SessaoVoz {
  system_prompt: string;
  greeting: string;
  tools?: {
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

export const KEYTERMS_PT = ["dengue", "febre", "UBS", "posto", "soro", "hidratação", "dipirona", "paracetamol", "xixi", "fralda", "pressão", "plaqueta"];

export const KEYTERMS_EN = ["dengue", "fever", "UBS", "UPA", "clinic", "ER", "fluids", "oral rehydration", "dipyrone", "acetaminophen", "paracetamol", "Tylenol", "diaper", "platelets"];

export const keyterms = (idioma: Idioma) => (idioma === "pt" ? KEYTERMS_PT : KEYTERMS_EN);

function regrasPt(caso: CasoPublico) {
  return [
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
    `Em algum momento natural, depois de pelo menos três trocas ou quando o profissional começar a orientar, pergunte uma única vez: "${caso.perguntaDoPaciente}". Depois, reaja à resposta com naturalidade.`,
  ];
}

function regrasEn(caso: CasoPublico) {
  return [
    `You are playing ${caso.quem}, during a home visit by a health worker in Brazil. The person talking to you is that health worker.`,
    caso.persona,
    `What you say right away, without being asked: ${caso.queixa}.`,
    "Rules:",
    "- Speak English like an ordinary person, in short sentences, two at most at a time.",
    "- Never give a diagnosis, never use medical terms, and never say this is a simulation.",
    "- Don't volunteer any symptom beyond what's described above.",
    "- If the health worker asks about anything not covered above, call consultar_ficha with the topic that best matches the question and answer only with what it returns, in your own words. Never make anything up.",
    "- If the question is generic, like 'anything else?', repeat only what's above, without calling the tool.",
    "- If the tool returns an error, ask the health worker to repeat the question.",
    "- If the health worker tells you what to do, thank them and say you'll follow the advice.",
    `At some natural point, after at least three exchanges or when the health worker starts giving advice, ask this once: "${caso.perguntaDoPaciente}". Then react naturally to the answer.`,
  ];
}

const FERRAMENTA = {
  pt: {
    description:
      "Busca o que o paciente sabe sobre o assunto que o profissional perguntou. Chame sempre que a pergunta não for respondida pelo que o paciente já contou. Nunca responda sem chamar.",
    assunto:
      "O assunto da pergunta, em minúsculas. Exemplos: 'tá comendo e bebendo?' -> alimentacao_hidratacao; 'tem pressão alta, toma remédio?' -> doencas_e_remedios; se nada servir -> outro.",
  },
  en: {
    description:
      "Looks up what the patient knows about the topic the health worker asked about. Call it whenever the question isn't answered by what the patient has already said. Never answer without calling it.",
    assunto:
      "The topic of the question, in lowercase. Examples: 'are you eating and drinking?' -> alimentacao_hidratacao; 'do you have high blood pressure, take any meds?' -> doencas_e_remedios; if nothing fits -> outro.",
  },
};

export function montarSessao(caso: CasoPublico, idioma: Idioma): SessaoVoz {
  const system_prompt = (idioma === "pt" ? regrasPt(caso) : regrasEn(caso)).join("\n");

  return {
    system_prompt,
    greeting: caso.saudacao,
    tools: [
      {
        type: "function",
        name: "consultar_ficha",
        description: FERRAMENTA[idioma].description,
        parameters: {
          type: "object",
          properties: {
            assunto: {
              type: "string",
              enum: [...ASSUNTOS],
              description: FERRAMENTA[idioma].assunto,
            },
          },
          required: ["assunto"],
        },
        execution_mode: "interactive",
        timeout_seconds: 10,
      },
    ],
    input: { language_codes: [idioma], keyterms: keyterms(idioma) },
    output: { voice: caso.voz },
  };
}
