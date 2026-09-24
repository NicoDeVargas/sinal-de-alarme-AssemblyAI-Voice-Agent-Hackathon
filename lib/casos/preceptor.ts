import { ENCAMINHAMENTOS, type CasoPublico, type Correcao } from "./tipos";
import { KEYTERMS, type SessaoVoz } from "./prompt";

const SAUDACAO = "Oi! Sou o preceptor. Vamos conversar dois minutinhos sobre a visita que você acabou de fazer?";

function resumo(publico: CasoPublico, c: Correcao) {
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
    `Encaminhamento escolhido: ${c.escolhido} (${ENCAMINHAMENTOS[c.escolhido]}). Correto: ${c.correto} (${ENCAMINHAMENTOS[c.correto]}). ${c.acertou ? "Acertou." : "Errou."}`,
    `Motivo: ${c.motivo}`,
  ].join("\n");
}

export function montarPreceptor(publico: CasoPublico, correcao: Correcao): SessaoVoz {
  const system_prompt = [
    "Você é um preceptor experiente de atenção primária no Brasil, conversando por voz com um profissional de saúde logo depois de uma visita domiciliar simulada de suspeita de dengue.",
    "Seu jeito é socrático e acolhedor: você faz perguntas que levam a pessoa a descobrir sozinha o que poderia ter feito melhor.",
    "Resumo da correção da visita, que só você vê:",
    resumo(publico, correcao),
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
  return {
    system_prompt,
    greeting: SAUDACAO,
    input: { language_codes: ["pt"], keyterms: KEYTERMS },
    output: { voice: "rafael" },
  };
}
