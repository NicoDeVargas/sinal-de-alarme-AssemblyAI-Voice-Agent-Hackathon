import { z } from "zod";
import { sql } from "@/lib/db";
import { hashIp } from "@/lib/ip";
import { escolherPar } from "@/lib/estudo/pares";
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
  const usos = await sql<{ par: string; n: number }[]>`
    select caso_1 || '>' || caso_2 as par, count(*)::int as n from sessoes
    where (encaminhamento_2 is not null or criada_em > now() - interval '30 minutes') and lower(apelido) <> 'teste'
    group by 1`;
  const [caso1, caso2] = escolherPar(Object.fromEntries(usos.map((u) => [u.par, u.n])));
  const [{ id }] = await sql<{ id: string }[]>`
    insert into sessoes (papel, apelido, caso_1, caso_2, ip_hash)
    values (${corpo.data.papel}, ${corpo.data.apelido}, ${caso1}, ${caso2}, ${ipHash}) returning id`;
  return Response.json({ id }, { status: 201 });
}
