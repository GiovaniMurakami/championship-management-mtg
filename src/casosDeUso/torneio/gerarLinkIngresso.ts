import { v4 as uuidv4 } from "uuid";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { LinkIngressoGateway } from "../../dominio/gateway/linkIngressoGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";

export type GerarLinkIngressoInputDto = {
    torneioId: string;
    requisitanteId: string;
    isAdmin: boolean;
    /** Validade do token em horas. Padrão: 24h. */
    validadeHoras?: number;
};

export type GerarLinkIngressoOutputDto = {
    token: string;
    torneioId: string;
    expiresAt: Date;
};

export class GerarLinkIngresso
    implements CasoDeUso<GerarLinkIngressoInputDto, GerarLinkIngressoOutputDto> {
    private constructor(
        private readonly torneioGateway: TorneioGateway,
        private readonly linkIngressoGateway: LinkIngressoGateway
    ) { }

    public static criar(
        torneioGateway: TorneioGateway,
        linkIngressoGateway: LinkIngressoGateway
    ) {
        return new GerarLinkIngresso(torneioGateway, linkIngressoGateway);
    }

    public async executar(
        input: GerarLinkIngressoInputDto
    ): Promise<GerarLinkIngressoOutputDto> {
        const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
        if (!torneio) {
            throw ErroPersonalizado.criar({
                mensagem: "Torneio não encontrado.",
                status: StatusErro.erroNaoEncontrado,
            });
        }

        if (torneio.status !== "em_andamento") {
            throw ErroPersonalizado.criar({
                mensagem: "Só é possível gerar link de ingresso para torneios em andamento.",
                status: StatusErro.erroParametro,
            });
        }

        const ehDono = torneio.donoId === input.requisitanteId;
        if (!ehDono && !input.isAdmin) {
            throw ErroPersonalizado.criar({
                mensagem: "Apenas o dono do torneio ou um administrador podem gerar links de ingresso.",
                status: StatusErro.erroProibido,
            });
        }

        const validadeHoras = input.validadeHoras ?? 24;
        const expiresAt = new Date(Date.now() + validadeHoras * 60 * 60 * 1000);
        const token = uuidv4();

        await this.linkIngressoGateway.salvar({
            token,
            torneioId: input.torneioId,
            criadoPorId: input.requisitanteId,
            expiresAt,
        });

        return { token, torneioId: input.torneioId, expiresAt };
    }
}
