import { InscricaoGateway } from "../../dominio/gateway/inscricaoGateway";
import { PartidaGateway } from "../../dominio/gateway/partidaGateway";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { UsuarioGateway } from "../../dominio/gateway/usuarioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { ExibirNomeJogador } from "../../dominio/entidade/torneio";
import { toBrasiliaISO } from "../../helpers/data/brasilia";
import { Usuario } from "../../dominio/entidade/usuario";

function resolverNome(u: Usuario, modo: ExibirNomeJogador): string {
  if (modo === "nickMOL") return u.nickMTGO ?? u.nome;
  if (modo === "nickArena") return u.nickArena ?? u.nome;
  return u.nome;
}

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
    email: string;
  } | null;
  status: string;
  rodadaAtual: number;
  totalRodadas: number;
  descricao?: string;
  regras?: string;
  bannerUrl?: string;
  linkBanner?: string;
  somRodada?: string;
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
    jogador2Id: string | null;
    jogador2Nome: string | null;
    vitoriasJogador1: number;
    vitoriasJogador2: number;
    status: string;
    contestado: boolean;
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

    const torneioAtual = await this.torneioGateway.incrementarVisualizacoes(input.torneioId) ?? torneio;

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
        ? { id: anfitriaoUsuario.id, nome: anfitriaoUsuario.nome, email: anfitriaoUsuario.email }
        : null,
      status: torneioAtual.status,
      rodadaAtual: torneioAtual.rodadaAtual,
      totalRodadas: torneioAtual.totalRodadas,
      descricao: torneioAtual.descricao,
      regras: torneioAtual.regras,
      bannerUrl: torneioAtual.bannerUrl,
      linkBanner: torneioAtual.linkBanner,
      somRodada: torneioAtual.somRodada,
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
      partidas: partidas.map((p) => ({
        id: p.id,
        rodada: p.rodada,
        jogador1Id: p.jogador1Id,
        jogador1Nome: usuarioMap.get(p.jogador1Id)
          ? resolverNome(usuarioMap.get(p.jogador1Id)!, torneioAtual.exibirNomeJogador)
          : p.jogador1Id,
        jogador2Id: p.jogador2Id,
        jogador2Nome: p.jogador2Id
          ? (usuarioMap.get(p.jogador2Id)
            ? resolverNome(usuarioMap.get(p.jogador2Id)!, torneioAtual.exibirNomeJogador)
            : p.jogador2Id)
          : null,
        vitoriasJogador1: p.vitoriasJogador1,
        vitoriasJogador2: p.vitoriasJogador2,
        status: p.status,
        contestado: p.contestado,
        confirmadoPor: p.confirmadoPor,
        mesa: p.mesa,
      })),
    };
  }
}
