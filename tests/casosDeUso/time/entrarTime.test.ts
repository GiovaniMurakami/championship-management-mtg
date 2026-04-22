import { EntrarTime } from "../../../src/casosDeUso/time/entrarTime";
import { criarMockTimeGateway, criarMockUsuarioGateway } from "../../mocks/gateways";
import { Time } from "../../../src/dominio/entidade/time";
import { Usuario } from "../../../src/dominio/entidade/usuario";

const timeExistente = new Time({
    id: "time-1",
    nome: "Team Alpha",
    donoId: "user-1",
    membroIds: ["user-1"],
    criadoEm: new Date(),
});

const user2 = new Usuario({ id: "user-2", nome: "Bob", email: "b@b.com", senha: "hash" });

describe("EntrarTime", () => {
    it("deve adicionar um novo membro ao time", async () => {
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeExistente) });
        const usuarioGateway = criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(user2) });
        const uc = EntrarTime.criar(timeGateway, usuarioGateway);

        const resultado = await uc.executar({ timeId: "time-1", usuarioId: "user-2" });

        expect(resultado.membroIds).toContain("user-2");
        expect(resultado.usuario.nome).toBe("Bob");
        expect(timeGateway.atualizar).toHaveBeenCalledTimes(1);
    });

    it("deve lançar 400 se o usuário já for membro", async () => {
        const timeComUser1 = new Time({ ...timeExistente, membroIds: ["user-1"] });
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeComUser1) });
        const usuarioGateway = criarMockUsuarioGateway();
        const uc = EntrarTime.criar(timeGateway, usuarioGateway);

        await expect(
            uc.executar({ timeId: "time-1", usuarioId: "user-1" })
        ).rejects.toMatchObject({ status: 400 });
    });

    it("deve lançar 404 se o time não existir", async () => {
        const timeGateway = criarMockTimeGateway();
        const usuarioGateway = criarMockUsuarioGateway();
        const uc = EntrarTime.criar(timeGateway, usuarioGateway);

        await expect(
            uc.executar({ timeId: "nao-existe", usuarioId: "user-2" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar 404 se o usuário não existir", async () => {
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeExistente) });
        const usuarioGateway = criarMockUsuarioGateway();
        const uc = EntrarTime.criar(timeGateway, usuarioGateway);

        await expect(
            uc.executar({ timeId: "time-1", usuarioId: "user-inexistente" })
        ).rejects.toMatchObject({ status: 404 });
    });
});
