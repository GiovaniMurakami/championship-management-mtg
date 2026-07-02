import { Partida } from "../../dominio/entidade/partida";
import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { podeGerenciarTorneio } from "../../helpers/torneio/podeGerenciarTorneio";

type PartidaAtualizadaInput = {
  id: string;
  jogador1Id: string;
  jogador2Id: string | null;
  mesa: number | null;
};

export type AtualizarPareamentosRodadaInputDto = {
  torneioId: string;
  rodada: number;
  requisitanteId: string;
  isAdmin: boolean;
  partidas: PartidaAtualizadaInput[];
};

export type AtualizarPareamentosRodadaOutputDto = {
  torneioId: string;
  rodada: number;
  partidas: Array<{
    id: string;
    jogador1Id: string;
    jogador1Nome: string;
    jogador2Id: string | null;
    jogador2Nome: string | null;
    mesa: number | null;
    status: string;
    vitoriasJogador1: number;
    vitoriasJogador2: number;
  }>;
};

function compararColecoes(origem: string[], destino: string[]) {
  if (origem.length !== destino.length) return false;
  const a = [...origem].sort();
  const b = [...destino].sort();
  return a.every((valor, index) => valor === b[index]);
}

export class AtualizarPareamentosRodada
  implements CasoDeUso<AtualizarPareamentosRodadaInputDto, AtualizarPareamentosRodadaOutputDto> {
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly inscricaoGateway: InscricaoGateway,
    private readonly partidaGateway: PartidaGateway,
    private readonly usuarioGateway: UsuarioGateway
  ) { }

  public static criar(
    torneioGateway: TorneioGateway,
    inscricaoGateway: InscricaoGateway,
    partidaGateway: PartidaGateway,
    usuarioGateway: UsuarioGateway
  ) {
    return new AtualizarPareamentosRodada(
      torneioGateway,
      inscricaoGateway,
      partidaGateway,
      usuarioGateway
    );
  }

  public async executar(
    input: AtualizarPareamentosRodadaInputDto
  ): Promise<AtualizarPareamentosRodadaOutputDto> {
    const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (torneio.status !== "em_andamento") {
      throw ErroPersonalizado.criar({
        mensagem: "Pareamentos só podem ser alterados enquanto o torneio está em andamento.",
        status: StatusErro.erroParametro,
      });
    }

    if (input.rodada !== torneio.rodadaAtual) {
      throw ErroPersonalizado.criar({
        mensagem: "Somente a rodada atual pode ter pareamentos editados.",
        status: StatusErro.erroParametro,
      });
    }

    if (!podeGerenciarTorneio(torneio, input.requisitanteId, input.isAdmin)) {
      throw ErroPersonalizado.criar({
        mensagem: "Apenas o dono, anfitrião ou administrador do torneio pode alterar pareamentos.",
        status: StatusErro.erroProibido,
      });
    }

    const [partidasRodada, inscricoes] = await Promise.all([
      this.partidaGateway.listarPorTorneioERodada(input.torneioId, input.rodada),
      this.inscricaoGateway.listarPorTorneio(input.torneioId),
    ]);

    if (partidasRodada.length === 0) {
      throw ErroPersonalizado.criar({
        mensagem: "Não existem partidas para a rodada informada.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    const idsOriginais = new Set(partidasRodada.map((partida) => partida.id));
    const idsRecebidos = new Set(input.partidas.map((partida) => partida.id));

    if (idsOriginais.size !== idsRecebidos.size || input.partidas.some((partida) => !idsOriginais.has(partida.id))) {
      throw ErroPersonalizado.criar({
        mensagem: "Envie exatamente as partidas existentes da rodada para reordenar os pareamentos.",
        status: StatusErro.erroParametro,
      });
    }

    const inscricoesAtivas = inscricoes.filter((inscricao) => !inscricao.dropped);
    const jogadoresAtivos = new Set(inscricoesAtivas.map((inscricao) => inscricao.usuarioId));
    const deckMap = new Map(inscricoesAtivas.map((inscricao) => [inscricao.usuarioId, inscricao.deckId ?? null]));

    const jogadoresOriginais = partidasRodada.flatMap((partida) =>
      partida.jogador2Id ? [partida.jogador1Id, partida.jogador2Id] : [partida.jogador1Id]
    );
    const jogadoresRecebidos = input.partidas.flatMap((partida) =>
      partida.jogador2Id ? [partida.jogador1Id, partida.jogador2Id] : [partida.jogador1Id]
    );

    if (!compararColecoes(jogadoresOriginais, jogadoresRecebidos)) {
      throw ErroPersonalizado.criar({
        mensagem: "Os pareamentos devem reutilizar exatamente os mesmos jogadores da rodada.",
        status: StatusErro.erroParametro,
      });
    }

    const jogadoresUnicos = new Set<string>();
    let quantidadeByes = 0;

    for (const partida of input.partidas) {
      if (!jogadoresAtivos.has(partida.jogador1Id)) {
        throw ErroPersonalizado.criar({
          mensagem: "Todos os jogadores dos pareamentos precisam estar ativos no torneio.",
          status: StatusErro.erroParametro,
        });
      }

      if (jogadoresUnicos.has(partida.jogador1Id)) {
        throw ErroPersonalizado.criar({
          mensagem: "Um jogador não pode aparecer em mais de uma mesa na mesma rodada.",
          status: StatusErro.erroParametro,
        });
      }
      jogadoresUnicos.add(partida.jogador1Id);

      if (partida.jogador2Id === partida.jogador1Id) {
        throw ErroPersonalizado.criar({
          mensagem: "Uma partida não pode conter o mesmo jogador nos dois lados.",
          status: StatusErro.erroParametro,
        });
      }

      if (partida.jogador2Id) {
        if (!jogadoresAtivos.has(partida.jogador2Id)) {
          throw ErroPersonalizado.criar({
            mensagem: "Todos os jogadores dos pareamentos precisam estar ativos no torneio.",
            status: StatusErro.erroParametro,
          });
        }

        if (jogadoresUnicos.has(partida.jogador2Id)) {
          throw ErroPersonalizado.criar({
            mensagem: "Um jogador não pode aparecer em mais de uma mesa na mesma rodada.",
            status: StatusErro.erroParametro,
          });
        }

        jogadoresUnicos.add(partida.jogador2Id);
      } else {
        quantidadeByes += 1;
      }
    }

    if (quantidadeByes > 1) {
      throw ErroPersonalizado.criar({
        mensagem: "A rodada pode ter no máximo um BYE.",
        status: StatusErro.erroParametro,
      });
    }

    const partidaMap = new Map(partidasRodada.map((partida) => [partida.id, partida]));

    for (const partidaAtualizada of input.partidas) {
      const partida = partidaMap.get(partidaAtualizada.id) as Partida;
      partida.jogador1Id = partidaAtualizada.jogador1Id;
      partida.jogador2Id = partidaAtualizada.jogador2Id;
      partida.deckJogador1Id = deckMap.get(partidaAtualizada.jogador1Id) ?? undefined;
      partida.deckJogador2Id = partidaAtualizada.jogador2Id
        ? (deckMap.get(partidaAtualizada.jogador2Id) ?? undefined)
        : null;
      partida.mesa = partidaAtualizada.mesa;
      partida.contestado = false;
      partida.confirmadoPor = [];

      if (partidaAtualizada.jogador2Id) {
        partida.tipoBye = null;
        partida.status = "pendente";
        partida.vitoriasJogador1 = 0;
        partida.vitoriasJogador2 = 0;
      } else {
        partida.tipoBye = "normal";
        partida.status = "finalizada";
        partida.vitoriasJogador1 = 2;
        partida.vitoriasJogador2 = 0;
      }

      await this.partidaGateway.atualizar(partida);
    }

    const usuarioIds = Array.from(jogadoresUnicos);
    const usuarios = await this.usuarioGateway.buscarVarios(usuarioIds);
    const nomeMap = new Map(usuarios.map((usuario) => [usuario.id, usuario.nome]));

    const partidasOrdenadas = input.partidas
      .map((partida) => partidaMap.get(partida.id) as Partida)
      .sort((a, b) => (a.mesa ?? Number.MAX_SAFE_INTEGER) - (b.mesa ?? Number.MAX_SAFE_INTEGER));

    return {
      torneioId: torneio.id,
      rodada: input.rodada,
      partidas: partidasOrdenadas.map((partida) => ({
        id: partida.id,
        jogador1Id: partida.jogador1Id,
        jogador1Nome: nomeMap.get(partida.jogador1Id) ?? partida.jogador1Id,
        jogador2Id: partida.jogador2Id,
        jogador2Nome: partida.jogador2Id ? (nomeMap.get(partida.jogador2Id) ?? partida.jogador2Id) : null,
        mesa: partida.mesa,
        status: partida.status,
        vitoriasJogador1: partida.vitoriasJogador1,
        vitoriasJogador2: partida.vitoriasJogador2,
      })),
    };
  }
}
