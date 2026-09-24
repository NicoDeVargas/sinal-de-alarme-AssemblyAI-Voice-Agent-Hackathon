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
export type CasoId = "davi" | "joaquim" | "rafa" | "juliana" | "celia";
export const CASO_IDS: CasoId[] = ["davi", "joaquim", "rafa", "juliana", "celia"];
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
  perguntaDoPaciente: string;
  revisadoPor: string | null;
  revisadoEm: string | null;
}

export interface Achado {
  id: string;
  nome: string;
  tipo: "alarme" | "risco";
  perguntaModelo: string;
}

export interface EntradaFicha {
  fato: string;
  achado?: string;
}

export interface CasoPrivado {
  id: CasoId;
  respostaNormal: string;
  ficha: Partial<Record<Assunto, EntradaFicha>>;
  achados: Achado[];
  encaminhamento: Encaminhamento;
  motivo: string;
  respostaEsperada: string;
  palavrasProibidas: string[];
}

export interface Evento {
  assunto: Assunto;
  achado: string | null;
  ultimaFala: string;
  criadoEm: string;
}

export const ANAMNESE: { id: string; nome: string; assuntos: Assunto[]; perguntaModelo: string }[] = [
  { id: "dia_da_doenca", nome: "Há quantos dias começou a febre", assuntos: ["evolucao_da_febre"], perguntaModelo: "Há quantos dias começou a febre? Ela já passou?" },
  { id: "hidratacao", nome: "Hidratação e diurese", assuntos: ["alimentacao_hidratacao", "urina"], perguntaModelo: "Está conseguindo beber líquido? Está urinando normal?" },
  { id: "doencas_remedios", nome: "Doenças e remédios em uso", assuntos: ["doencas_e_remedios"], perguntaModelo: "Tem alguma doença? Está tomando algum remédio?" },
];

export const ORIENTACOES: { id: string; nome: string; criterio: string }[] = [
  { id: "hidratacao_oral", nome: "Hidratação oral", criterio: "orientou beber mais líquido (água, soro, sucos)" },
  { id: "sem_aas_aine", nome: "Sem AAS ou anti-inflamatório", criterio: "orientou não usar AAS, aspirina, ibuprofeno, diclofenaco ou outro anti-inflamatório" },
  { id: "sinais_de_retorno", nome: "Sinais para procurar ajuda", criterio: "explicou algum sinal que exige procurar atendimento imediatamente (ex.: vômitos, dor na barriga, sangramento, tontura, sonolência)" },
  { id: "para_onde_e_quando", nome: "Para onde ir e quando", criterio: "disse para onde a pessoa deve ir (UBS, UPA, pronto-socorro) e quando" },
];

export interface Fala {
  quem: "profissional" | "paciente";
  texto: string;
}

export interface AvaliacaoBruta {
  orientacoes: { id: string; cumprida: boolean; citacao: string }[];
  respostaPaciente: { respondeu: boolean; correta: boolean; citacao: string; comentario: string };
  comunicacao: { tipo: "positivo" | "melhorar"; texto: string; citacao: string }[];
}

export interface Avaliacao {
  orientacoes: { id: string; nome: string; cumprida: boolean; citacao: string | null }[];
  respostaPaciente: { correta: boolean; citacao: string | null; comentario: string };
  comunicacao: { tipo: "positivo" | "melhorar"; texto: string; citacao: string }[];
}

export interface ItemCorrigido {
  id: string;
  nome: string;
  feito: boolean;
  evidencia: string;
}

export interface Correcao {
  achados: ItemCorrigido[];
  anamnese: ItemCorrigido[];
  orientacoes: { id: string; nome: string; feito: boolean; evidencia: string | null }[] | null;
  respostaPaciente: { pergunta: string; correta: boolean; citacao: string | null; comentario: string; esperada: string } | null;
  comunicacao: { tipo: "positivo" | "melhorar"; texto: string; citacao: string }[];
  escolhido: Encaminhamento;
  correto: Encaminhamento;
  acertou: boolean;
  motivo: string;
  partes: { achados: number; encaminhamento: number; anamnese: number; orientacoes: number | null; pergunta: number | null };
  nota: number;
  notaDeterministica: number;
}
