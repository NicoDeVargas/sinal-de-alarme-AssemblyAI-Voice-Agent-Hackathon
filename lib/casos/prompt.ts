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
    `Em algum momento natural, depois de pelo menos três trocas ou quando o profissional começar a orientar, pergunte uma única vez: "${caso.perguntaDoPaciente}". Depois, reaja à resposta com naturalidade.`,
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
