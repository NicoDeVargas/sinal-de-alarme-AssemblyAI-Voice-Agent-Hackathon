import { z } from "zod";
import { sql } from "@/lib/db";
import { carregarSessao } from "@/lib/estudo/carregar";

const Corpo = z.object({ segundos: z.number().int().min(0).max(600) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const corpo = Corpo.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return Response.json({ erro: "dados inválidos" }, { status: 400 });
  const s = await carregarSessao((await params).id);
  if (!s) return Response.json({ erro: "sessão não encontrada" }, { status: 404 });
  if (!s.encaminhamento_1) return Response.json({ erro: "termine o primeiro atendimento antes" }, { status: 409 });
  const linhas = await sql`update sessoes set preceptor_segundos = ${corpo.data.segundos} where id = ${s.id} and preceptor_segundos is null returning id`;
  if (linhas.length === 0) return Response.json({ erro: "preceptor já registrado" }, { status: 409 });
  return new Response(null, { status: 204 });
}
