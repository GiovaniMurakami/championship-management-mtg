import { ExcluirContaRota } from "../../../../../../src/infra/api/express/rotas/usuario/excluirConta.express.route";
import { ErroPersonalizado } from "../../../../../../src/helpers/error/ErroPersonalizado";
import { StatusErro } from "../../../../../../src/helpers/error/statusErro";

describe("ExcluirContaRota", () => {
    it("exclui conta autenticada", async () => {
        const resultado = { mensagem: "Conta excluída com sucesso." };
        const servico = { executar: jest.fn().mockResolvedValue(resultado) } as any;
        const rota = ExcluirContaRota.criar(servico);
        const response = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

        await rota.getHandler()(
            {
                usuario: { id: "u-1", role: "user" },
                body: { confirmacao: "Nome" },
            } as any,
            response,
            jest.fn(),
        );

        expect(servico.executar).toHaveBeenCalledWith({
            usuarioId: "u-1",
            confirmacao: "Nome",
        });
        expect(response.status).toHaveBeenCalledWith(200);
        expect(response.json).toHaveBeenCalledWith(resultado);
    });

    it("retorna 401 sem usuário autenticado", async () => {
        const servico = { executar: jest.fn() } as any;
        const rota = ExcluirContaRota.criar(servico);
        const response = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

        await rota.getHandler()({ body: { confirmacao: "X" } } as any, response, jest.fn());

        expect(servico.executar).not.toHaveBeenCalled();
        expect(response.status).toHaveBeenCalledWith(401);
    });

    it("propaga ErroPersonalizado do caso de uso", async () => {
        const servico = {
            executar: jest.fn().mockRejectedValue(
                ErroPersonalizado.criar({
                    mensagem: "Confirmação inválida.",
                    status: StatusErro.erroParametro,
                }),
            ),
        } as any;
        const rota = ExcluirContaRota.criar(servico);
        const response = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;

        await rota.getHandler()(
            {
                usuario: { id: "u-1" },
                body: { confirmacao: "errado" },
            } as any,
            response,
            jest.fn(),
        );

        expect(response.status).toHaveBeenCalledWith(400);
        expect(response.json).toHaveBeenCalledWith({
            mensagem: "Confirmação inválida.",
            erros: [],
        });
    });
});
