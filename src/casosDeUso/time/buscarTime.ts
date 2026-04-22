import { TimeGateway } from "../../dominio/gateway/timeGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type BuscarTimeInputDto = { id: string };

export type BuscarTimeOutputDto = {
    id: string;
    nome: string;
    descricao?: string;
    imagemUrl?: string;
    donoId: string;
    membros: Array<{ id: string; nome: string }>;
    solicitacoesPendentes: Array<{ id: string; nome: string }>;
    criadoEm: Date;
};

export class BuscarTime implements CasoDeUso<BuscarTimeInputDto, BuscarTimeOutputDto> {
    private constructor(
        private readonly timeGateway: TimeGateway,
        private readonly usuarioGateway: UsuarioGateway
    ) { }

    public static criar(timeGateway: TimeGateway, usuarioGateway: UsuarioGateway) {
        return new BuscarTime(timeGateway, usuarioGateway);
    }

    public async executar(input: BuscarTimeInputDto): Promise<BuscarTimeOutputDto> {
        const time = await this.timeGateway.buscarPorId(input.id);
        if (!time) {
            throw ErroPersonalizado.criar({
                mensagem: "Time não encontrado.",
                status: StatusErro.erroNaoEncontrado,
            });
        }

        const todosIds = Array.from(new Set([...time.membroIds, ...time.solicitacoesPendentes]));
        const usuarios = todosIds.length > 0
            ? await this.usuarioGateway.buscarVarios(todosIds)
            : [];
        const nomeMap = new Map(usuarios.map((u) => [u.id, u.nome]));

        return {
            id: time.id,
            nome: time.nome,
            descricao: time.descricao,
            imagemUrl: time.imagemUrl,
            donoId: time.donoId,
            membros: time.membroIds.map((id) => ({ id, nome: nomeMap.get(id) ?? id })),
            solicitacoesPendentes: time.solicitacoesPendentes.map((id) => ({ id, nome: nomeMap.get(id) ?? id })),
            criadoEm: time.criadoEm,
        };
    }
}
