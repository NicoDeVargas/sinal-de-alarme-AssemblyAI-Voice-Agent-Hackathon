import { z } from "zod";
import { sql } from "@/lib/db";
import { CASOS_PRIVADOS } from "@/lib/casos/privado";
import { corrigir } from "@/lib/estudo/corrigir";
import { carregarEventos, carregarSessao, casoDoAtendimento, decidido } from "@/lib/estudo/carregar";

const Corpo = z.object({
  sessaoId: z.string(),
  atendimento: z.union([z.literal(1), z.literal(2)]),
  encaminhamento: z.enum(["A", "B", "C"]),
});

export async function POST(request: Request) {
  const corpo = Corpo.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return Response.json({ erro: "dados inválidos" }, { status: 400 });
  const { sessaoId, atendimento, encaminhamento } = corpo.data;
  const s = await carregarSessao(sessaoId);
  if (!s) return Response.json({ erro: "sessão não encontrada" }, { status: 404 });
  if (decidido(s, atendimento) || (atendimento === 2 && !s.encaminhamento_1)) {
    return Response.json({ erro: "decisão fora de ordem" }, { status: 409 });
  }
  if (atendimento === 1) await sql`update sessoes set encaminhamento_1 = ${encaminhamento} where id = ${s.id} and encaminhamento_1 is null`;
  else await sql`update sessoes set encaminhamento_2 = ${encaminhamento} where id = ${s.id} and encaminhamento_2 is null`;
  const caso = CASOS_PRIVADOS[casoDoAtendimento(s, atendimento)];
  return Response.json(corrigir(caso, await carregarEventos(s.id, atendimento), encaminhamento));
}
