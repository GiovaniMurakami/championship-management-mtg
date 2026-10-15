import { CadastrarFotoGaleria } from "../../../src/casosDeUso/galeria/cadastrarFotoGaleria";
import { ListarFotosGaleria } from "../../../src/casosDeUso/galeria/listarFotosGaleria";
import { ExcluirFotoGaleria } from "../../../src/casosDeUso/galeria/excluirFotoGaleria";
import { ExcluirFotosGaleriaLote } from "../../../src/casosDeUso/galeria/excluirFotosGaleriaLote";
import { RegistrarVisualizacaoGaleria } from "../../../src/casosDeUso/galeria/registrarVisualizacaoGaleria";
import { BuscarEstatisticasGaleria } from "../../../src/casosDeUso/galeria/buscarEstatisticasGaleria";
import { FotoGaleria } from "../../../src/dominio/entidade/fotoGaleria";
import { criarMockGaleriaGateway, criarMockImagemGateway } from "../../mocks/gateways";

describe("Galeria use cases", () => {
  it("cadastra foto webp", async () => {
    const gateway = criarMockGaleriaGateway();
    const uc = CadastrarFotoGaleria.criar(gateway);

    const resultado = await uc.executar({
      url: "https://cdn.example.com/imagens/admin/foto.webp",
      urlThumb: "https://cdn.example.com/imagens/admin/foto-thumb.webp",
      titulo: "  Top 8  ",
      usuarioId: "user-1",
    });

    expect(resultado.url).toContain(".webp");
    expect(resultado.urlThumb).toContain("thumb");
    expect(resultado.titulo).toBe("Top 8");
    expect(resultado.criadoPorId).toBe("user-1");
    expect(gateway.salvar).toHaveBeenCalledTimes(1);
  });

  it("rejeita url vazia", async () => {
    const uc = CadastrarFotoGaleria.criar(criarMockGaleriaGateway());
    await expect(uc.executar({ url: "  ", usuarioId: "user-1" })).rejects.toMatchObject({
      message: expect.stringMatching(/URL da imagem/i),
      status: 400,
    });
  });

  it("rejeita imagem que não é webp", async () => {
    const uc = CadastrarFotoGaleria.criar(criarMockGaleriaGateway());
    await expect(
      uc.executar({ url: "https://cdn.example.com/imagens/admin/foto.jpg", usuarioId: "user-1" }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/WebP/i),
      status: 400,
    });
  });

  it("lista fotos cadastradas", async () => {
    const gateway = criarMockGaleriaGateway();
    gateway.listar.mockResolvedValue([
      new FotoGaleria({
        id: "1",
        url: "https://cdn.example.com/a.webp",
        titulo: "A",
        criadoPorId: "admin",
        criadoEm: new Date("2026-01-01T12:00:00Z"),
      }),
    ]);
    const uc = ListarFotosGaleria.criar(gateway);
    const resultado = await uc.executar();
    expect(resultado.fotos).toHaveLength(1);
    expect(resultado.fotos[0].titulo).toBe("A");
    expect(resultado.fotos[0].urlThumb).toBe("https://cdn.example.com/a.webp");
    expect(resultado.total).toBe(1);
    expect(resultado.limite).toBe(24);
    expect(resultado.offset).toBe(0);
  });

  it("pagina fotos com limite e offset", async () => {
    const gateway = criarMockGaleriaGateway();
    gateway.listar.mockResolvedValue(
      Array.from({ length: 30 }, (_, i) =>
        new FotoGaleria({
          id: String(i + 1),
          url: `https://cdn.example.com/${i + 1}.webp`,
          titulo: `F${i + 1}`,
          criadoPorId: "admin",
          criadoEm: new Date(2026, 0, 1, 12, i),
        }),
      ),
    );
    const uc = ListarFotosGaleria.criar(gateway);

    const pagina1 = await uc.executar({ limite: 24, offset: 0 });
    expect(pagina1.fotos).toHaveLength(24);
    expect(pagina1.total).toBe(30);
    expect(pagina1.fotos[0].id).toBe("1");

    const pagina2 = await uc.executar({ limite: 24, offset: 24 });
    expect(pagina2.fotos).toHaveLength(6);
    expect(pagina2.offset).toBe(24);
    expect(pagina2.fotos[0].id).toBe("25");
  });

  it("exclui foto e remove do S3", async () => {
    const gateway = criarMockGaleriaGateway();
    const imagem = criarMockImagemGateway();
    const foto = new FotoGaleria({
      id: "1",
      url: "https://cdn.example.com/a.webp",
      criadoPorId: "admin",
    });
    gateway.buscarPorId.mockResolvedValue(foto);
    gateway.excluir.mockResolvedValue(true);
    const uc = ExcluirFotoGaleria.criar(gateway, imagem);

    await expect(uc.executar({ id: "1" })).resolves.toEqual({ id: "1", excluido: true });
    expect(imagem.excluirPorUrl).toHaveBeenCalledWith(foto.url);
  });

  it("falha ao excluir foto inexistente", async () => {
    const gateway = criarMockGaleriaGateway();
    gateway.buscarPorId.mockResolvedValue(null);
    const uc = ExcluirFotoGaleria.criar(gateway, criarMockImagemGateway());
    await expect(uc.executar({ id: "missing" })).rejects.toMatchObject({
      message: expect.stringMatching(/não encontrada/i),
      status: 404,
    });
  });

  it("conclui exclusão mesmo se S3 falhar", async () => {
    const gateway = criarMockGaleriaGateway();
    const imagem = criarMockImagemGateway();
    gateway.buscarPorId.mockResolvedValue(
      new FotoGaleria({ id: "1", url: "https://cdn.example.com/a.webp", criadoPorId: "admin" }),
    );
    gateway.excluir.mockResolvedValue(true);
    imagem.excluirPorUrl.mockRejectedValue(new Error("s3 down"));
    const uc = ExcluirFotoGaleria.criar(gateway, imagem);

    await expect(uc.executar({ id: "1" })).resolves.toEqual({ id: "1", excluido: true });
  });

  it("exclui fotos em lote", async () => {
    const gateway = criarMockGaleriaGateway();
    const imagem = criarMockImagemGateway();
    gateway.buscarPorId.mockImplementation(async (id: string) =>
      id === "missing"
        ? null
        : new FotoGaleria({ id, url: `https://cdn.example.com/${id}.webp`, criadoPorId: "admin" }),
    );
    gateway.excluir.mockResolvedValue(true);
    const uc = ExcluirFotosGaleriaLote.criar(gateway, imagem);

    await expect(uc.executar({ ids: ["1", "2", "missing", "1"] })).resolves.toEqual({
      excluidos: ["1", "2"],
      total: 2,
    });
    expect(imagem.excluirPorUrl).toHaveBeenCalledTimes(2);
  });

  it("registra visualização da página", async () => {
    const gateway = criarMockGaleriaGateway();
    gateway.incrementarVisualizacoesPagina.mockResolvedValue({ visualizacoes: 42 });
    const uc = RegistrarVisualizacaoGaleria.criar(gateway);
    await expect(uc.executar()).resolves.toEqual({ visualizacoes: 42 });
  });

  it("busca estatísticas da galeria", async () => {
    const gateway = criarMockGaleriaGateway();
    gateway.buscarEstatisticas.mockResolvedValue({ visualizacoes: 10 });
    const uc = BuscarEstatisticasGaleria.criar(gateway);
    await expect(uc.executar()).resolves.toEqual({ visualizacoes: 10 });
  });
});
