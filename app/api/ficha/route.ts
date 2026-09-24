import { z } from "zod";
import { sql } from "@/lib/db";
import { CASOS_PRIVADOS } from "@/lib/casos/privado";
import { ASSUNTOS } from "@/lib/casos/tipos";
import { resolverFicha } from "@/lib/estudo/ficha";
import { carregarSessao, casoDoAtendimento, decidido } from "@/lib/estudo/carregar";

const Corpo = z.object({
  sessaoId: z.string(),
  atendimento: z.union([z.literal(1), z.literal(2)]),
  assunto: z.enum(ASSUNTOS),
  ultimaFala: z.string().max(1000),
});

export async function POST(request: Request) {
  const corpo = Corpo.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return Response.json({ erro: "dados inválidos" }, { status: 400 });
  const { sessaoId, atendimento, assunto, ultimaFala } = corpo.data;
  const s = await carregarSessao(sessaoId);
  if (!s) return Response.json({ erro: "sessão não encontrada" }, { status: 404 });
  if (decidido(s, atendimento)) return Response.json({ erro: "atendimento já decidido" }, { status: 409 });
  const { resposta, achado } = resolverFicha(CASOS_PRIVADOS[casoDoAtendimento(s, atendimento)], assunto);
  await sql`insert into eventos (sessao_id, atendimento, assunto, sinal, ultima_fala) values (${s.id}, ${atendimento}, ${assunto}, ${achado}, ${ultimaFala})`;
  return Response.json({ resposta });
}
