import "server-only";
import type { CasoId, CasoPrivado } from "./tipos";
import type { Idioma } from "@/lib/i18n";
import { CASOS_PRIVADOS_EN } from "./en/privado";

export const CASOS_PRIVADOS: Record<CasoId, CasoPrivado> = {
  davi: {
    id: "davi",
    respostaNormal: "Não, isso não, que eu tenha reparado.",
    ficha: {
      vomito: { fato: "Vomitou sim, umas quatro vezes só hoje. Tudo que dou, ele põe pra fora.", achado: "vomitos_persistentes" },
      sonolencia_irritabilidade: { fato: "Agora que você falou, ele tá muito molinho, dormindo o tempo todo, difícil de acordar.", achado: "letargia" },
      alimentacao_hidratacao: { fato: "Não quer mamar direito. Bebe um golinho e depois vomita." },
      idade: { fato: "Um ano e oito meses." },
      evolucao_da_febre: { fato: "Começou domingo. Baixa com remédio e depois volta." },
      doencas_e_remedios: { fato: "Só dei dipirona em gotas. Ele não tem nenhum problema de saúde." },
      urina: { fato: "Tá fazendo xixi, a fralda vem molhada." },
    },
    achados: [
      { id: "vomitos_persistentes", nome: "Vômitos persistentes", tipo: "alarme", perguntaModelo: "Ele vomitou? Quantas vezes hoje?" },
      { id: "letargia", nome: "Sonolência ou irritabilidade (letargia)", tipo: "alarme", perguntaModelo: "Ele está mais molinho ou sonolento que o normal? Está difícil de acordar?" },
    ],
    encaminhamento: "C",
    motivo: "Vômitos persistentes e sonolência são sinais de alarme. Uma criança com qualquer um deles precisa de avaliação de urgência.",
    respostaEsperada: "Não. Aspirina (AAS) é contraindicada na suspeita de dengue. Para febre, dipirona ou paracetamol na dose indicada, e levar o Davi agora para a urgência.",
    palavrasProibidas: ["vomit", "molinho", "sonolen", "dormindo"],
  },
  joaquim: {
    id: "joaquim",
    respostaNormal: "Não, isso eu não tenho não.",
    ficha: {
      tontura_desmaio: { fato: "Ah, quando eu levanto da cama fica tudo escuro, tenho que sentar de novo. Hoje quase caí no banheiro.", achado: "hipotensao_postural" },
      falta_de_ar_inchaco: { fato: "Desde ontem eu fico com falta de ar quando deito. Dormi sentado na poltrona.", achado: "acumulo_liquidos" },
      evolucao_da_febre: { fato: "A febre foi de quinta até ontem de manhã. Ontem parou, graças a Deus." },
      doencas_e_remedios: { fato: "Tenho pressão alta, tomo losartana todo dia." },
      idade: { fato: "Setenta anos, fiz em março." },
      alimentacao_hidratacao: { fato: "Tô comendo pouco, bebendo uma água aqui e ali." },
    },
    achados: [
      { id: "hipotensao_postural", nome: "Tontura ao levantar ou quase desmaio (hipotensão postural)", tipo: "alarme", perguntaModelo: "O senhor sente tontura quando levanta? Chegou a desmaiar?" },
      { id: "acumulo_liquidos", nome: "Falta de ar (possível acúmulo de líquidos)", tipo: "alarme", perguntaModelo: "O senhor está sentindo falta de ar?" },
    ],
    encaminhamento: "C",
    motivo: "Tontura ao levantar e falta de ar são sinais de alarme. Eles costumam aparecer justamente quando a febre passa, na fase crítica. Idoso hipertenso com esses sinais vai para urgência.",
    respostaEsperada: "Precisa, e agora. Quando a febre passa começa a fase mais perigosa da dengue, e tontura ao levantar e falta de ar são sinais de alarme.",
    palavrasProibidas: ["tontura", "escuro", "falta de ar", "dormi sentado", "parou"],
  },
  rafa: {
    id: "rafa",
    respostaNormal: "Não, nada disso.",
    ficha: {
      sangramento: { fato: "A gengiva sangrou bastante quando escovei hoje cedo. Mas ela sempre sangra um pouco, né.", achado: "sangramento_mucosa" },
      dor_abdominal: { fato: "Tá doendo a barriga sim, uma dor forte que não passa desde ontem à noite.", achado: "dor_abdominal" },
      alimentacao_hidratacao: { fato: "Tô comendo quase nada. Bebendo refrigerante." },
      doencas_e_remedios: { fato: "Não tenho nada. Tomei um anti-inflamatório que tinha em casa." },
      evolucao_da_febre: { fato: "Começou sábado e ainda tá indo e voltando." },
      idade: { fato: "Vinte e dois." },
    },
    achados: [
      { id: "sangramento_mucosa", nome: "Sangramento de mucosa (gengiva)", tipo: "alarme", perguntaModelo: "Você teve algum sangramento? Na gengiva, no nariz?" },
      { id: "dor_abdominal", nome: "Dor abdominal intensa e contínua", tipo: "alarme", perguntaModelo: "Você está com dor na barriga? Ela é forte, passa ou é contínua?" },
    ],
    encaminhamento: "C",
    motivo: "Sangramento de gengiva e dor abdominal intensa e contínua são sinais de alarme. Além disso, anti-inflamatório é contraindicado na suspeita de dengue.",
    respostaEsperada: "Não. Anti-inflamatório é contraindicado na dengue e aumenta o risco de sangramento, ainda mais com a gengiva sangrando. Para dor e febre, dipirona ou paracetamol.",
    palavrasProibidas: ["gengiva", "sangr", "barriga", "tinha em casa"],
  },
  juliana: {
    id: "juliana",
    respostaNormal: "Não, isso eu não sei não.",
    ficha: {
      gestacao: { fato: "Tá grávida sim, de sete meses. É nosso primeiro.", achado: "gestacao" },
      idade: { fato: "Vinte e oito." },
      evolucao_da_febre: { fato: "Começou ontem de manhã, trinta e oito e pouco." },
      alimentacao_hidratacao: { fato: "Tá bebendo água, comendo pouco." },
      urina: { fato: "Normal, acho." },
      doencas_e_remedios: { fato: "Ela não tem nada. Tomou um paracetamol ontem." },
    },
    achados: [
      { id: "gestacao", nome: "Gestante (grupo de risco)", tipo: "risco", perguntaModelo: "Ela está grávida ou pode estar?" },
    ],
    encaminhamento: "B",
    motivo: "Gestante com suspeita de dengue é grupo de risco: sem sinais de alarme, vai à UBS hoje, com prioridade, para avaliação e acompanhamento.",
    respostaEsperada: "Melhor não. Muitos antigripais têm AAS ou outros componentes que não são indicados. Na gravidez, só paracetamol se precisar, e ela deve ser avaliada hoje na UBS.",
    palavrasProibidas: ["gravid", "gestan", "bebê", "sete meses"],
  },
  celia: {
    id: "celia",
    respostaNormal: "Não, ela não tem não.",
    ficha: {
      doencas_e_remedios: { fato: "Ela é diabética, toma insulina de manhã e de noite. E remédio de pressão.", achado: "diabetes" },
      idade: { fato: "Sessenta e quatro." },
      evolucao_da_febre: { fato: "Começou segunda. Ainda tá com febre." },
      alimentacao_hidratacao: { fato: "Tá comendo menos, mas bebendo água." },
      urina: { fato: "Tá normal." },
    },
    achados: [
      { id: "diabetes", nome: "Diabetes em uso de insulina (grupo de risco)", tipo: "risco", perguntaModelo: "Ela tem alguma doença, como diabetes ou pressão alta? Usa algum remédio?" },
    ],
    encaminhamento: "B",
    motivo: "Diabetes é condição de risco na dengue: mesmo sem sinais de alarme, ela deve ser avaliada hoje na UBS, com prioridade.",
    respostaEsperada: "Precisa, hoje. Diabética com suspeita de dengue é grupo de risco e deve ser avaliada na UBS com prioridade.",
    palavrasProibidas: ["diabet", "insulin", "açúcar", "pressão"],
  },
};

export const casosPrivados = (idioma: Idioma) => (idioma === "pt" ? CASOS_PRIVADOS : CASOS_PRIVADOS_EN);
