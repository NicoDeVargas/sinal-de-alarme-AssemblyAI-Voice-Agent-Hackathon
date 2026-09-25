import type { Idioma } from "@/lib/i18n";

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

export const PAPEIS: Papel[] = ["acs", "tecnico_enfermagem", "estudante_medicina", "estudante_enfermagem", "outro"];

export interface CasoPublico {
  id: CasoId;
  titulo: string;
  contexto: string;
  quem: string;
  persona: string;
  queixa: string;
  saudacao: string;
  perguntaDoPaciente: string;
  voz: string;
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

type ItemAnamnese = { id: string; nome: string; assuntos: Assunto[]; perguntaModelo: string };
type ItemOrientacao = { id: string; nome: string; criterio: string };

export const ANAMNESE: ItemAnamnese[] = [
  { id: "dia_da_doenca", nome: "Há quantos dias começou a febre", assuntos: ["evolucao_da_febre"], perguntaModelo: "Há quantos dias começou a febre? Ela já passou?" },
  { id: "hidratacao", nome: "Hidratação e diurese", assuntos: ["alimentacao_hidratacao", "urina"], perguntaModelo: "Está conseguindo beber líquido? Está urinando normal?" },
  { id: "doencas_remedios", nome: "Doenças e remédios em uso", assuntos: ["doencas_e_remedios"], perguntaModelo: "Tem alguma doença? Está tomando algum remédio?" },
];

export const ANAMNESE_EN: ItemAnamnese[] = [
  { id: "dia_da_doenca", nome: "How many days since the fever started", assuntos: ["evolucao_da_febre"], perguntaModelo: "How many days ago did the fever start? Has it gone away?" },
  { id: "hidratacao", nome: "Fluids and urine output", assuntos: ["alimentacao_hidratacao", "urina"], perguntaModelo: "Are you able to drink fluids? Are you peeing normally?" },
  { id: "doencas_remedios", nome: "Health conditions and current medications", assuntos: ["doencas_e_remedios"], perguntaModelo: "Do you have any health conditions? Are you taking any medication?" },
];

export const ORIENTACOES: ItemOrientacao[] = [
  { id: "hidratacao_oral", nome: "Hidratação oral", criterio: "orientou beber mais líquido (água, soro, sucos)" },
  { id: "sem_aas_aine", nome: "Sem AAS ou anti-inflamatório", criterio: "orientou não usar AAS, aspirina, ibuprofeno, diclofenaco ou outro anti-inflamatório" },
  { id: "sinais_de_retorno", nome: "Sinais para procurar ajuda", criterio: "explicou algum sinal que exige procurar atendimento imediatamente (ex.: vômitos, dor na barriga, sangramento, tontura, sonolência)" },
  { id: "para_onde_e_quando", nome: "Para onde ir e quando", criterio: "disse para onde a pessoa deve ir (UBS, UPA, pronto-socorro) e quando" },
];

export const ORIENTACOES_EN: ItemOrientacao[] = [
  { id: "hidratacao_oral", nome: "Oral fluids", criterio: "told the patient to drink more fluids (water, oral rehydration solution, juice)" },
  { id: "sem_aas_aine", nome: "No aspirin or anti-inflammatories", criterio: "told the patient not to use aspirin (AAS), ibuprofen, diclofenac or any other anti-inflammatory" },
  { id: "sinais_de_retorno", nome: "Signs to seek help", criterio: "explained at least one sign that means seeking care right away (e.g. vomiting, belly pain, bleeding, dizziness, drowsiness)" },
  { id: "para_onde_e_quando", nome: "Where to go and when", criterio: "said where the person should go (health clinic/UBS, UPA, emergency room) and when" },
];

export const anamnese = (idioma: Idioma) => (idioma === "pt" ? ANAMNESE : ANAMNESE_EN);
export const orientacoes = (idioma: Idioma) => (idioma === "pt" ? ORIENTACOES : ORIENTACOES_EN);

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
