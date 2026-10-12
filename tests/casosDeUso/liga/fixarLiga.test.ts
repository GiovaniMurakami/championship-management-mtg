import { describe, expect, it, vi } from "vitest";
import { FixarLiga } from "../../../src/casosDeUso/liga/fixarLiga";
import { Liga } from "../../../src/dominio/entidade/liga";
import { criarMockLigaGateway } from "../../mocks/gateways";

describe("FixarLiga", () => {
  it("fixa e desfixa liga", async () => {
    const liga = new Liga({ id: "l1", nome: "Liga", donoId: "d", fixado: false });
    const gateway = criarMockLigaGateway({
      buscarPorId: vi.fn().mockResolvedValue(liga),
      atualizar: vi.fn().mockResolvedValue(undefined),
    });
    const uc = FixarLiga.criar(gateway);

    expect(await uc.executar({ ligaId: "l1", fixado: true })).toEqual({ id: "l1", fixado: true });
    expect(liga.fixado).toBe(true);

    expect(await uc.executar({ ligaId: "l1", fixado: false })).toEqual({ id: "l1", fixado: false });
    expect(liga.fixado).toBe(false);
  });

  it("retorna 404 quando liga nao existe", async () => {
    const uc = FixarLiga.criar(
      criarMockLigaGateway({ buscarPorId: vi.fn().mockResolvedValue(null) }),
    );
    await expect(uc.executar({ ligaId: "x", fixado: true })).rejects.toMatchObject({
      status: 404,
    });
  });
});
