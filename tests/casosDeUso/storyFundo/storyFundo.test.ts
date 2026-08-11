import { CadastrarStoryFundo } from "../../../src/casosDeUso/storyFundo/cadastrarStoryFundo";
import { ListarStoryFundos } from "../../../src/casosDeUso/storyFundo/listarStoryFundos";
import { ExcluirStoryFundo } from "../../../src/casosDeUso/storyFundo/excluirStoryFundo";
import { StoryFundo } from "../../../src/dominio/entidade/storyFundo";
import { criarMockStoryFundoGateway } from "../../mocks/gateways";

describe("StoryFundo use cases", () => {
  it("cadastra fundo com nome e url", async () => {
    const gateway = criarMockStoryFundoGateway();
    gateway.listar.mockResolvedValue([]);
    const uc = CadastrarStoryFundo.criar(gateway);

    const resultado = await uc.executar({
      nome: "  FUGUETE CHAMP  ",
      url: "https://cdn.example.com/fugete.jpg",
    });

    expect(resultado.nome).toBe("FUGUETE CHAMP");
    expect(resultado.url).toBe("https://cdn.example.com/fugete.jpg");
    expect(gateway.salvar).toHaveBeenCalledTimes(1);
  });

  it("rejeita nome vazio após trim", async () => {
    const uc = CadastrarStoryFundo.criar(criarMockStoryFundoGateway());
    await expect(uc.executar({ nome: "   ", url: "https://cdn.example.com/a.jpg" })).rejects.toMatchObject({
      message: expect.stringMatching(/Nome do fundo/i),
      status: 400,
    });
  });

  it("rejeita url vazia após trim", async () => {
    const uc = CadastrarStoryFundo.criar(criarMockStoryFundoGateway());
    await expect(uc.executar({ nome: "Fundo", url: "  " })).rejects.toMatchObject({
      message: expect.stringMatching(/URL da imagem/i),
      status: 400,
    });
  });

  it("rejeita nome duplicado", async () => {
    const gateway = criarMockStoryFundoGateway();
    gateway.listar.mockResolvedValue([
      new StoryFundo({ id: "1", nome: "Tropical Pauper", url: "https://cdn.example.com/a.jpg" }),
    ]);
    const uc = CadastrarStoryFundo.criar(gateway);

    await expect(
      uc.executar({ nome: "tropical pauper", url: "https://cdn.example.com/b.jpg" }),
    ).rejects.toMatchObject({ message: expect.stringMatching(/Já existe/i) });
  });

  it("mapeia erro Mongo 11000 para nome duplicado", async () => {
    const gateway = criarMockStoryFundoGateway();
    gateway.listar.mockResolvedValue([]);
    gateway.salvar.mockRejectedValue({ code: 11000 });
    const uc = CadastrarStoryFundo.criar(gateway);

    await expect(
      uc.executar({ nome: "Novo", url: "https://cdn.example.com/n.jpg" }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/Já existe/i),
      status: 400,
    });
  });

  it("propaga erro inesperado ao salvar", async () => {
    const gateway = criarMockStoryFundoGateway();
    gateway.listar.mockResolvedValue([]);
    gateway.salvar.mockRejectedValue(new Error("falha s3"));
    const uc = CadastrarStoryFundo.criar(gateway);

    await expect(
      uc.executar({ nome: "Novo", url: "https://cdn.example.com/n.jpg" }),
    ).rejects.toThrow("falha s3");
  });

  it("lista fundos cadastrados", async () => {
    const gateway = criarMockStoryFundoGateway();
    gateway.listar.mockResolvedValue([
      new StoryFundo({ id: "1", nome: "A", url: "https://cdn.example.com/a.jpg", criadoEm: new Date("2026-01-01T12:00:00Z") }),
    ]);
    const uc = ListarStoryFundos.criar(gateway);
    const resultado = await uc.executar();
    expect(resultado.fundos).toHaveLength(1);
    expect(resultado.fundos[0].nome).toBe("A");
  });

  it("lista vazia quando não há fundos", async () => {
    const gateway = criarMockStoryFundoGateway();
    gateway.listar.mockResolvedValue([]);
    const uc = ListarStoryFundos.criar(gateway);
    await expect(uc.executar()).resolves.toEqual({ fundos: [] });
  });

  it("exclui fundo existente", async () => {
    const gateway = criarMockStoryFundoGateway();
    gateway.excluir.mockResolvedValue(true);
    const uc = ExcluirStoryFundo.criar(gateway);
    await expect(uc.executar({ id: "1" })).resolves.toEqual({ id: "1", excluido: true });
  });

  it("retorna 404 ao excluir fundo inexistente", async () => {
    const gateway = criarMockStoryFundoGateway();
    gateway.excluir.mockResolvedValue(false);
    const uc = ExcluirStoryFundo.criar(gateway);
    await expect(uc.executar({ id: "missing" })).rejects.toMatchObject({
      message: expect.stringMatching(/não encontrado/i),
      status: 404,
    });
  });
});
