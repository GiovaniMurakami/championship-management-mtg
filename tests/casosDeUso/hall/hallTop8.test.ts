import { AtualizarHallTop8 } from "../../../src/casosDeUso/hall/atualizarHallTop8";
import { CadastrarHallTop8 } from "../../../src/casosDeUso/hall/cadastrarHallTop8";
import { ExcluirHallTop8 } from "../../../src/casosDeUso/hall/excluirHallTop8";
import { ListarHallTop8 } from "../../../src/casosDeUso/hall/listarHallTop8";
import { HallTop8Gateway, HallTop8Item } from "../../../src/dominio/gateway/hallTop8Gateway";

const TORNEIO_ID = "550e8400-e29b-41d4-a716-446655440010";
const HALL_ID = "550e8400-e29b-41d4-a716-446655440011";
const IMG = "https://bucket.s3.amazonaws.com/imagens/top8.webp";

function item(overrides: Partial<HallTop8Item> = {}): HallTop8Item {
  const criadoEm = overrides.criadoEm || new Date("2026-10-01T20:00:00.000Z");
  return {
    id: HALL_ID,
    torneioId: TORNEIO_ID,
    torneioNome: "Pauper Free",
    imagemUrl: IMG,
    ativo: true,
    dataTorneio: criadoEm,
    criadoEm,
    ...overrides,
  };
}

function criarHallGateway(overrides: Partial<HallTop8Gateway> = {}): HallTop8Gateway {
  return {
    salvar: vi.fn().mockResolvedValue(undefined),
    listar: vi.fn().mockResolvedValue([]),
    buscarPorId: vi.fn().mockResolvedValue(null),
    excluir: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

describe("Hall da Fama Top 8", () => {
  it("cadastra item com nome do torneio", async () => {
    const hall = criarHallGateway();
    const horario = new Date("2026-10-05T20:00:00.000Z");
    const torneio = {
      buscarPorId: vi.fn().mockResolvedValue({ id: TORNEIO_ID, nome: "Pauper Free", horario }),
    };
    const uc = CadastrarHallTop8.criar(hall, torneio as never);

    const saida = await uc.executar({ torneioId: TORNEIO_ID, imagemUrl: IMG });

    expect(saida.torneioId).toBe(TORNEIO_ID);
    expect(saida.torneioNome).toBe("Pauper Free");
    expect(saida.imagemUrl).toBe(IMG);
    expect(hall.salvar).toHaveBeenCalledOnce();
    expect(hall.salvar).toHaveBeenCalledWith(
      expect.objectContaining({ dataTorneio: horario }),
    );
  });

  it("rejeita imagem sem URL http", async () => {
    const uc = CadastrarHallTop8.criar(criarHallGateway(), {
      buscarPorId: vi.fn(),
    } as never);

    await expect(
      uc.executar({ torneioId: TORNEIO_ID, imagemUrl: "ftp://x" }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("lista apenas ativos preservando ordem do gateway", async () => {
    const hall = criarHallGateway({
      listar: vi.fn().mockResolvedValue([
        item({ id: "c", dataTorneio: new Date("2026-10-10T00:00:00.000Z"), ativo: true }),
        item({ id: "b", dataTorneio: new Date("2026-10-01T00:00:00.000Z"), ativo: false }),
        item({ id: "a", dataTorneio: new Date("2026-09-01T00:00:00.000Z"), ativo: true }),
      ]),
    });

    const saida = await ListarHallTop8.criar(hall).executar({ limite: 10, offset: 0 });

    expect(saida.total).toBe(2);
    expect(saida.itens.map((i: { id: string }) => i.id)).toEqual(["c", "a"]);
  });

  it("atualiza ativo e exclui imagem do S3 ao remover", async () => {
    const hall = criarHallGateway({
      buscarPorId: vi.fn().mockResolvedValue(item()),
      excluir: vi.fn().mockResolvedValue(true),
    });
    const s3 = { excluirPorUrl: vi.fn().mockResolvedValue(undefined) };

    const atualizado = await AtualizarHallTop8.criar(hall).executar({ id: HALL_ID, ativo: false });
    expect(atualizado.ativo).toBe(false);

    const excluido = await ExcluirHallTop8.criar(hall, s3 as never).executar({ id: HALL_ID });
    expect(excluido.excluido).toBe(true);
    expect(s3.excluirPorUrl).toHaveBeenCalledWith(IMG);
  });

  it("atualiza dataTorneio para ordenação por data do torneio", async () => {
    const hall = criarHallGateway({
      buscarPorId: vi.fn().mockResolvedValue(item()),
    });
    const dataTorneio = "2026-10-05T20:00:00.000Z";

    const saida = await AtualizarHallTop8.criar(hall).executar({ id: HALL_ID, dataTorneio });

    expect(hall.salvar).toHaveBeenCalledWith(
      expect.objectContaining({ dataTorneio: new Date(dataTorneio) }),
    );
    expect(saida.dataTorneio).toContain("2026-10-05");
  });

  it("pagina resultados e expõe dataTorneio", async () => {
    const hall = criarHallGateway({
      listar: vi.fn().mockResolvedValue([
        item({ id: "1", dataTorneio: new Date("2026-10-10T00:00:00.000Z") }),
        item({ id: "2", dataTorneio: new Date("2026-10-09T00:00:00.000Z") }),
        item({ id: "3", dataTorneio: new Date("2026-10-08T00:00:00.000Z") }),
      ]),
    });

    const saida = await ListarHallTop8.criar(hall).executar({ limite: 2, offset: 1 });

    expect(saida.total).toBe(3);
    expect(saida.itens).toHaveLength(2);
    expect(saida.itens.map((i: { id: string }) => i.id)).toEqual(["2", "3"]);
    expect(saida.itens[0].dataTorneio).toBeTruthy();
  });
});
