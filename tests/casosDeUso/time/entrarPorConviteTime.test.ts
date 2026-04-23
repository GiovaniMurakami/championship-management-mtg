import { EntrarPorConviteTime } from "../../../src/casosDeUso/time/entrarPorConviteTime";
import { criarMockTimeGateway, criarMockUsuarioGateway } from "../../mocks/gateways";
import { Time } from "../../../src/dominio/entidade/time";
import { Usuario } from "../../../src/dominio/entidade/usuario";

const timeComConvite = new Time({
    id: "time-1",
    nome: "Team Alpha",
    donoId: "dono-1",
    membroIds: ["dono-1"],
    conviteToken: "token-valido",
});

const user2 = new Usuario({ id: "user-2", nome: "Bob", email: "b@b.com", senha: "hash" });

describe("EntrarPorConviteTime", () => {
    it("deve adicionar membro ao time e invalidar o token de convite", async () => {
        const timeGateway = criarMockTimeGateway({ buscarPorConviteToken: jest.fn().mockResolvedValue(timeComConvite) });
        const usuarioGateway = criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(user2) });
        const uc = EntrarPorConviteTime.criar(timeGateway, usuarioGateway);

        const resultado = await uc.executar({ conviteToken: "token-valido", usuarioId: "user-2" });

        expect(resultado.membroIds).toContain("user-2");
        expect(resultado.timeNome).toBe("Team Alpha");
        expect(resultado.usuario).toEqual({ id: "user-2", nome: "Bob" });
        expect(timeComConvite.conviteToken).toBeUndefined();
        expect(timeGateway.atualizar).toHaveBeenCalledTimes(1);
    });

    it("deve lançar 404 se o token for inválido ou expirado", async () => {
        const timeGateway = criarMockTimeGateway();
        const usuarioGateway = criarMockUsuarioGateway();
        const uc = EntrarPorConviteTime.criar(timeGateway, usuarioGateway);

        await expect(
            uc.executar({ conviteToken: "token-invalido", usuarioId: "user-2" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar 400 se o usuário já for membro do time", async () => {
        const timeComMembro = new Time({ ...timeComConvite, membroIds: ["dono-1", "user-2"], conviteToken: "token-valido" });
        const timeGateway = criarMockTimeGateway({ buscarPorConviteToken: jest.fn().mockResolvedValue(timeComMembro) });
        const usuarioGateway = criarMockUsuarioGateway();
        const uc = EntrarPorConviteTime.criar(timeGateway, usuarioGateway);

        await expect(
            uc.executar({ conviteToken: "token-valido", usuarioId: "user-2" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 400 se o usuário já fizer parte de outro time", async () => {
        const outroTime = new Time({ id: "time-99", nome: "Outro", donoId: "user-2", membroIds: ["user-2"] });
        const timeGateway = criarMockTimeGateway({
            buscarPorConviteToken: jest.fn().mockResolvedValue(timeComConvite),
            buscarPorMembros: jest.fn().mockResolvedValue([outroTime]),
        });
        const usuarioGateway = criarMockUsuarioGateway();
        const uc = EntrarPorConviteTime.criar(timeGateway, usuarioGateway);

        await expect(
            uc.executar({ conviteToken: "token-valido", usuarioId: "user-2" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 404 se o usuário não existir", async () => {
        const timeGateway = criarMockTimeGateway({ buscarPorConviteToken: jest.fn().mockResolvedValue(timeComConvite) });
        const usuarioGateway = criarMockUsuarioGateway();
        const uc = EntrarPorConviteTime.criar(timeGateway, usuarioGateway);

        await expect(
            uc.executar({ conviteToken: "token-valido", usuarioId: "nao-existe" })
        ).rejects.toMatchObject({ status: 404 });
    });
});
