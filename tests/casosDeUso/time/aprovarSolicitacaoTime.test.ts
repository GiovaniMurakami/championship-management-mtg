import { AprovarSolicitacaoTime } from "../../../src/casosDeUso/time/aprovarSolicitacaoTime";
import { criarMockTimeGateway, criarMockUsuarioGateway } from "../../mocks/gateways";
import { Time } from "../../../src/dominio/entidade/time";
import { Usuario } from "../../../src/dominio/entidade/usuario";

const timeBase = new Time({
    id: "time-1",
    nome: "Team Alpha",
    donoId: "dono-1",
    membroIds: ["dono-1"],
    solicitacoesPendentes: ["user-2"],
});

const userSolicitante = new Usuario({ id: "user-2", nome: "Bob", email: "b@b.com", senha: "hash" });

describe("AprovarSolicitacaoTime", () => {
    it("deve aprovar solicitação, adicionar membro e remover da lista pendente", async () => {
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeBase) });
        const usuarioGateway = criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(userSolicitante) });
        const uc = AprovarSolicitacaoTime.criar(timeGateway, usuarioGateway);

        const resultado = await uc.executar({ timeId: "time-1", requisitanteId: "dono-1", usuarioId: "user-2" });

        expect(resultado.membroIds).toContain("user-2");
        expect(resultado.usuario).toEqual({ id: "user-2", nome: "Bob" });
        expect(timeGateway.atualizar).toHaveBeenCalledTimes(1);
        expect(timeBase.solicitacoesPendentes).not.toContain("user-2");
    });

    it("deve lançar 404 se o time não existir", async () => {
        const timeGateway = criarMockTimeGateway();
        const usuarioGateway = criarMockUsuarioGateway();
        const uc = AprovarSolicitacaoTime.criar(timeGateway, usuarioGateway);

        await expect(
            uc.executar({ timeId: "nao-existe", requisitanteId: "dono-1", usuarioId: "user-2" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar 403 se o requisitante não for o dono", async () => {
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeBase) });
        const usuarioGateway = criarMockUsuarioGateway();
        const uc = AprovarSolicitacaoTime.criar(timeGateway, usuarioGateway);

        await expect(
            uc.executar({ timeId: "time-1", requisitanteId: "outro-user", usuarioId: "user-2" })
        ).rejects.toMatchObject({ status: 403 });
    });

    it("deve lançar 404 se a solicitação não existir na lista pendente", async () => {
        const timeSemSolicitacao = new Time({ ...timeBase, solicitacoesPendentes: [] });
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeSemSolicitacao) });
        const usuarioGateway = criarMockUsuarioGateway();
        const uc = AprovarSolicitacaoTime.criar(timeGateway, usuarioGateway);

        await expect(
            uc.executar({ timeId: "time-1", requisitanteId: "dono-1", usuarioId: "user-2" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar 404 se o usuário não existir no banco", async () => {
        const timeComSolicitacao = new Time({ ...timeBase, solicitacoesPendentes: ["user-2"] });
        const timeGateway = criarMockTimeGateway({ buscarPorId: jest.fn().mockResolvedValue(timeComSolicitacao) });
        const usuarioGateway = criarMockUsuarioGateway();
        const uc = AprovarSolicitacaoTime.criar(timeGateway, usuarioGateway);

        await expect(
            uc.executar({ timeId: "time-1", requisitanteId: "dono-1", usuarioId: "user-2" })
        ).rejects.toMatchObject({ status: 404 });
    });

    it("deve lançar 400 se o usuário já faz parte de outro time", async () => {
        const timeComSolicitacao = new Time({ ...timeBase, solicitacoesPendentes: ["user-2"] });
        const outroTime = new Time({ id: "time-99", nome: "Outro", donoId: "user-2", membroIds: ["user-2"] });
        const timeGateway = criarMockTimeGateway({
            buscarPorId: jest.fn().mockResolvedValue(timeComSolicitacao),
            buscarPorMembros: jest.fn().mockResolvedValue([outroTime]),
        });
        const usuarioGateway = criarMockUsuarioGateway({ buscarPorId: jest.fn().mockResolvedValue(userSolicitante) });
        const uc = AprovarSolicitacaoTime.criar(timeGateway, usuarioGateway);

        await expect(
            uc.executar({ timeId: "time-1", requisitanteId: "dono-1", usuarioId: "user-2" })
        ).rejects.toMatchObject({ status: 400 });
    });
});
