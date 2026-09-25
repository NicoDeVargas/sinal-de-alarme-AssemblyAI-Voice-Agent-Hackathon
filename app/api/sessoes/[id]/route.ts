import { casosPublicos } from "@/lib/casos/publico";
import { textos } from "@/lib/i18n";
import { carregarSessao, correcoesDa } from "@/lib/estudo/carregar";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await carregarSessao((await params).id);
  if (!s) return Response.json({ erro: textos.en.api.sessaoNaoEncontrada }, { status: 404 });
  return Response.json({
    id: s.id,
    idioma: s.idioma,
    casos: [casosPublicos(s.idioma)[s.caso_1], casosPublicos(s.idioma)[s.caso_2]],
    encaminhamentos: [s.encaminhamento_1, s.encaminhamento_2],
    correcoes: await correcoesDa(s),
    preparo: s.preparo,
    preceptorSegundos: s.preceptor_segundos,
  });
}
