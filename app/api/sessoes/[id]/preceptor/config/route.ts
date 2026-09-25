import { casosPublicos } from "@/lib/casos/publico";
import { textos } from "@/lib/i18n";
import { montarPreceptor } from "@/lib/casos/preceptor";
import { carregarSessao, correcoesDa } from "@/lib/estudo/carregar";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await carregarSessao((await params).id);
  if (!s) return Response.json({ erro: textos.en.api.sessaoNaoEncontrada }, { status: 404 });
  if (!s.encaminhamento_1 || s.encaminhamento_2) return Response.json({ erro: textos[s.idioma].api.preceptorForaDeHora }, { status: 409 });
  const [c1] = await correcoesDa(s);
  return Response.json(montarPreceptor(casosPublicos(s.idioma)[s.caso_1], c1!, s.idioma));
}
