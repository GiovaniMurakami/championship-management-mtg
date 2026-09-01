import { Partida, PartidaProps } from "../../../../src/dominio/entidade/partida";
import { PartidaDynamoRepositorio } from "../../../../src/infra/dynamodb/repositorios/partidaDynamoRepositorio";

const criarPartida = (props: Partial<PartidaProps> = {}) => new Partida({
  id: "uuid-gerado",
  torneioId: "t-1",
  rodada: 2,
  jogador1Id: "u-1",
  jogador2Id: "u-2",
  vitoriasJogador1: 0,
  vitoriasJogador2: 0,
  status: "pendente",
  mesa: 1,
  ...props,
});

describe("PartidaDynamoRepositorio - reconciliarRodada", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("atribui id deterministico e salva apenas partidas ausentes", async () => {
    const repositorio = PartidaDynamoRepositorio.criar();
    const partida = criarPartida();
    const salvarVarias = jest.spyOn(repositorio, "salvarVarias").mockResolvedValue();
    jest.spyOn(repositorio, "listarPorTorneioERodada").mockResolvedValue([]);
    jest.spyOn(repositorio, "buscarPorId").mockResolvedValue(null);

    await repositorio.reconciliarRodada("t-1", 2, [partida]);

    expect(partida.id).toBe("t-1-r2-m1");
    expect(salvarVarias).toHaveBeenCalledWith([partida]);
  });

  it("reaproveita partida existente da mesma mesa sem recriar", async () => {
    const repositorio = PartidaDynamoRepositorio.criar();
    const existente = criarPartida({ id: "p-existente", version: 4 });
    const partidaRetry = criarPartida({ id: "outro-uuid" });
    const salvarVarias = jest.spyOn(repositorio, "salvarVarias").mockResolvedValue();
    jest.spyOn(repositorio, "listarPorTorneioERodada").mockResolvedValue([existente]);
    jest.spyOn(repositorio, "buscarPorId").mockResolvedValue(null);

    await repositorio.reconciliarRodada("t-1", 2, [partidaRetry]);

    expect(partidaRetry.id).toBe("p-existente");
    expect(partidaRetry.version).toBe(4);
    expect(salvarVarias).toHaveBeenCalledWith([]);
  });
});
