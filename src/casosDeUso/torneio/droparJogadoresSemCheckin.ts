import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { podeGerenciarTorneio } from "../../helpers/torneio/podeGerenciarTorneio";
import { DroparJogador, DroparJogadorOutputDto } from "./droparJogador";

export type DroparJogadoresSemCheckinInputDto = {
  torneioId: string;
  requisitanteId: string;
  isAdmin: boolean;
};

export type DroparJogadoresSemCheckinOutputDto = {
  totalDropados: number;
  jogadores: DroparJogadorOutputDto["jogador"][];
};

export class DroparJogadoresSemCheckin
  implements CasoDeUso<DroparJogadoresSemCheckinInputDto, DroparJogadoresSemCheckinOutputDto> {
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly inscricaoGateway: InscricaoGateway,
    private readonly droparJogador: DroparJogador,
  ) {}

  public static criar(
    torneioGateway: TorneioGateway,
    inscricaoGateway: InscricaoGateway,
    droparJogador: DroparJogador,
  ) {
    return new DroparJogadoresSemCheckin(torneioGateway, inscricaoGateway, droparJogador);
  }

  public async executar(input: DroparJogadoresSemCheckinInputDto): Promise<DroparJogadoresSemCheckinOutputDto> {
    const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
    if (!torneio) {
      throw ErroPersonalizado.criar({ mensagem: "Torneio não encontrado.", status: StatusErro.erroNaoEncontrado });
    }
    if (!podeGerenciarTorneio(torneio, input.requisitanteId, input.isAdmin)) {
      throw ErroPersonalizado.criar({
        mensagem: "Apenas dono, anfitrião ou administrador podem dropar jogadores sem check-in.",
        status: StatusErro.erroProibido,
      });
    }
    if (torneio.status !== "inscricoes_abertas" && torneio.status !== "em_andamento") {
      throw ErroPersonalizado.criar({ mensagem: "O torneio não aceita mais drops por check-in.", status: StatusErro.erroParametro });
    }
    if (torneio.status === "em_andamento" && torneio.emCorte) {
      throw ErroPersonalizado.criar({
        mensagem: "Não há check-in por rodada durante a fase eliminatória.",
        status: StatusErro.erroParametro,
      });
    }

    const rodadaExigida = torneio.status === "inscricoes_abertas" ? 0 : torneio.rodadaAtual;
    const estaPendente = (checkInRodada: number) => checkInRodada < rodadaExigida;
    const inscricoes = await this.inscricaoGateway.listarPorTorneio(input.torneioId);
    const candidatos = inscricoes.filter((inscricao) => !inscricao.dropped && estaPendente(inscricao.checkInRodada));
    const jogadores: DroparJogadorOutputDto["jogador"][] = [];

    for (const candidato of candidatos) {
      // Confirma o estado persistido no instante da ação, sem confiar no standings do frontend.
      const atual = await this.inscricaoGateway.buscarPorTorneioEUsuario(input.torneioId, candidato.usuarioId);
      if (!atual || atual.dropped || !estaPendente(atual.checkInRodada)) continue;

      const resultado = await this.droparJogador.executar({ ...input, jogadorId: atual.usuarioId });
      jogadores.push(resultado.jogador);
    }

    return { totalDropados: jogadores.length, jogadores };
  }
}
