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

    expect(partida.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(salvarVarias).toHaveBeenCalledWith([partida]);
  });

  it("mantem o UUID para a mesma rodada e mesa e diferencia mesas distintas", async () => {
    const repositorio = PartidaDynamoRepositorio.criar();
    jest.spyOn(repositorio, "salvarVarias").mockResolvedValue();
    jest.spyOn(repositorio, "listarPorTorneioERodada").mockResolvedValue([]);
    jest.spyOn(repositorio, "buscarPorId").mockResolvedValue(null);
    const primeira = criarPartida({ mesa: 1 });
    const repetida = criarPartida({ mesa: 1 });
    const outraMesa = criarPartida({ mesa: 2 });

    await repositorio.reconciliarRodada("t-1", 2, [primeira]);
    await repositorio.reconciliarRodada("t-1", 2, [repetida]);
    await repositorio.reconciliarRodada("t-1", 2, [outraMesa]);

    expect(repetida.id).toBe(primeira.id);
    expect(outraMesa.id).not.toBe(primeira.id);
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
