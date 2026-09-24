import { CASOS_PUBLICOS } from "@/lib/casos/publico";
import { montarPreceptor } from "@/lib/casos/preceptor";
import { carregarSessao, correcoesDa } from "@/lib/estudo/carregar";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await carregarSessao((await params).id);
  if (!s) return Response.json({ erro: "sessão não encontrada" }, { status: 404 });
  if (!s.encaminhamento_1 || s.encaminhamento_2) return Response.json({ erro: "preceptor fora de hora" }, { status: 409 });
  const [c1] = await correcoesDa(s);
  return Response.json(montarPreceptor(CASOS_PUBLICOS[s.caso_1], c1!));
}
