import "server-only";
import type { CasoId, CasoPrivado } from "./tipos";

export const CASOS_PRIVADOS: Record<CasoId, CasoPrivado> = {
  davi: {
    id: "davi",
    respostaNormal: "Não, isso não, que eu tenha reparado.",
    ficha: {
      vomito: { fato: "Vomitou sim, umas quatro vezes só hoje. Tudo que dou, ele põe pra fora.", sinal: "vomitos_persistentes" },
      sonolencia_irritabilidade: { fato: "Agora que você falou, ele tá muito molinho, dormindo o tempo todo, difícil de acordar.", sinal: "letargia" },
      alimentacao_hidratacao: { fato: "Não quer mamar direito. Bebe um golinho e depois vomita." },
      idade: { fato: "Um ano e oito meses." },
      evolucao_da_febre: { fato: "Começou domingo. Baixa com remédio e depois volta." },
      doencas_e_remedios: { fato: "Só dei dipirona em gotas. Ele não tem nenhum problema de saúde." },
      urina: { fato: "Tá fazendo xixi, a fralda vem molhada." },
    },
    sinais: [
      { id: "vomitos_persistentes", nome: "Vômitos persistentes", perguntaModelo: "Ele vomitou? Quantas vezes hoje?" },
      { id: "letargia", nome: "Sonolência ou irritabilidade (letargia)", perguntaModelo: "Ele está mais molinho ou sonolento que o normal? Está difícil de acordar?" },
    ],
    encaminhamento: "C",
    motivo: "Vômitos persistentes e sonolência são sinais de alarme. Uma criança com qualquer um deles precisa de avaliação de urgência.",
    palavrasProibidas: ["vomit", "molinho", "sonolen", "dormindo"],
  },
  joaquim: {
    id: "joaquim",
    respostaNormal: "Não, isso eu não tenho não.",
    ficha: {
      tontura_desmaio: { fato: "Ah, quando eu levanto da cama fica tudo escuro, tenho que sentar de novo. Hoje quase caí no banheiro.", sinal: "hipotensao_postural" },
      falta_de_ar_inchaco: { fato: "Desde ontem eu fico com falta de ar quando deito. Dormi sentado na poltrona.", sinal: "acumulo_liquidos" },
      evolucao_da_febre: { fato: "A febre foi de quinta até ontem de manhã. Ontem parou, graças a Deus." },
      doencas_e_remedios: { fato: "Tenho pressão alta, tomo losartana todo dia." },
      idade: { fato: "Setenta anos, fiz em março." },
      alimentacao_hidratacao: { fato: "Tô comendo pouco, bebendo uma água aqui e ali." },
    },
    sinais: [
      { id: "hipotensao_postural", nome: "Tontura ao levantar ou quase desmaio (hipotensão postural)", perguntaModelo: "O senhor sente tontura quando levanta? Chegou a desmaiar?" },
      { id: "acumulo_liquidos", nome: "Falta de ar (possível acúmulo de líquidos)", perguntaModelo: "O senhor está sentindo falta de ar?" },
    ],
    encaminhamento: "C",
    motivo: "Tontura ao levantar e falta de ar são sinais de alarme. Eles costumam aparecer justamente quando a febre passa, na fase crítica. Idoso hipertenso com esses sinais vai para urgência.",
    palavrasProibidas: ["tontura", "escuro", "falta de ar", "dormi sentado", "parou"],
  },
  rafa: {
    id: "rafa",
    respostaNormal: "Não, nada disso.",
    ficha: {
      sangramento: { fato: "A gengiva sangrou bastante quando escovei hoje cedo. Mas ela sempre sangra um pouco, né.", sinal: "sangramento_mucosa" },
      dor_abdominal: { fato: "Tá doendo a barriga sim, uma dor forte que não passa desde ontem à noite.", sinal: "dor_abdominal" },
      alimentacao_hidratacao: { fato: "Tô comendo quase nada. Bebendo refrigerante." },
      doencas_e_remedios: { fato: "Não tenho nada. Tomei um anti-inflamatório que tinha em casa." },
      evolucao_da_febre: { fato: "Começou sábado e ainda tá indo e voltando." },
      idade: { fato: "Vinte e dois." },
    },
    sinais: [
      { id: "sangramento_mucosa", nome: "Sangramento de mucosa (gengiva)", perguntaModelo: "Você teve algum sangramento? Na gengiva, no nariz?" },
      { id: "dor_abdominal", nome: "Dor abdominal intensa e contínua", perguntaModelo: "Você está com dor na barriga? Ela é forte, passa ou é contínua?" },
    ],
    encaminhamento: "C",
    motivo: "Sangramento de gengiva e dor abdominal intensa e contínua são sinais de alarme. Além disso, anti-inflamatório é contraindicado na suspeita de dengue.",
    palavrasProibidas: ["gengiva", "sangr", "barriga", "anti-inflamat"],
  },
};
