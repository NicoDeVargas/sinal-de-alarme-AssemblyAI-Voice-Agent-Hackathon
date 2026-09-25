import { z } from "zod";
import { sql } from "@/lib/db";
import { hashIp } from "@/lib/ip";
import { escolherPar } from "@/lib/estudo/pares";
import { PAPEIS, type Papel } from "@/lib/casos/tipos";
import { IDIOMAS, idiomaDe, textos, type Idioma } from "@/lib/i18n";

const Corpo = z.object({
  papel: z.enum(PAPEIS as [Papel, ...Papel[]]),
  apelido: z.string().trim().min(1).max(40),
  consentimento: z.literal(true),
  idioma: z.enum(IDIOMAS as [Idioma, ...Idioma[]]).default("en"),
});

export async function POST(request: Request) {
  const bruto = await request.json().catch(() => null);
  const corpo = Corpo.safeParse(bruto);
  if (!corpo.success) return Response.json({ erro: textos[idiomaDe(bruto?.idioma)].api.dadosInvalidos }, { status: 400 });
  const { idioma } = corpo.data;
  const ipHash = hashIp(request);
  const [{ recentes }] = await sql<{ recentes: number }[]>`
    select count(*)::int as recentes from sessoes where ip_hash = ${ipHash} and criada_em > now() - interval '1 hour'`;
  if (recentes >= 30) return Response.json({ erro: textos[idioma].api.muitasSessoes }, { status: 429 });
  const usos = await sql<{ par: string; n: number }[]>`
    select caso_1 || '>' || caso_2 as par, count(*)::int as n from sessoes
    where (encaminhamento_2 is not null or criada_em > now() - interval '30 minutes') and lower(apelido) <> 'teste' and idioma = ${idioma}
    group by 1`;
  const [caso1, caso2] = escolherPar(Object.fromEntries(usos.map((u) => [u.par, u.n])));
  const [{ id }] = await sql<{ id: string }[]>`
    insert into sessoes (papel, apelido, caso_1, caso_2, ip_hash, idioma)
    values (${corpo.data.papel}, ${corpo.data.apelido}, ${caso1}, ${caso2}, ${ipHash}, ${idioma}) returning id`;
  return Response.json({ id }, { status: 201 });
}
