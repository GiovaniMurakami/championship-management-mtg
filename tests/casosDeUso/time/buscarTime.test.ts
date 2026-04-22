import { BuscarTime } from "../../../src/casosDeUso/time/buscarTime";
import { criarMockTimeGateway, criarMockUsuarioGateway } from "../../mocks/gateways";
import { Time } from "../../../src/dominio/entidade/time";
import { Usuario } from "../../../src/dominio/entidade/usuario";

const timeExistente = new Time({
    id: "time-1",
    nome: "Team Alpha",
    donoId: "user-1",
    membroIds: ["user-1", "user-2"],
    criadoEm: new Date(),
});

const usuarios = [
    new Usuario({ id: "user-1", nome: "Alice", email: "a@a.com", senha: "hash" }),
    new Usuario({ id: "user-2", nome: "Bob", email: "b@b.com", senha: "hash" }),
];

describe("BuscarTime", () => {
    it("deve retornar o time com membros resolvidos", async () => {
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeExistente) });
        const usuarioGateway = criarMockUsuarioGateway({ buscarVarios: jest.fn().mockResolvedValue(usuarios) });
        const uc = BuscarTime.criar(timeGateway, usuarioGateway);

        const resultado = await uc.executar({ id: "time-1" });

        expect(resultado.id).toBe("time-1");
        expect(resultado.membros).toHaveLength(2);
        expect(resultado.membros[0].nome).toBe("Alice");
    });

    it("deve lançar 404 se o time não existir", async () => {
        const timeGateway = criarMockTimeGateway();
        const usuarioGateway = criarMockUsuarioGateway();
        const uc = BuscarTime.criar(timeGateway, usuarioGateway);

        await expect(uc.executar({ id: "nao-existe" })).rejects.toMatchObject({ status: 404 });
    });
});
