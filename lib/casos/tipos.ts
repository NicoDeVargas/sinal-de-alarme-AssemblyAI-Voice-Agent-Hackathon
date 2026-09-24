export const ASSUNTOS = [
  "sangramento",
  "vomito",
  "dor_abdominal",
  "tontura_desmaio",
  "sonolencia_irritabilidade",
  "falta_de_ar_inchaco",
  "urina",
  "evolucao_da_febre",
  "gestacao",
  "doencas_e_remedios",
  "idade",
  "alimentacao_hidratacao",
  "outro",
] as const;

export type Assunto = (typeof ASSUNTOS)[number];
export type CasoId = "davi" | "joaquim" | "rafa";
export type Encaminhamento = "A" | "B" | "C";
export type Papel = "acs" | "tecnico_enfermagem" | "estudante_medicina" | "estudante_enfermagem" | "outro";

export const ENCAMINHAMENTOS: Record<Encaminhamento, string> = {
  A: "Hidratação e ir à UBS para avaliação",
  B: "UBS hoje, com prioridade",
  C: "Urgência agora",
};

export const PAPEIS: Record<Papel, string> = {
  acs: "Agente comunitário de saúde",
  tecnico_enfermagem: "Técnico(a) de enfermagem",
  estudante_medicina: "Estudante de medicina",
  estudante_enfermagem: "Estudante de enfermagem",
  outro: "Outro",
};

export interface CasoPublico {
  id: CasoId;
  titulo: string;
  contexto: string;
  quem: string;
  persona: string;
  queixa: string;
  saudacao: string;
  revisadoPor: string | null;
  revisadoEm: string | null;
}

export interface Sinal {
  id: string;
  nome: string;
  perguntaModelo: string;
}

export interface EntradaFicha {
  fato: string;
  sinal?: string;
}

export interface CasoPrivado {
  id: CasoId;
  respostaNormal: string;
  ficha: Partial<Record<Assunto, EntradaFicha>>;
  sinais: Sinal[];
  encaminhamento: Encaminhamento;
  motivo: string;
  palavrasProibidas: string[];
}

export interface Evento {
  assunto: Assunto;
  sinal: string | null;
  ultimaFala: string;
  criadoEm: string;
}

export interface SinalCorrigido {
  id: string;
  nome: string;
  descoberto: boolean;
  evidencia: string;
}

export interface Correcao {
  sinais: SinalCorrigido[];
  descobertos: number;
  total: number;
  escolhido: Encaminhamento;
  correto: Encaminhamento;
  acertou: boolean;
  motivo: string;
}
