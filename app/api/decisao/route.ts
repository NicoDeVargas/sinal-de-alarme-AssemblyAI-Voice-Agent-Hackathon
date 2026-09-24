import { z } from "zod";
import { sql } from "@/lib/db";
import { CASOS_PRIVADOS } from "@/lib/casos/privado";
import { CASOS_PUBLICOS } from "@/lib/casos/publico";
import { corrigir } from "@/lib/estudo/corrigir";
import { avaliar } from "@/lib/estudo/avaliar";
import { carregarEventos, carregarSessao, casoDoAtendimento, decidido } from "@/lib/estudo/carregar";

export const maxDuration = 60;

const Corpo = z.object({
  sessaoId: z.string(),
  atendimento: z.union([z.literal(1), z.literal(2)]),
  encaminhamento: z.enum(["A", "B", "C"]),
  transcricao: z.array(z.object({ quem: z.enum(["profissional", "paciente"]), texto: z.string().max(1000) })).max(300).default([]),
});

export async function POST(request: Request) {
  const corpo = Corpo.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return Response.json({ erro: "dados inválidos" }, { status: 400 });
  const { sessaoId, atendimento, encaminhamento, transcricao } = corpo.data;
  const s = await carregarSessao(sessaoId);
  if (!s) return Response.json({ erro: "sessão não encontrada" }, { status: 404 });
  if (decidido(s, atendimento) || (atendimento === 2 && !s.encaminhamento_1)) {
    return Response.json({ erro: "decisão fora de ordem" }, { status: 409 });
  }
  const linhas =
    atendimento === 1
      ? await sql`update sessoes set encaminhamento_1 = ${encaminhamento} where id = ${s.id} and encaminhamento_1 is null returning id`
      : await sql`update sessoes set encaminhamento_2 = ${encaminhamento} where id = ${s.id} and encaminhamento_2 is null returning id`;
  if (linhas.length === 0) return Response.json({ erro: "atendimento já decidido" }, { status: 409 });
  if (transcricao.length > 0) {
    const falas = transcricao.map((f, i) => ({ sessao_id: s.id, atendimento, ordem: i + 1, quem: f.quem, texto: f.texto }));
    await sql`insert into falas ${sql(falas)}`;
  }
  const id = casoDoAtendimento(s, atendimento);
  const avaliacao = await avaliar(CASOS_PRIVADOS[id], CASOS_PUBLICOS[id], transcricao);
  await sql`insert into avaliacoes (sessao_id, atendimento, resultado)
    values (${s.id}, ${atendimento}, ${avaliacao ? JSON.stringify(avaliacao) : null}::text::jsonb) on conflict do nothing`;
  return Response.json(corrigir(CASOS_PRIVADOS[id], CASOS_PUBLICOS[id], await carregarEventos(s.id, atendimento), encaminhamento, avaliacao));
}
