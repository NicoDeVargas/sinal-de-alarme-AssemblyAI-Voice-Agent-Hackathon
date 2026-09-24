import { describe, expect, it } from "vitest";
import { criarFila } from "@/lib/voz/fila";

function montar() {
  const enviados: object[] = [];
  return { enviados, fila: criarFila((m) => enviados.push(m)) };
}

describe("criarFila", () => {
  it("segura o resultado enquanto há resposta em andamento e envia no reply.done", () => {
    const { enviados, fila } = montar();
    fila.evento("reply.started");
    fila.chamada("c1");
    fila.resultado("c1", "{}");
    expect(enviados).toEqual([]);
    fila.evento("reply.done", "completed");
    expect(enviados).toEqual([{ type: "tool.result", call_id: "c1", result: "{}" }]);
  });

  it("envia na hora se já está ocioso", () => {
    const { enviados, fila } = montar();
    fila.evento("reply.started");
    fila.chamada("c1");
    fila.evento("reply.done", "completed");
    fila.resultado("c1", "{}");
    expect(enviados).toHaveLength(1);
  });

  it("descarta chamadas de uma resposta interrompida, mesmo se o resultado chegar depois", () => {
    const { enviados, fila } = montar();
    fila.evento("reply.started");
    fila.chamada("c1");
    fila.evento("reply.done", "interrupted");
    fila.resultado("c1", "{}");
    expect(enviados).toEqual([]);
  });

  it("ignora resultado de chamada desconhecida", () => {
    const { enviados, fila } = montar();
    fila.resultado("x", "{}");
    expect(enviados).toEqual([]);
  });
});
