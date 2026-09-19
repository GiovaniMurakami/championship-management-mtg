import {
  criarTokenDescadastroNewsletter,
  validarTokenDescadastroNewsletter,
} from "../../src/helpers/newsletterToken";

describe("newsletterToken", () => {
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

  it("gera token estável e valida o mesmo usuarioId", () => {
    const token = criarTokenDescadastroNewsletter("user-123");
    expect(token).toContain(".");
    expect(validarTokenDescadastroNewsletter(token)).toBe("user-123");
  });

  it("rejeita token adulterado ou incompleto", () => {
    const token = criarTokenDescadastroNewsletter("user-123");
    const [idPart] = token.split(".");
    expect(validarTokenDescadastroNewsletter(`${idPart}.assinatura-invalida`)).toBeNull();
    expect(validarTokenDescadastroNewsletter("")).toBeNull();
    expect(validarTokenDescadastroNewsletter("sem-ponto")).toBeNull();
  });
});
