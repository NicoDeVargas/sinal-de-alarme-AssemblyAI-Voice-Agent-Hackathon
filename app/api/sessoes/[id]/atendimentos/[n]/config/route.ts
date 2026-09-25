import { casosPublicos } from "@/lib/casos/publico";
import { textos } from "@/lib/i18n";
import { montarSessao } from "@/lib/casos/prompt";
import { carregarSessao, casoDoAtendimento, decidido } from "@/lib/estudo/carregar";

export async function GET(_: Request, { params }: { params: Promise<{ id: string; n: string }> }) {
  const { id, n } = await params;
  const atendimento = n === "1" ? 1 : n === "2" ? 2 : null;
  const s = await carregarSessao(id);
  if (!s || !atendimento) return Response.json({ erro: textos[s?.idioma ?? "en"].api.naoEncontrado }, { status: 404 });
  if (decidido(s, atendimento)) return Response.json({ erro: textos[s.idioma].api.jaDecidido }, { status: 409 });
  return Response.json(montarSessao(casosPublicos(s.idioma)[casoDoAtendimento(s, atendimento)], s.idioma));
}
