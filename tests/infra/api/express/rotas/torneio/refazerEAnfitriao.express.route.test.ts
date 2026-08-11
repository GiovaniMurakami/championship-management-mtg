import { DefinirAnfitriaoTorneioRota } from "../../../../../../src/infra/api/express/rotas/torneio/definirAnfitriaoTorneio.express.route";
import { RefazerRodadaRota } from "../../../../../../src/infra/api/express/rotas/torneio/refazerRodada.express.route";
import { ListarUsuariosRota } from "../../../../../../src/infra/api/express/rotas/usuario/listarUsuarios.express.route";
import { ErroPersonalizado } from "../../../../../../src/helpers/error/ErroPersonalizado";
import { StatusErro } from "../../../../../../src/helpers/error/statusErro";
import { eventosTorneio } from "../../../../../../src/infra/socketio/eventosTorneio";

describe("DefinirAnfitriaoTorneioRota", () => {
    it("define anfitrião e responde 200", async () => {
        const resultado = {
            id: "550e8400-e29b-41d4-a716-446655440000",
            anfitriaoId: "550e8400-e29b-41d4-a716-446655440001",
            anfitriao: {
                id: "550e8400-e29b-41d4-a716-446655440001",
                nome: "Host",
                email: "h@test.com",
            },
        };
        const servico = { executar: jest.fn().mockResolvedValue(resultado) } as any;
        const rota = DefinirAnfitriaoTorneioRota.criar(servico);
        const response = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

        await rota.getHandler()(
            {
                params: { torneioId: resultado.id },
                body: { anfitriaoId: resultado.anfitriaoId },
            } as any,
            response,
            jest.fn(),
        );

        expect(servico.executar).toHaveBeenCalledWith({
            torneioId: resultado.id,
            anfitriaoId: resultado.anfitriaoId,
        });
        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.json).toHaveBeenCalledWith(resultado);
    });

    it("propaga ErroPersonalizado", async () => {
        const servico = {
            executar: jest.fn().mockRejectedValue(
                ErroPersonalizado.criar({
                    mensagem: "Torneio não encontrado.",
                    status: StatusErro.erroNaoEncontrado,
                }),
            ),
        } as any;
        const rota = DefinirAnfitriaoTorneioRota.criar(servico);
        const response = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

        await rota.getHandler()(
            {
                params: { torneioId: "550e8400-e29b-41d4-a716-446655440000" },
                body: { anfitriaoId: null },
            } as any,
            response,
            jest.fn(),
        );

        expect(response.status).toHaveBeenCalledWith(404);
        expect(response.json).toHaveBeenCalledWith({
            mensagem: "Torneio não encontrado.",
            erros: [],
        });
    });
});

describe("RefazerRodadaRota", () => {
    it("emite rodada_refeita ao refazer", async () => {
        const resultado = {
            rodadaAtual: 2,
            rodadaRemovida: 3,
            partidasRemovidas: 4,
            emCorte: false,
            totalRodadas: 5,
        };
        const torneioId = "550e8400-e29b-41d4-a716-446655440000";
        const servico = { executar: jest.fn().mockResolvedValue(resultado) } as any;
        const rota = RefazerRodadaRota.criar(servico);
        const emitSpy = jest.spyOn(eventosTorneio, "emit");
        const response = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

        await rota.getHandler()(
            {
                usuario: { id: "dono-1", role: "user" },
                params: { torneioId },
            } as any,
            response,
            jest.fn(),
        );

        expect(servico.executar).toHaveBeenCalledWith({
            torneioId,
            donoId: "dono-1",
            isAdmin: false,
        });
        expect(emitSpy).toHaveBeenCalledWith("rodada_refeita", { torneioId, ...resultado });
        expect(response.status).toHaveBeenCalledWith(200);
        emitSpy.mockRestore();
    });

    it("marca isAdmin quando role=admin", async () => {
        const servico = {
            executar: jest.fn().mockResolvedValue({
                rodadaAtual: 1,
                rodadaRemovida: 2,
                partidasRemovidas: 1,
                emCorte: false,
                totalRodadas: 3,
            }),
        } as any;
        const rota = RefazerRodadaRota.criar(servico);
        const response = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

        await rota.getHandler()(
            {
                usuario: { id: "admin", role: "admin" },
                params: { torneioId: "550e8400-e29b-41d4-a716-446655440000" },
            } as any,
            response,
            jest.fn(),
        );

        expect(servico.executar).toHaveBeenCalledWith(
            expect.objectContaining({ isAdmin: true }),
        );
    });
});

describe("ListarUsuariosRota", () => {
    it("lista usuários com query validada", async () => {
        const resultado = {
            usuarios: [],
            total: 0,
            limite: 10,
            offset: 0,
        };
        const servico = { executar: jest.fn().mockResolvedValue(resultado) } as any;
        const rota = ListarUsuariosRota.criar(servico);
        const response = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

        await rota.getHandler()(
            {
                queryValidados: {
                    nome: "alice",
                    bloqueadoTorneios: true,
                    limite: 10,
                    offset: 0,
                },
            } as any,
            response,
            jest.fn(),
        );

        expect(servico.executar).toHaveBeenCalledWith({
            nome: "alice",
            bloqueadoTorneios: true,
            limite: 10,
            offset: 0,
        });
        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.json).toHaveBeenCalledWith(resultado);
    });
});
