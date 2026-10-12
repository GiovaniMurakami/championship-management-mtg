import { describe, expect, it, vi } from "vitest";
import { FixarTorneio } from "../../../src/casosDeUso/torneio/fixarTorneio";
import { Torneio } from "../../../src/dominio/entidade/torneio";
import { criarMockTorneioGateway } from "../../mocks/gateways";

describe("FixarTorneio", () => {
  const torneio = () =>
    new Torneio({
      id: "t1",
      nome: "T",
      horario: new Date(),
      formato: "pauper",
      donoId: "d",
      status: "inscricoes_abertas",
      rodadaAtual: 0,
      totalRodadas: 0,
      fixado: false,
    });

  it("fixa torneio e publica evento", async () => {
    const t = torneio();
    const gateway = criarMockTorneioGateway({
      buscarPorId: vi.fn().mockResolvedValue(t),
      atualizar: vi.fn().mockResolvedValue(undefined),
    });
    const eventos = { publicar: vi.fn() };
    const uc = FixarTorneio.criar(gateway, eventos as never);

    const resultado = await uc.executar({ torneioId: "t1", fixado: true });

    expect(resultado).toEqual({ id: "t1", fixado: true });
    expect(t.fixado).toBe(true);
    expect(gateway.atualizar).toHaveBeenCalledWith(t);
    expect(eventos.publicar).toHaveBeenCalledWith("torneio_alterado", { torneioId: "t1" });
  });

  it("desfixa torneio", async () => {
    const t = torneio();
    t.fixado = true;
    const gateway = criarMockTorneioGateway({
      buscarPorId: vi.fn().mockResolvedValue(t),
      atualizar: vi.fn().mockResolvedValue(undefined),
    });
    const uc = FixarTorneio.criar(gateway);

    await uc.executar({ torneioId: "t1", fixado: false });
    expect(t.fixado).toBe(false);
  });

  it("retorna 404 quando torneio nao existe", async () => {
    const uc = FixarTorneio.criar(
      criarMockTorneioGateway({ buscarPorId: vi.fn().mockResolvedValue(null) }),
    );
    await expect(uc.executar({ torneioId: "x", fixado: true })).rejects.toMatchObject({
      status: 404,
    });
  });
});
