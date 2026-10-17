vi.mock("../../../../../../src/helpers/env", async () => {
  const actual = await vi.importActual<typeof import("../../../../../../src/helpers/env")>(
    "../../../../../../src/helpers/env",
  );
  return {
    ...actual,
    getS3BaseUrl: () => "https://bucket.s3.amazonaws.com",
  };
});

import {
  AtualizarHallTop8Rota,
  CadastrarHallTop8Rota,
  ExcluirHallTop8Rota,
  ListarHallTop8Rota,
} from "../../../../../../src/infra/api/express/rotas/hall/hallTop8.express.route";
import { ErroPersonalizado } from "../../../../../../src/helpers/error/ErroPersonalizado";
import { StatusErro } from "../../../../../../src/helpers/error/statusErro";

function makeReqRes(
  overrides: {
    body?: Record<string, unknown>;
    params?: Record<string, string>;
    queryValidados?: Record<string, unknown>;
  } = {},
) {
  const req = {
    body: overrides.body || {},
    params: overrides.params || {},
    queryValidados: overrides.queryValidados || { limite: 24, offset: 0 },
  } as any;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as any;
  const next = vi.fn();
  return { req, res, next };
}

describe("Hall da Fama rotas Express", () => {
  it("GET lista itens", async () => {
    const caso = {
      executar: vi.fn().mockResolvedValue({ itens: [], total: 0, limite: 24, offset: 0 }),
    };
    const rota = ListarHallTop8Rota.criar(caso as never);
    const { req, res, next } = makeReqRes({
      queryValidados: { limite: 10, offset: 0, incluirInativos: false },
    });

    await rota.getHandler()(req, res, next);

    expect(caso.executar).toHaveBeenCalledWith({
      limite: 10,
      offset: 0,
      incluirInativos: false,
    });
    expect(res.json).toHaveBeenCalledWith({ itens: [], total: 0, limite: 24, offset: 0 });
  });

  it("GET só inclui inativos para admin autenticado", async () => {
    const caso = {
      executar: vi.fn().mockResolvedValue({ itens: [], total: 0, limite: 24, offset: 0 }),
    };
    const rota = ListarHallTop8Rota.criar(caso as never);

    const anon = makeReqRes({
      queryValidados: { limite: 10, offset: 0, incluirInativos: true },
    });
    await rota.getHandler()(anon.req, anon.res, anon.next);
    expect(caso.executar).toHaveBeenCalledWith({
      limite: 10,
      offset: 0,
      incluirInativos: false,
    });

    caso.executar.mockClear();
    const admin = makeReqRes({
      queryValidados: { limite: 10, offset: 0, incluirInativos: true },
    });
    admin.req.usuario = { id: "a", email: "a@b.c", nome: "Admin", role: "admin" };
    await rota.getHandler()(admin.req, admin.res, admin.next);
    expect(caso.executar).toHaveBeenCalledWith({
      limite: 10,
      offset: 0,
      incluirInativos: true,
    });
  });

  it("POST cadastra e retorna 201", async () => {
    const caso = {
      executar: vi.fn().mockResolvedValue({
        id: "550e8400-e29b-41d4-a716-446655440011",
        torneioId: "550e8400-e29b-41d4-a716-446655440010",
        imagemUrl: "https://bucket.s3.amazonaws.com/imagens/top8.webp",
      }),
    };
    const rota = CadastrarHallTop8Rota.criar(caso as never);
    const { req, res, next } = makeReqRes({
      body: {
        torneioId: "550e8400-e29b-41d4-a716-446655440010",
        imagemUrl: "https://bucket.s3.amazonaws.com/imagens/top8.webp",
        torneioNome: "Champ",
      },
    });

    await rota.getHandler()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(caso.executar).toHaveBeenCalledWith(
      expect.objectContaining({
        torneioId: "550e8400-e29b-41d4-a716-446655440010",
        imagemUrl: "https://bucket.s3.amazonaws.com/imagens/top8.webp",
      }),
    );
  });

  it("POST rejeita body inválido", async () => {
    const caso = { executar: vi.fn() };
    const rota = CadastrarHallTop8Rota.criar(caso as never);
    const { req, res, next } = makeReqRes({ body: { torneioId: "x" } });

    await rota.getHandler()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(caso.executar).not.toHaveBeenCalled();
  });

  it("PATCH atualiza dataTorneio", async () => {
    const caso = {
      executar: vi.fn().mockResolvedValue({
        id: "550e8400-e29b-41d4-a716-446655440011",
        ativo: true,
        dataTorneio: "2026-10-05T20:00:00.000-03:00",
      }),
    };
    const rota = AtualizarHallTop8Rota.criar(caso as never);
    const { req, res, next } = makeReqRes({
      params: { id: "550e8400-e29b-41d4-a716-446655440011" },
      body: { dataTorneio: "2026-10-05T20:00:00.000Z" },
    });

    await rota.getHandler()(req, res, next);

    expect(caso.executar).toHaveBeenCalledWith({
      id: "550e8400-e29b-41d4-a716-446655440011",
      dataTorneio: "2026-10-05T20:00:00.000Z",
    });
    expect(res.json).toHaveBeenCalled();
  });

  it("DELETE propaga ErroPersonalizado", async () => {
    const caso = {
      executar: vi.fn().mockRejectedValue(
        ErroPersonalizado.criar({
          mensagem: "Item do Hall da Fama não encontrado.",
          status: StatusErro.erroNaoEncontrado,
        }),
      ),
    };
    const rota = ExcluirHallTop8Rota.criar(caso as never);
    const { req, res, next } = makeReqRes({
      params: { id: "550e8400-e29b-41d4-a716-446655440011" },
    });

    await rota.getHandler()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ mensagem: "Item do Hall da Fama não encontrado." }),
    );
  });
});
