import { EnviarNewsletterMetagameSemanal } from "../../../src/casosDeUso/site/enviarNewsletterMetagameSemanal";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { ListarMetagame } from "../../../src/casosDeUso/metagame/listarMetagame";
import { criarMockEmailGateway, criarMockUsuarioGateway } from "../../mocks/gateways";

describe("EnviarNewsletterMetagameSemanal", () => {
  const previousLocal = process.env.IS_LOCAL;
  const previousFrontend = process.env.FRONTEND_URL;

  beforeEach(() => {
    process.env.IS_LOCAL = "true";
    process.env.FRONTEND_URL = "http://localhost:5173";
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (previousLocal === undefined) delete process.env.IS_LOCAL;
    else process.env.IS_LOCAL = previousLocal;
    if (previousFrontend === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = previousFrontend;
  });

  function mockListarMetagame(executar: ReturnType<typeof vi.fn>): ListarMetagame {
    return { executar } as unknown as ListarMetagame;
  }

  it("não envia quando não há assinantes", async () => {
    const email = criarMockEmailGateway();
    const uc = EnviarNewsletterMetagameSemanal.criar(
      criarMockUsuarioGateway(),
      mockListarMetagame(vi.fn()),
      email,
    );

    await expect(uc.executar()).resolves.toEqual({
      assinantes: 0,
      enviados: 0,
      falhas: 0,
      secoes: 0,
      dias: 7,
    });
    expect(email.enviar).not.toHaveBeenCalled();
  });

  it("envia para assinantes com janela customizada de dias", async () => {
    const assinante = new Usuario({
      id: "user-1",
      nome: "Ana",
      email: "ana@email.com",
      senha: "hash",
      newsletterMetagame: true,
    });
    const listar = vi.fn().mockImplementation(async ({ formato }: { formato: string }) => {
      if (formato === "pauper") {
        return {
          totalTorneios: 2,
          totalDecks: 10,
          arquetipos: [{ nome: "Affinity", slug: "affinity", metaPct: 20, winrate: 55, copias: 4 }],
        };
      }
      return { totalTorneios: 0, totalDecks: 0, arquetipos: [] };
    });
    const email = criarMockEmailGateway();
    const uc = EnviarNewsletterMetagameSemanal.criar(
      criarMockUsuarioGateway({ listar: vi.fn().mockResolvedValue([assinante]) }),
      mockListarMetagame(listar),
      email,
    );

    const promessa = uc.executar({ dias: 30, assuntoPrefixo: "[TESTE 30d]" });
    await vi.runAllTimersAsync();
    const resultado = await promessa;

    expect(resultado).toMatchObject({
      assinantes: 1,
      enviados: 1,
      falhas: 0,
      secoes: 1,
      dias: 30,
    });
    expect(listar).toHaveBeenCalledWith(expect.objectContaining({ formato: "pauper", dias: 30 }));
    expect(email.enviar).toHaveBeenCalledWith(expect.objectContaining({
      para: "ana@email.com",
      assunto: "[TESTE 30d] Metagame da semana — Fuguete",
    }));
    const html = (email.enviar as ReturnType<typeof vi.fn>).mock.calls[0][0].html as string;
    expect(html).toContain("/images/top8/rodape.png.png");
    expect(html).toContain("newsletter/descadastrar?token=");
  });

  it("ignora formato com torneio mas sem decks", async () => {
    const assinante = new Usuario({
      id: "user-1",
      nome: "Ana",
      email: "ana@email.com",
      senha: "hash",
      newsletterMetagame: true,
    });
    const listar = vi.fn().mockImplementation(async ({ formato }: { formato: string }) => {
      if (formato === "standard") {
        return { totalTorneios: 1, totalDecks: 0, arquetipos: [] };
      }
      if (formato === "pauper") {
        return {
          totalTorneios: 2,
          totalDecks: 10,
          arquetipos: [{ nome: "Affinity", slug: "affinity", metaPct: 20, winrate: 55, copias: 4 }],
        };
      }
      return { totalTorneios: 0, totalDecks: 0, arquetipos: [] };
    });
    const email = criarMockEmailGateway();
    const uc = EnviarNewsletterMetagameSemanal.criar(
      criarMockUsuarioGateway({ listar: vi.fn().mockResolvedValue([assinante]) }),
      mockListarMetagame(listar),
      email,
    );

    const promessa = uc.executar({ dias: 7 });
    await vi.runAllTimersAsync();
    const resultado = await promessa;

    expect(resultado.secoes).toBe(1);
    const html = (email.enviar as ReturnType<typeof vi.fn>).mock.calls[0][0].html as string;
    expect(html).toContain("Pauper");
    expect(html).not.toContain("Standard");
  });
});
