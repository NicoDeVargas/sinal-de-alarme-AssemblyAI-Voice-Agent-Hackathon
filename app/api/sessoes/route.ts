import { z } from "zod";
import { sql } from "@/lib/db";
import { hashIp } from "@/lib/ip";
import { parDaVez } from "@/lib/estudo/pares";
import { PAPEIS } from "@/lib/casos/tipos";

const Corpo = z.object({
  papel: z.enum(Object.keys(PAPEIS) as [string, ...string[]]),
  apelido: z.string().trim().min(1).max(40),
  consentimento: z.literal(true),
});

export async function POST(request: Request) {
  const corpo = Corpo.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return Response.json({ erro: "dados inválidos" }, { status: 400 });
  const ipHash = hashIp(request);
  const [{ recentes }] = await sql<{ recentes: number }[]>`
    select count(*)::int as recentes from sessoes where ip_hash = ${ipHash} and criada_em > now() - interval '1 hour'`;
  if (recentes >= 30) return Response.json({ erro: "muitas sessões desta rede, tente mais tarde" }, { status: 429 });
  const [{ total }] = await sql<{ total: number }[]>`select count(*)::int as total from sessoes`;
  const [caso1, caso2] = parDaVez(total);
  const [{ id }] = await sql<{ id: string }[]>`
    insert into sessoes (papel, apelido, caso_1, caso_2, ip_hash)
    values (${corpo.data.papel}, ${corpo.data.apelido}, ${caso1}, ${caso2}, ${ipHash}) returning id`;
  return Response.json({ id }, { status: 201 });
}
