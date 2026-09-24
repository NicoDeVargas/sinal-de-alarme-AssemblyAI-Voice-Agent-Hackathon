import { z } from "zod";
import { sql } from "@/lib/db";
import { carregarSessao } from "@/lib/estudo/carregar";

const Corpo = z.object({ sessaoId: z.string() });

export async function POST(request: Request) {
  const corpo = Corpo.safeParse(await request.json().catch(() => null));
  const s = corpo.success ? await carregarSessao(corpo.data.sessaoId) : null;
  if (!s) return Response.json({ erro: "sessão não encontrada" }, { status: 404 });
  if (s.encaminhamento_2) return Response.json({ erro: "sessão encerrada" }, { status: 409 });
  if (s.tokens >= 8) return Response.json({ erro: "limite de conexões desta sessão" }, { status: 429 });
  await sql`update sessoes set tokens = tokens + 1 where id = ${s.id}`;
  const url = new URL("https://agents.assemblyai.com/v1/token");
  url.searchParams.set("expires_in_seconds", "120");
  url.searchParams.set("max_session_duration_seconds", "900");
  const resposta = await fetch(url, { headers: { Authorization: `Bearer ${process.env.ASSEMBLYAI_API_KEY}` } });
  if (!resposta.ok) return Response.json({ erro: "falha ao gerar token" }, { status: 502 });
  const { token } = await resposta.json();
  return Response.json({ token });
}
