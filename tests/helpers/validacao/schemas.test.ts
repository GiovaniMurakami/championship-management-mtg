import {
    cadastrarUsuarioSchema,
    loginUsuarioSchema,
    atualizarUsuarioSchema,
    refreshTokenSchema,
    cadastrarDeckSchema,
    atualizarDeckSchema,
    criarTorneioSchema,
    alterarTorneioSchema,
    escolherDeckTorneioSchema,
    registrarResultadoSchema,
    droparJogadorSchema,
    criarLigaSchema,
    alterarLigaSchema,
    criarTimeSchema,
    alterarTimeSchema,
    gerarUrlUploadImagemSchema,
    listarLigasQuerySchema,
    listarTimesQuerySchema,
    rankingLigaQuerySchema,
    ingressarViaTorneioSchema,
    gerarLinkIngressoSchema,
    inscreverTorneioSchema,
    definirAnfitriaoTorneioSchema,
    listarUsuariosQuerySchema,
} from "../../../src/helpers/validacao/schemas";

const UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("schemas de validacao", () => {
    describe("cadastrarUsuarioSchema", () => {
        it("aceita dados validos", () => {
            expect(() => cadastrarUsuarioSchema.parse({ nome: "Alice", email: "a@a.com", senha: "senha123" })).not.toThrow();
        });
        it("rejeita e-mail invalido", () => {
            expect(cadastrarUsuarioSchema.safeParse({ nome: "A", email: "nao-email", senha: "12345678" }).success).toBe(false);
        });
        it("rejeita senha menor que 8 caracteres", () => {
            expect(cadastrarUsuarioSchema.safeParse({ nome: "A", email: "a@a.com", senha: "1234" }).success).toBe(false);
        });
    });

    describe("loginUsuarioSchema", () => {
        it("aceita dados validos", () => {
            expect(() => loginUsuarioSchema.parse({ email: "a@a.com", senha: "123" })).not.toThrow();
        });
        it("rejeita quando email e vazio", () => {
            expect(loginUsuarioSchema.safeParse({ email: "", senha: "123" }).success).toBe(false);
        });
    });

    describe("atualizarUsuarioSchema", () => {
        it("aceita todos os campos opcionais", () => {
            expect(() => atualizarUsuarioSchema.parse({ nome: "Bob", telefone: "11999", nickMTGO: "bob", nickArena: "bob#123" })).not.toThrow();
        });
        it("aceita objeto vazio", () => {
            expect(() => atualizarUsuarioSchema.parse({})).not.toThrow();
        });
    });

    describe("refreshTokenSchema", () => {
        it("aceita token valido", () => {
            expect(() => refreshTokenSchema.parse({ refreshToken: "token-abc" })).not.toThrow();
        });
        it("rejeita token vazio", () => {
            expect(refreshTokenSchema.safeParse({ refreshToken: "" }).success).toBe(false);
        });
    });

    describe("cadastrarDeckSchema", () => {
        const carta = { nome: "Lightning Bolt", quantidade: 4 };

        it("aceita deck valido", () => {
            expect(() => cadastrarDeckSchema.parse({ nome: "Burn", formato: "Modern", maindeck: [carta] })).not.toThrow();
        });

        it("exige linkLigaMagic quando formato e commander500", () => {
            expect(cadastrarDeckSchema.safeParse({
                nome: "C500",
                formato: "commander500",
                maindeck: [carta],
                commander: [{ nome: "Atraxa", quantidade: 1 }],
            }).success).toBe(false);
        });

        it("aceita linkLigaMagic valido em commander500", () => {
            expect(() => cadastrarDeckSchema.parse({
                nome: "C500",
                formato: "commander500",
                linkLigaMagic: "https://www.ligamagic.com.br/?view=dks/deck&id=123456",
                maindeck: [carta],
                commander: [{ nome: "Atraxa", quantidade: 1 }],
            })).not.toThrow();
        });

        it("rejeita maindeck vazio", () => {
            expect(cadastrarDeckSchema.safeParse({ nome: "Burn", formato: "Modern", maindeck: [] }).success).toBe(false);
        });

        it("usa sideboard vazio como padrao", () => {
            const r = cadastrarDeckSchema.parse({ nome: "Burn", formato: "Modern", maindeck: [carta] });
            expect(r.sideboard).toEqual([]);
        });

        it("aceita commander ausente, null ou array", () => {
            expect(cadastrarDeckSchema.parse({ nome: "Burn", formato: "Modern", maindeck: [carta] }).commander).toBeUndefined();
            expect(cadastrarDeckSchema.parse({ nome: "Burn", formato: "Modern", maindeck: [carta], commander: null }).commander).toBeNull();
            expect(cadastrarDeckSchema.parse({
                nome: "Atraxa",
                formato: "Commander",
                maindeck: [carta],
                commander: [{ nome: "Atraxa", quantidade: 1 }],
            }).commander).toHaveLength(1);
        });
    });

    describe("atualizarDeckSchema", () => {
        it("aceita objeto vazio", () => {
            expect(() => atualizarDeckSchema.parse({})).not.toThrow();
        });
        it("aceita commander null para limpeza explicita", () => {
            expect(() => atualizarDeckSchema.parse({ commander: null })).not.toThrow();
        });
        it("rejeita linkLigaMagic invalido quando informado", () => {
            expect(atualizarDeckSchema.safeParse({ linkLigaMagic: "nao-url" }).success).toBe(false);
        });
    });

    describe("criarTorneioSchema (s3ImagemUrl)", () => {
        it("rejeita bannerUrl que nao pertence ao bucket S3 configurado", () => {
            process.env.AWS_S3_BUCKET = "meu-bucket";
            process.env.AWS_S3_REGION = "us-east-1";
            const result = criarTorneioSchema.safeParse({
                nome: "T", horario: "h", formato: "f",
                bannerUrl: "https://outro-bucket.s3.us-east-1.amazonaws.com/img.png",
            });
            expect(result.success).toBe(false);
            delete process.env.AWS_S3_BUCKET;
            delete process.env.AWS_S3_REGION;
        });

        it("aceita bannerUrl que pertence ao bucket S3 configurado", () => {
            process.env.AWS_S3_BUCKET = "meu-bucket";
            process.env.AWS_S3_REGION = "us-east-1";
            expect(() => criarTorneioSchema.parse({
                nome: "T", horario: "h", formato: "f",
                bannerUrl: "https://meu-bucket.s3.us-east-1.amazonaws.com/img.png",
            })).not.toThrow();
            delete process.env.AWS_S3_BUCKET;
            delete process.env.AWS_S3_REGION;
        });
    });

    describe("criarTorneioSchema", () => {
        it("aceita campos obrigatorios", () => {
            expect(() => criarTorneioSchema.parse({ nome: "T", horario: "2025-01-01", formato: "Standard" })).not.toThrow();
        });
        it("rejeita quando nome e vazio", () => {
            expect(criarTorneioSchema.safeParse({ nome: "", horario: "h", formato: "f" }).success).toBe(false);
        });
        it("aceita exibirNomeJogador valido", () => {
            expect(() => criarTorneioSchema.parse({ nome: "T", horario: "h", formato: "f", exibirNomeJogador: "nome" })).not.toThrow();
        });
        it("rejeita exibirNomeJogador invalido", () => {
            expect(criarTorneioSchema.safeParse({ nome: "T", horario: "h", formato: "f", exibirNomeJogador: "invalido" }).success).toBe(false);
        });
    });

    describe("alterarTorneioSchema", () => {
        it("aceita campos nulos para limpar valores", () => {
            const r = alterarTorneioSchema.parse({ maxJogadores: null, maxRodadas: null, corteTop: null });
            expect(r.maxJogadores).toBeUndefined();
            expect(r.maxRodadas).toBeUndefined();
            expect(r.corteTop).toBeUndefined();
        });
        it("aceita objeto vazio", () => {
            expect(() => alterarTorneioSchema.parse({})).not.toThrow();
        });
    });

    describe("escolherDeckTorneioSchema", () => {
        it("aceita deckId valido", () => {
            expect(() => escolherDeckTorneioSchema.parse({ deckId: UUID })).not.toThrow();
        });
        it("rejeita deckId invalido", () => {
            expect(escolherDeckTorneioSchema.safeParse({ deckId: "d-1" }).success).toBe(false);
        });
    });

    describe("registrarResultadoSchema", () => {
        it("aceita resultado valido", () => {
            expect(() => registrarResultadoSchema.parse({ vitoriasJogador1: 2, vitoriasJogador2: 1 })).not.toThrow();
        });
        it("rejeita valores negativos", () => {
            expect(registrarResultadoSchema.safeParse({ vitoriasJogador1: -1, vitoriasJogador2: 0 }).success).toBe(false);
        });
    });

    describe("droparJogadorSchema", () => {
        it("aceita objeto vazio", () => {
            expect(() => droparJogadorSchema.parse({})).not.toThrow();
        });
        it("aceita jogadorId informado", () => {
            expect(() => droparJogadorSchema.parse({ jogadorId: UUID })).not.toThrow();
        });
        it("rejeita jogadorId invalido", () => {
            expect(droparJogadorSchema.safeParse({ jogadorId: "u-1" }).success).toBe(false);
        });
    });

    describe("criarLigaSchema", () => {
        it("aceita campos obrigatorios", () => {
            expect(() => criarLigaSchema.parse({ nome: "Liga" })).not.toThrow();
        });
        it("aceita tipo times", () => {
            expect(() => criarLigaSchema.parse({ nome: "Liga", tipo: "times" })).not.toThrow();
        });
        it("rejeita tipo invalido", () => {
            expect(criarLigaSchema.safeParse({ nome: "Liga", tipo: "invalido" }).success).toBe(false);
        });
    });

    describe("alterarLigaSchema", () => {
        it("aceita objeto vazio", () => {
            expect(() => alterarLigaSchema.parse({})).not.toThrow();
        });
    });

    describe("criarTimeSchema", () => {
        it("aceita nome valido", () => {
            expect(() => criarTimeSchema.parse({ nome: "Team Alpha" })).not.toThrow();
        });
        it("rejeita nome vazio", () => {
            expect(criarTimeSchema.safeParse({ nome: "" }).success).toBe(false);
        });
        it("rejeita imagemUrl invalida", () => {
            expect(criarTimeSchema.safeParse({ nome: "T", imagemUrl: "nao-url" }).success).toBe(false);
        });
        it("aceita imagemUrl valida", () => {
            expect(() => criarTimeSchema.parse({ nome: "T", imagemUrl: "https://example.com/img.png" })).not.toThrow();
        });
    });

    describe("alterarTimeSchema", () => {
        it("aceita objeto vazio", () => {
            expect(() => alterarTimeSchema.parse({})).not.toThrow();
        });
    });

    describe("gerarUrlUploadImagemSchema", () => {
        it("aceita image/jpeg com tamanho valido", () => {
            expect(() => gerarUrlUploadImagemSchema.parse({ contentType: "image/jpeg", tamanhoBytes: 1024 })).not.toThrow();
        });
        it("rejeita contentType invalido", () => {
            expect(gerarUrlUploadImagemSchema.safeParse({ contentType: "image/bmp", tamanhoBytes: 100 }).success).toBe(false);
        });
        it("rejeita tamanho acima de 5MB", () => {
            expect(gerarUrlUploadImagemSchema.safeParse({ contentType: "image/png", tamanhoBytes: 6 * 1024 * 1024 }).success).toBe(false);
        });
        it("rejeita tamanho zero", () => {
            expect(gerarUrlUploadImagemSchema.safeParse({ contentType: "image/png", tamanhoBytes: 0 }).success).toBe(false);
        });
        it("aceita todos os content types suportados", () => {
            for (const ct of ["image/jpeg", "image/png", "image/gif", "image/webp"] as const) {
                expect(() => gerarUrlUploadImagemSchema.parse({ contentType: ct, tamanhoBytes: 100 })).not.toThrow();
            }
        });
    });

    describe("ingressarViaTorneioSchema", () => {
        it("exige deckId UUID", () => {
            expect(() => ingressarViaTorneioSchema.parse({ deckId: UUID })).not.toThrow();
            expect(ingressarViaTorneioSchema.safeParse({}).success).toBe(false);
        });
    });

    describe("gerarLinkIngressoSchema", () => {
        it("aceita body vazio ou validadeHoras", () => {
            expect(() => gerarLinkIngressoSchema.parse({})).not.toThrow();
            expect(() => gerarLinkIngressoSchema.parse({ validadeHoras: 12 })).not.toThrow();
        });
        it("rejeita validadeHoras fora do intervalo", () => {
            expect(gerarLinkIngressoSchema.safeParse({ validadeHoras: 0 }).success).toBe(false);
            expect(gerarLinkIngressoSchema.safeParse({ validadeHoras: 200 }).success).toBe(false);
        });
    });

    describe("inscreverTorneioSchema", () => {
        it("aceita body vazio ou timeId opcional", () => {
            expect(() => inscreverTorneioSchema.parse({})).not.toThrow();
            expect(() => inscreverTorneioSchema.parse({ timeId: UUID })).not.toThrow();
        });
    });

    describe("listarLigasQuerySchema", () => {
        it("aceita filtros e paginacao", () => {
            expect(() => listarLigasQuerySchema.parse({ nome: "Liga", tipo: "times", limite: "20", offset: "0" })).not.toThrow();
        });
    });

    describe("rankingLigaQuerySchema", () => {
        it("aplica default de 10 nos limites", () => {
            const parsed = rankingLigaQuerySchema.parse({});
            expect(parsed.limiteJogadores).toBe(10);
            expect(parsed.limiteTimes).toBe(10);
        });
    });

    describe("definirAnfitriaoTorneioSchema", () => {
        it("aceita anfitriaoId UUID ou null", () => {
            expect(() => definirAnfitriaoTorneioSchema.parse({ anfitriaoId: UUID })).not.toThrow();
            expect(() => definirAnfitriaoTorneioSchema.parse({ anfitriaoId: null })).not.toThrow();
        });
    });

    describe("s3ImagemUrl sem base configurada", () => {
        afterEach(() => {
            jest.dontMock("../../../src/helpers/env");
            jest.resetModules();
        });

        it("aceita qualquer URL quando getS3BaseUrl retorna vazio", () => {
            jest.resetModules();
            jest.doMock("../../../src/helpers/env", () => ({
                getS3BaseUrl: () => "",
            }));
            const schemas = require("../../../src/helpers/validacao/schemas") as typeof import("../../../src/helpers/validacao/schemas");

            expect(() => schemas.criarTorneioSchema.parse({
                nome: "T",
                horario: "h",
                formato: "f",
                bannerUrl: "https://qualquer-cdn.example.com/img.png",
            })).not.toThrow();
        });
    });
});
