import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { toBrasiliaISO } from "../../helpers/data/brasilia";
import { logger } from "../../helpers/logger";
import {
  isUsuarioExcluido,
  resolverNomeJogador as resolverNome,
  USUARIO_EXCLUIDO_NOME,
} from "../../helpers/torneio/resolverNomeJogador";

export type BuscarTorneioInputDto = {
  torneioId: string;
};

export type BuscarTorneioOutputDto = {
  id: string;
  nome: string;
  horario: string;
  formato: string;
  donoId: string;
  anfitriaoId?: string | null;
  anfitriao?: {
    id: string;
    nome: string;
    email: string | null;
    excluido: boolean;
  } | null;
  status: string;
  rodadaAtual: number;
  totalRodadas: number;
  descricao?: string;
  regras?: string;
  bannerUrl?: string;
  linkBanner?: string;
  somRodada?: string;
  storyFundoUrl?: string;
  storyFundoTextoRodape?: "claro" | "escuro";
  maxJogadores?: number;
  maxRodadas?: number;
  corteTop?: number;
  linkLive?: string;
  emCorte: boolean;
  secreto: boolean;
  exibirNomeJogador: string;
  visualizacoes: number;
  totalInscritos: number;
  totalCheckin: number;
  criadoEm: string;
  rodadaIniciadaEm?: string;
  partidas: Array<{
    id: string;
    rodada: number;
    jogador1Id: string;
    jogador1Nome: string;
    jogador1Excluido: boolean;
    jogador2Id: string | null;
    jogador2Nome: string | null;
    jogador2Excluido: boolean;
    vitoriasJogador1: number;
    vitoriasJogador2: number;
    status: string;
    contestado: boolean;
    observacaoContestacao?: string | null;
    confirmadoPor: string[];
    mesa: number | null;
  }>;
};

export class BuscarTorneio
  implements CasoDeUso<BuscarTorneioInputDto, BuscarTorneioOutputDto> {
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
    return new BuscarTorneio(torneioGateway, inscricaoGateway, partidaGateway, usuarioGateway);
  }

  public async executar(
    input: BuscarTorneioInputDto
  ): Promise<BuscarTorneioOutputDto> {
    const torneio = await this.torneioGateway.buscarPorId(input.torneioId);
    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    let torneioAtual = torneio;
    try {
      torneioAtual = await this.torneioGateway.incrementarVisualizacoes(input.torneioId) ?? torneio;
    } catch (error) {
      logger.warn({ err: error, torneioId: input.torneioId }, "falha ao incrementar visualizacoes do torneio");
    }

    const [inscricoes, partidas] = await Promise.all([
      this.inscricaoGateway.listarPorTorneio(input.torneioId),
      this.partidaGateway.listarPorTorneio(input.torneioId),
    ]);

    const totalInscritos = inscricoes.length;
    const totalCheckin = inscricoes.filter((i) => i.checkInRodada >= 0).length;

    const jogadorIds = new Set<string>();
    for (const p of partidas) {
      jogadorIds.add(p.jogador1Id);
      if (p.jogador2Id) jogadorIds.add(p.jogador2Id);
    }
    if (torneioAtual.anfitriaoId) jogadorIds.add(torneioAtual.anfitriaoId);
    const usuarios = await this.usuarioGateway.buscarVarios(
      Array.from(jogadorIds)
    );
    const usuarioMap = new Map(usuarios.map((u) => [u.id, u]));
    const anfitriaoUsuario = torneioAtual.anfitriaoId
      ? usuarioMap.get(torneioAtual.anfitriaoId) ?? null
      : null;

    return {
      id: torneioAtual.id,
      nome: torneioAtual.nome,
      horario: toBrasiliaISO(torneioAtual.horario)!,
      formato: torneioAtual.formato,
      donoId: torneioAtual.donoId,
      anfitriaoId: torneioAtual.anfitriaoId ?? null,
      anfitriao: anfitriaoUsuario
        ? {
            id: anfitriaoUsuario.id,
            nome: isUsuarioExcluido(anfitriaoUsuario)
              ? USUARIO_EXCLUIDO_NOME
              : anfitriaoUsuario.nome,
            email: isUsuarioExcluido(anfitriaoUsuario) ? null : anfitriaoUsuario.email,
            excluido: isUsuarioExcluido(anfitriaoUsuario),
          }
        : null,
      status: torneioAtual.status,
      rodadaAtual: torneioAtual.rodadaAtual,
      totalRodadas: torneioAtual.totalRodadas,
      descricao: torneioAtual.descricao,
      regras: torneioAtual.regras,
      bannerUrl: torneioAtual.bannerUrl,
      linkBanner: torneioAtual.linkBanner,
      somRodada: torneioAtual.somRodada,
      storyFundoUrl: torneioAtual.storyFundoUrl,
      storyFundoTextoRodape: torneioAtual.storyFundoTextoRodape,
      maxJogadores: torneioAtual.maxJogadores,
      maxRodadas: torneioAtual.maxRodadas,
      corteTop: torneioAtual.corteTop,
      linkLive: torneioAtual.linkLive,
      emCorte: torneioAtual.emCorte,
      secreto: torneioAtual.secreto,
      exibirNomeJogador: torneioAtual.exibirNomeJogador,
      visualizacoes: torneioAtual.visualizacoes,
      totalInscritos,
      totalCheckin,
      criadoEm: toBrasiliaISO(torneioAtual.criadoEm)!,
      rodadaIniciadaEm: toBrasiliaISO(torneioAtual.rodadaIniciadaEm),
      partidas: partidas.map((p) => {
        const u1 = usuarioMap.get(p.jogador1Id);
        const u2 = p.jogador2Id ? usuarioMap.get(p.jogador2Id) : undefined;
        return {
        id: p.id,
        rodada: p.rodada,
        jogador1Id: p.jogador1Id,
        jogador1Nome: u1
          ? resolverNome(u1, torneioAtual.exibirNomeJogador)
          : p.jogador1Id,
        jogador1Excluido: isUsuarioExcluido(u1),
        jogador2Id: p.jogador2Id,
        jogador2Nome: p.jogador2Id
          ? (u2
            ? resolverNome(u2, torneioAtual.exibirNomeJogador)
            : p.jogador2Id)
          : null,
        jogador2Excluido: p.jogador2Id ? isUsuarioExcluido(u2) : false,
        vitoriasJogador1: p.vitoriasJogador1,
        vitoriasJogador2: p.vitoriasJogador2,
        status: p.status,
        contestado: p.contestado,
        observacaoContestacao: p.observacaoContestacao ?? null,
        confirmadoPor: p.confirmadoPor,
        mesa: p.mesa,
        };
      }),
    };
  }
}
