import { CASOS_PUBLICOS } from "@/lib/casos/publico";
import { carregarSessao, correcoesDa } from "@/lib/estudo/carregar";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await carregarSessao((await params).id);
  if (!s) return Response.json({ erro: "sessão não encontrada" }, { status: 404 });
  return Response.json({
    id: s.id,
    casos: [CASOS_PUBLICOS[s.caso_1], CASOS_PUBLICOS[s.caso_2]],
    encaminhamentos: [s.encaminhamento_1, s.encaminhamento_2],
    correcoes: await correcoesDa(s),
    preparo: s.preparo,
  });
}
