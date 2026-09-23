import { DescadastrarNewsletter } from "../../../src/casosDeUso/usuario/descadastrarNewsletter";
import { EmailUsuarioJaExisteErro } from "../../../src/dominio/gateway/usuarioGateway";
import { Usuario } from "../../../src/dominio/entidade/usuario";
import { criarTokenDescadastroNewsletter } from "../../../src/helpers/newsletterToken";
import { criarMockUsuarioGateway } from "../../mocks/gateways";

describe("DescadastrarNewsletter", () => {
  const previousSecret = process.env.NEWSLETTER_UNSUBSCRIBE_SECRET;

  beforeEach(() => {
    process.env.NEWSLETTER_UNSUBSCRIBE_SECRET = "teste-newsletter-secret";
  });

  afterEach(() => {
    if (previousSecret === undefined) {
      delete process.env.NEWSLETTER_UNSUBSCRIBE_SECRET;
    } else {
      process.env.NEWSLETTER_UNSUBSCRIBE_SECRET = previousSecret;
    }
  });

  function usuarioAssinado(overrides: Partial<ConstructorParameters<typeof Usuario>[0]> = {}) {
    return new Usuario({
      id: "user-1",
      nome: "Giovani",
      email: "giovani.murakami07@gmail.com",
      senha: "hash",
      newsletterMetagame: true,
      ...overrides,
    });
  }

  it("descadastra assinante e mascara o e-mail", async () => {
    const usuario = usuarioAssinado();
    const gateway = criarMockUsuarioGateway({
      buscarPorId: vi.fn().mockResolvedValue(usuario),
      atualizar: vi.fn().mockResolvedValue(undefined),
    });
    const uc = DescadastrarNewsletter.criar(gateway);
    const token = criarTokenDescadastroNewsletter("user-1");

    const resultado = await uc.executar({ token });

    expect(resultado).toEqual({
      ok: true,
      emailMascarado: "gi***@gmail.com",
      usuarioId: "user-1",
    });
    expect(usuario.newsletterMetagame).toBe(false);
    expect(gateway.atualizar).toHaveBeenCalledTimes(1);
  });

  it("é idempotente quando já está descadastrado", async () => {
    const usuario = usuarioAssinado({ newsletterMetagame: false });
    const gateway = criarMockUsuarioGateway({
      buscarPorId: vi.fn().mockResolvedValue(usuario),
    });
    const uc = DescadastrarNewsletter.criar(gateway);

    const resultado = await uc.executar({ token: criarTokenDescadastroNewsletter("user-1") });

    expect(resultado.ok).toBe(true);
    expect(gateway.atualizar).not.toHaveBeenCalled();
  });

  it("recupera de race EmailUsuarioJaExisteErro se o outro request já descadastrou", async () => {
    const usuario = usuarioAssinado();
    const aposRace = usuarioAssinado({ newsletterMetagame: false });
    const gateway = criarMockUsuarioGateway({
      buscarPorId: vi.fn()
        .mockResolvedValueOnce(usuario)
        .mockResolvedValueOnce(aposRace),
      atualizar: vi.fn().mockRejectedValueOnce(new EmailUsuarioJaExisteErro()),
    });
    const uc = DescadastrarNewsletter.criar(gateway);

    const resultado = await uc.executar({ token: criarTokenDescadastroNewsletter("user-1") });

    expect(resultado.ok).toBe(true);
    expect(resultado.usuarioId).toBe("user-1");
    expect(gateway.atualizar).toHaveBeenCalledTimes(1);
  });

  it("retenta atualizar após race se ainda estiver inscrito", async () => {
    const usuario = usuarioAssinado();
    const aindaInscrito = usuarioAssinado({ newsletterMetagame: true });
    const gateway = criarMockUsuarioGateway({
      buscarPorId: vi.fn()
        .mockResolvedValueOnce(usuario)
        .mockResolvedValueOnce(aindaInscrito),
      atualizar: vi.fn()
        .mockRejectedValueOnce(new EmailUsuarioJaExisteErro())
        .mockResolvedValueOnce(undefined),
    });
    const uc = DescadastrarNewsletter.criar(gateway);

    await uc.executar({ token: criarTokenDescadastroNewsletter("user-1") });

    expect(gateway.atualizar).toHaveBeenCalledTimes(2);
    expect(aindaInscrito.newsletterMetagame).toBe(false);
  });

  it("rejeita token inválido", async () => {
    const uc = DescadastrarNewsletter.criar(criarMockUsuarioGateway());
    await expect(uc.executar({ token: "token-invalido" })).rejects.toMatchObject({ status: 400 });
  });

  it("rejeita usuário inexistente ou excluído", async () => {
    const gateway = criarMockUsuarioGateway({
      buscarPorId: vi.fn().mockResolvedValue(usuarioAssinado({ excluido: true })),
    });
    const uc = DescadastrarNewsletter.criar(gateway);
    await expect(
      uc.executar({ token: criarTokenDescadastroNewsletter("user-1") }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
