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
