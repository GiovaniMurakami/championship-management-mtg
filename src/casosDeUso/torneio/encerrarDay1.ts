import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { toBrasiliaISO } from "../../helpers/data/brasilia";
import { podeGerenciarTorneio } from "../../helpers/torneio/podeGerenciarTorneio";
import { resolverNomeJogador } from "../../helpers/torneio/resolverNomeJogador";
import { calcularEstatisticas, ordenarPorDesempate } from "../../dominio/torneio/swiss";
import { EventoTorneioGateway, eventoTorneioPadrao } from "../../dominio/gateway/eventoTorneioGateway";

export type EncerrarDay1InputDto = {
  torneioId: string;
  requisitanteId: string;
  isAdmin: boolean;
};

export type EncerrarDay1OutputDto = {
  torneioId: string;
  rodadasDay1: number;
  vagasDay2: number;
  day1Encerrado: boolean;
  day1EncerradoEm?: string;
  classificados: number;
  dropados: number;
  jogadoresClassificados: Array<{ id: string; nome: string; posicao: number; pontosMesa: number }>;
};

export class EncerrarDay1
  implements CasoDeUso<EncerrarDay1InputDto, EncerrarDay1OutputDto>
{
  private constructor(
    private readonly torneioGateway: TorneioGateway,
    private readonly inscricaoGateway: InscricaoGateway,
    private readonly partidaGateway: PartidaGateway,
    private readonly usuarioGateway: UsuarioGateway,
    private readonly eventos: EventoTorneioGateway,
  ) {}

  public static criar(
    torneioGateway: TorneioGateway,
    inscricaoGateway: InscricaoGateway,
    partidaGateway: PartidaGateway,
    usuarioGateway: UsuarioGateway,
    eventos: EventoTorneioGateway = eventoTorneioPadrao(),
  ) {
    return new EncerrarDay1(torneioGateway, inscricaoGateway, partidaGateway, usuarioGateway, eventos);
  }

  public async executar(input: EncerrarDay1InputDto): Promise<EncerrarDay1OutputDto> {
    const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (!podeGerenciarTorneio(torneio, input.requisitanteId, input.isAdmin)) {
      throw ErroPersonalizado.criar({
        mensagem: "Sem permissão para encerrar o Day 1 deste torneio.",
        status: StatusErro.erroProibido,
      });
    }

    if (torneio.status !== "em_andamento") {
      throw ErroPersonalizado.criar({
        mensagem: "O Day 1 só pode ser encerrado com o torneio em andamento.",
        status: StatusErro.erroParametro,
      });
    }

    if (!torneio.temDay1Day2()) {
      throw ErroPersonalizado.criar({
        mensagem: "Este torneio não possui configuração Day 1 / Day 2 (rodadasDay1 e vagasDay2).",
        status: StatusErro.erroParametro,
      });
    }

    if (torneio.day1Encerrado) {
      throw ErroPersonalizado.criar({
        mensagem: "O Day 1 já foi encerrado.",
        status: StatusErro.erroParametro,
      });
    }

    const rodadasDay1 = torneio.rodadasDay1!;
    const vagasDay2 = torneio.vagasDay2!;

    if (torneio.rodadaAtual !== rodadasDay1) {
      throw ErroPersonalizado.criar({
        mensagem: `Só é possível encerrar o Day 1 na rodada ${rodadasDay1} (rodada atual: ${torneio.rodadaAtual}).`,
        status: StatusErro.erroParametro,
      });
    }

    if (torneio.emCorte) {
      throw ErroPersonalizado.criar({
        mensagem: "Não é possível encerrar o Day 1 durante o corte eliminatório.",
        status: StatusErro.erroParametro,
      });
    }

    const [inscricoes, partidas] = await Promise.all([
      this.inscricaoGateway.listarPorTorneio(input.torneioId),
      this.partidaGateway.listarPorTorneio(input.torneioId),
    ]);

    const pendentes = partidas.filter(
      (p) => p.rodada === torneio.rodadaAtual && p.status === "pendente",
    );
    if (pendentes.length > 0) {
      throw ErroPersonalizado.criar({
        mensagem: `Ainda há ${pendentes.length} partida(s) pendente(s) na rodada ${torneio.rodadaAtual}.`,
        status: StatusErro.erroParametro,
      });
    }

    const inscricoesAtivas = inscricoes.filter((i) => !i.dropped);
    if (inscricoesAtivas.length < vagasDay2) {
      throw ErroPersonalizado.criar({
        mensagem: `Não há jogadores ativos suficientes para o Day 2. Ativos: ${inscricoesAtivas.length}, vagas: ${vagasDay2}.`,
        status: StatusErro.erroParametro,
      });
    }

    const partidasDay1 = partidas.filter((p) => p.rodada <= rodadasDay1);
    const idsComHistorico = Array.from(
      new Set(
        partidasDay1.flatMap((p) => [
          p.jogador1Id,
          ...(p.jogador2Id ? [p.jogador2Id] : []),
        ]),
      ),
    );
    const ativosIds = inscricoesAtivas.map((i) => i.usuarioId);
    const idsParaStats = Array.from(new Set([...idsComHistorico, ...ativosIds]));
    const statsMap = calcularEstatisticas(idsParaStats, partidasDay1);
    const ordenados = ordenarPorDesempate(Array.from(statsMap.values()), statsMap);
    const ativosSet = new Set(ativosIds);
    const rankingAtivos = ordenados.filter((s) => ativosSet.has(s.usuarioId));

    const classificadosIds = new Set(
      rankingAtivos.slice(0, vagasDay2).map((s) => s.usuarioId),
    );
    const aDropar = inscricoesAtivas.filter((i) => !classificadosIds.has(i.usuarioId));

    for (const inscricao of aDropar) {
      inscricao.dropped = true;
      inscricao.droppedRodada = rodadasDay1;
      inscricao.dropPartidaIds = [];
      await this.inscricaoGateway.atualizar(inscricao);
    }

    torneio.encerrarDay1();
    await this.torneioGateway.atualizar(torneio);

    const classificadosStats = rankingAtivos.slice(0, vagasDay2);
    const usuarios = await this.usuarioGateway.buscarVarios(
      classificadosStats.map((s) => s.usuarioId),
    );
    const nomeMap = new Map(
      usuarios.map((u) => [u.id, resolverNomeJogador(u, torneio.exibirNomeJogador)]),
    );

    const jogadoresClassificados = classificadosStats.map((s, idx) => ({
      id: s.usuarioId,
      nome: nomeMap.get(s.usuarioId) ?? s.usuarioId,
      posicao: idx + 1,
      pontosMesa: s.pontosMesa,
    }));

    this.eventos.publicar("day1_encerrado", {
      torneioId: torneio.id,
      rodadasDay1,
      vagasDay2,
      classificados: classificadosIds.size,
      dropados: aDropar.length,
      day1EncerradoEm: toBrasiliaISO(torneio.day1EncerradoEm),
    });

    for (const inscricao of aDropar) {
      this.eventos.publicar("jogador_dropou", {
        torneioId: torneio.id,
        jogadorId: inscricao.usuarioId,
        partidasResolvidas: [],
        motivo: "corte_day1",
      });
    }

    return {
      torneioId: torneio.id,
      rodadasDay1,
      vagasDay2,
      day1Encerrado: true,
      day1EncerradoEm: toBrasiliaISO(torneio.day1EncerradoEm),
      classificados: classificadosIds.size,
      dropados: aDropar.length,
      jogadoresClassificados,
    };
  }
}
