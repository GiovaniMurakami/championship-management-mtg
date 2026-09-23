import { TimeGateway } from "../../dominio/gateway/timeGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { toUsuarioPublico } from "../../helpers/torneio/resolverNomeJogador";
import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { calcularEstatisticasTime, EstatisticasCompetitivas } from "../../helpers/time/calcularEstatisticasTime";

export type BuscarTimeInputDto = { id: string };

export type BuscarTimeOutputDto = {
    id: string;
    nome: string;
    descricao?: string;
    imagemUrl?: string;
    donoId: string;
    membros: Array<{ id: string; nome: string; excluido: boolean; estatisticas: EstatisticasCompetitivas }>;
    estatisticas: EstatisticasCompetitivas;
    solicitacoesPendentes: Array<{ id: string; nome: string; excluido: boolean }>;
    criadoEm: Date;
};

export class BuscarTime implements CasoDeUso<BuscarTimeInputDto, BuscarTimeOutputDto> {
    private constructor(
        private readonly timeGateway: TimeGateway,
        private readonly usuarioGateway: UsuarioGateway,
        private readonly inscricaoGateway: InscricaoGateway,
        private readonly partidaGateway: PartidaGateway,
    ) { }

    public static criar(timeGateway: TimeGateway, usuarioGateway: UsuarioGateway, inscricaoGateway: InscricaoGateway, partidaGateway: PartidaGateway) {
        return new BuscarTime(timeGateway, usuarioGateway, inscricaoGateway, partidaGateway);
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
        const usuarioMap = new Map(usuarios.map((u) => [u.id, u]));
        const estatisticas = await calcularEstatisticasTime(
            time.membroIds,
            this.inscricaoGateway,
            this.partidaGateway,
        );

        return {
            id: time.id,
            nome: time.nome,
            descricao: time.descricao,
            imagemUrl: time.imagemUrl,
            donoId: time.donoId,
            membros: time.membroIds.map((id) => ({
                ...toUsuarioPublico(usuarioMap.get(id), id),
                estatisticas: estatisticas.porMembro.get(id)!,
            })),
            estatisticas: estatisticas.time,
            solicitacoesPendentes: time.solicitacoesPendentes.map((id) =>
                toUsuarioPublico(usuarioMap.get(id), id),
            ),
            criadoEm: time.criadoEm,
        };
    }
}
