import { Partida } from "../../dominio/entidade/partida";
import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { podeGerenciarTorneio } from "../../helpers/torneio/podeGerenciarTorneio";
import { resolverNomeJogador } from "../../helpers/torneio/resolverNomeJogador";

type PartidaAtualizadaInput = {
  id?: string | null;
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

function mesmosJogadores(
  a: { jogador1Id: string; jogador2Id: string | null },
  b: { jogador1Id: string; jogador2Id: string | null }
) {
  return a.jogador1Id === b.jogador1Id && (a.jogador2Id ?? null) === (b.jogador2Id ?? null);
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

    const partidaMap = new Map(partidasRodada.map((partida) => [partida.id, partida]));
    const finalizadas = partidasRodada.filter((partida) => partida.status === "finalizada");
    const pendentes = partidasRodada.filter((partida) => partida.status !== "finalizada");
    const pendentesIds = new Set(pendentes.map((partida) => partida.id));

    const inscricoesAtivas = inscricoes.filter((inscricao) => !inscricao.dropped);
    const jogadoresAtivos = new Set(inscricoesAtivas.map((inscricao) => inscricao.usuarioId));
    const deckMap = new Map(inscricoesAtivas.map((inscricao) => [inscricao.usuarioId, inscricao.deckId ?? null]));

    const idsRecebidos = new Set<string>();
    for (const partida of input.partidas) {
      if (partida.id) {
        if (idsRecebidos.has(partida.id)) {
          throw ErroPersonalizado.criar({
            mensagem: "Há partidas duplicadas no envio dos pareamentos.",
            status: StatusErro.erroParametro,
          });
        }
        idsRecebidos.add(partida.id);
        if (!partidaMap.has(partida.id)) {
          throw ErroPersonalizado.criar({
            mensagem: "Uma ou mais partidas enviadas não pertencem à rodada atual.",
            status: StatusErro.erroParametro,
          });
        }
      }
    }

    // Mesas finalizadas ficam travadas: precisam constar no payload com os mesmos jogadores.
    for (const finalizada of finalizadas) {
      const enviada = input.partidas.find((partida) => partida.id === finalizada.id);
      if (!enviada) {
        throw ErroPersonalizado.criar({
          mensagem: "Partidas finalizadas não podem ser removidas dos pareamentos.",
          status: StatusErro.erroParametro,
        });
      }
      if (!mesmosJogadores(finalizada, enviada)) {
        throw ErroPersonalizado.criar({
          mensagem: "Partidas finalizadas não podem ter jogadores alterados.",
          status: StatusErro.erroParametro,
        });
      }
    }

    // IDs existentes no payload que não são finalizadas precisam ser pendentes.
    for (const id of idsRecebidos) {
      const existente = partidaMap.get(id)!;
      if (existente.status === "finalizada") continue;
      if (!pendentesIds.has(id)) {
        throw ErroPersonalizado.criar({
          mensagem: "Uma ou mais partidas enviadas não pertencem à rodada atual.",
          status: StatusErro.erroParametro,
        });
      }
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

    const idsPendentesRecebidos = new Set(
      input.partidas
        .map((partida) => partida.id)
        .filter((id): id is string => Boolean(id) && pendentesIds.has(id as string))
    );
    const idsParaExcluir = pendentes
      .map((partida) => partida.id)
      .filter((id) => !idsPendentesRecebidos.has(id));

    if (idsParaExcluir.length > 0) {
      await this.partidaGateway.excluirPorIds(idsParaExcluir);
    }

    const resultadoPartidas: Partida[] = [];

    for (const partidaAtualizada of input.partidas) {
      if (partidaAtualizada.id && partidaMap.has(partidaAtualizada.id)) {
        const existente = partidaMap.get(partidaAtualizada.id)!;

        if (existente.status === "finalizada") {
          // Mantém resultado; só permite ajustar mesa.
          if (partidaAtualizada.mesa !== existente.mesa) {
            existente.mesa = partidaAtualizada.mesa;
            await this.partidaGateway.atualizar(existente);
          }
          resultadoPartidas.push(existente);
          continue;
        }

        existente.jogador1Id = partidaAtualizada.jogador1Id;
        existente.jogador2Id = partidaAtualizada.jogador2Id;
        existente.deckJogador1Id = deckMap.get(partidaAtualizada.jogador1Id) ?? undefined;
        existente.deckJogador2Id = partidaAtualizada.jogador2Id
          ? (deckMap.get(partidaAtualizada.jogador2Id) ?? undefined)
          : null;
        existente.mesa = partidaAtualizada.mesa;
        existente.contestado = false;
        existente.confirmadoPor = [];

        if (partidaAtualizada.jogador2Id) {
          existente.tipoBye = null;
          existente.status = "pendente";
          existente.vitoriasJogador1 = 0;
          existente.vitoriasJogador2 = 0;
        } else {
          existente.tipoBye = "normal";
          existente.status = "finalizada";
          existente.vitoriasJogador1 = 2;
          existente.vitoriasJogador2 = 0;
        }

        await this.partidaGateway.atualizar(existente);
        resultadoPartidas.push(existente);
        continue;
      }

      const nova = Partida.criar({
        torneioId: input.torneioId,
        rodada: input.rodada,
        jogador1Id: partidaAtualizada.jogador1Id,
        jogador2Id: partidaAtualizada.jogador2Id,
        deckJogador1Id: deckMap.get(partidaAtualizada.jogador1Id) ?? undefined,
        deckJogador2Id: partidaAtualizada.jogador2Id
          ? (deckMap.get(partidaAtualizada.jogador2Id) ?? undefined)
          : null,
        mesa: partidaAtualizada.mesa,
      });
      await this.partidaGateway.salvar(nova);
      resultadoPartidas.push(nova);
    }

    const usuarioIds = Array.from(jogadoresUnicos);
    const usuarios = await this.usuarioGateway.buscarVarios(usuarioIds);
    const nomeMap = new Map(
      usuarios.map((usuario) => [usuario.id, resolverNomeJogador(usuario, torneio.exibirNomeJogador)])
    );

    const partidasOrdenadas = [...resultadoPartidas].sort(
      (a, b) => (a.mesa ?? Number.MAX_SAFE_INTEGER) - (b.mesa ?? Number.MAX_SAFE_INTEGER)
    );

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
