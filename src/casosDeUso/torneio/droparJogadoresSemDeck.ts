import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { podeGerenciarTorneio } from "../../helpers/torneio/podeGerenciarTorneio";
import { DroparJogador, DroparJogadorOutputDto } from "./droparJogador";

export type DroparJogadoresSemDeckInputDto = {
  torneioId: string;
  requisitanteId: string;
  isAdmin: boolean;
};

export type DroparJogadoresSemDeckOutputDto = {
  totalDropados: number;
  jogadores: DroparJogadorOutputDto["jogador"][];
};

export class DroparJogadoresSemDeck
  implements CasoDeUso<DroparJogadoresSemDeckInputDto, DroparJogadoresSemDeckOutputDto> {
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
    return new DroparJogadoresSemDeck(torneioGateway, inscricaoGateway, droparJogador);
  }

  public async executar(input: DroparJogadoresSemDeckInputDto): Promise<DroparJogadoresSemDeckOutputDto> {
    const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
    if (!torneio) {
      throw ErroPersonalizado.criar({ mensagem: "Torneio não encontrado.", status: StatusErro.erroNaoEncontrado });
    }
    if (!podeGerenciarTorneio(torneio, input.requisitanteId, input.isAdmin)) {
      throw ErroPersonalizado.criar({
        mensagem: "Apenas dono, anfitrião ou administrador podem dropar jogadores sem deck.",
        status: StatusErro.erroProibido,
      });
    }
    if (torneio.status !== "inscricoes_abertas") {
      throw ErroPersonalizado.criar({
        mensagem: "Jogadores sem deck só podem ser removidos enquanto as inscrições estão abertas.",
        status: StatusErro.erroParametro,
      });
    }

    const inscricoes = await this.inscricaoGateway.listarPorTorneio(input.torneioId);
    const candidatos = inscricoes.filter((inscricao) => !inscricao.dropped && !inscricao.deckId);
    const jogadores: DroparJogadorOutputDto["jogador"][] = [];

    for (const candidato of candidatos) {
      // Relê imediatamente antes da remoção: o standings do frontend pode estar desatualizado.
      const atual = await this.inscricaoGateway.buscarPorTorneioEUsuario(input.torneioId, candidato.usuarioId);
      if (!atual || atual.dropped || atual.deckId) continue;

      const resultado = await this.droparJogador.executar({
        ...input,
        jogadorId: atual.usuarioId,
      });
      jogadores.push(resultado.jogador);
    }

    return { totalDropados: jogadores.length, jogadores };
  }
}
