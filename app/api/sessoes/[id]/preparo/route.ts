import { z } from "zod";
import { sql } from "@/lib/db";
import { carregarSessao } from "@/lib/estudo/carregar";

const Corpo = z.object({ preparo: z.number().int().min(1).max(5) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const corpo = Corpo.safeParse(await request.json().catch(() => null));
  const s = await carregarSessao((await params).id);
  if (!corpo.success || !s) return Response.json({ erro: "dados inválidos" }, { status: 400 });
  if (!s.encaminhamento_2) return Response.json({ erro: "termine os atendimentos antes" }, { status: 409 });
  await sql`update sessoes set preparo = ${corpo.data.preparo}, concluida_em = coalesce(concluida_em, now()) where id = ${s.id}`;
  return new Response(null, { status: 204 });
}
