import { ExibirNomeJogador, StoryFundoTextoRodape } from "../../dominio/entidade/torneio";
import { TorneioGateway } from "../../dominio/gateway/torneioGateway";
import { CasoDeUso } from "../casoDeUso";
import { ErroPersonalizado } from "../../helpers/error/ErroPersonalizado";
import { StatusErro } from "../../helpers/error/statusErro";
import { podeGerenciarTorneio } from "../../helpers/torneio/podeGerenciarTorneio";
import { toBrasiliaISO } from "../../helpers/data/brasilia";
import { EventoTorneioGateway, eventoTorneioPadrao } from "../../dominio/gateway/eventoTorneioGateway";

export type AlterarTorneioInputDto = {
  id: string;
  requisitanteId: string;
  isAdmin: boolean;
  nome?: string;
  horario?: Date;
  formato?: string;
  descricao?: string;
  regras?: string;
  bannerUrl?: string;
  linkBanner?: string;
  somRodada?: string;
  storyFundoUrl?: string;
  storyFundoTextoRodape?: StoryFundoTextoRodape;
  maxJogadores?: number;
  maxRodadas?: number;
  corteTop?: number;
  rodadasDay1?: number;
  vagasDay2?: number;
  premio?: { playerPoints: number; tix: number };
  linkLive?: string;
  secreto?: boolean;
  listasPublicas?: boolean;
  exibirNomeJogador?: ExibirNomeJogador;
};

export type AlterarTorneioOutputDto = {
  id: string;
  nome: string;
  horario: string;
  formato: string;
  donoId: string;
  anfitriaoId?: string | null;
  status: string;
  descricao?: string;
  regras?: string;
  bannerUrl?: string;
  linkBanner?: string;
  somRodada?: string;
  storyFundoUrl?: string;
  storyFundoTextoRodape: StoryFundoTextoRodape;
  maxJogadores?: number;
  maxRodadas?: number;
  corteTop?: number;
  rodadasDay1?: number;
  vagasDay2?: number;
  day1Encerrado: boolean;
  day1EncerradoEm?: string;
  premio?: { playerPoints: number; tix: number };
  linkLive?: string;
  secreto: boolean;
  listasPublicas: boolean;
  exibirNomeJogador: ExibirNomeJogador;
  criadoEm: string;
};

export class AlterarTorneio
  implements CasoDeUso<AlterarTorneioInputDto, AlterarTorneioOutputDto> {
  private constructor(private readonly torneioGateway: TorneioGateway,
    private readonly eventos: EventoTorneioGateway,) { }

  public static criar(torneioGateway: TorneioGateway,
    eventos: EventoTorneioGateway = eventoTorneioPadrao()) {
    return new AlterarTorneio(torneioGateway, eventos);
  }

  public async executar(input: AlterarTorneioInputDto): Promise<AlterarTorneioOutputDto> {
    const torneio = await this.torneioGateway.buscarPorId(input.id);

    if (!torneio) {
      throw ErroPersonalizado.criar({
        mensagem: "Torneio não encontrado.",
        status: StatusErro.erroNaoEncontrado,
      });
    }

    if (!podeGerenciarTorneio(torneio, input.requisitanteId, input.isAdmin)) {
      throw ErroPersonalizado.criar({
        mensagem: "Sem permissão para alterar este torneio.",
        status: StatusErro.erroProibido,
      });
    }

    if (torneio.status === "finalizado" && !input.isAdmin) {
      throw ErroPersonalizado.criar({
        mensagem: "Não é possível alterar torneios finalizados.",
        status: StatusErro.erroParametro,
      });
    }

    if (torneio.status === "em_andamento") {
      const campos = ["formato", "maxJogadores", "maxRodadas", "corteTop"] as const;
      if (campos.some((campo) => input[campo] !== undefined && input[campo] !== torneio[campo])) {
        throw ErroPersonalizado.criar({ mensagem: "A estrutura do torneio não pode ser alterada após o início.", status: StatusErro.erroParametro });
      }
    }

    const tocouDay1 = input.rodadasDay1 !== undefined || input.vagasDay2 !== undefined;
    const nextRodadasDay1 = input.rodadasDay1 !== undefined ? input.rodadasDay1 : torneio.rodadasDay1;
    const nextVagasDay2 = input.vagasDay2 !== undefined ? input.vagasDay2 : torneio.vagasDay2;
    if (tocouDay1 && (nextRodadasDay1 === undefined || nextVagasDay2 === undefined)) {
      throw ErroPersonalizado.criar({
        mensagem: "Informe rodadasDay1 e vagasDay2 juntos (ou nenhum dos dois).",
        status: StatusErro.erroParametro,
      });
    }
    if (torneio.day1Encerrado && (input.rodadasDay1 !== undefined || input.vagasDay2 !== undefined)) {
      throw ErroPersonalizado.criar({
        mensagem: "Não é possível alterar a configuração Day 1/Day 2 após o Day 1 encerrado.",
        status: StatusErro.erroParametro,
      });
    }
    if (
      torneio.status === "em_andamento" &&
      nextRodadasDay1 !== undefined &&
      torneio.rodadaAtual > nextRodadasDay1
    ) {
      throw ErroPersonalizado.criar({
        mensagem: `rodadasDay1 (${nextRodadasDay1}) não pode ser menor que a rodada atual (${torneio.rodadaAtual}).`,
        status: StatusErro.erroParametro,
      });
    }

    if (input.nome !== undefined) torneio.nome = input.nome.trim();
    if (input.horario !== undefined) torneio.horario = input.horario;
    if (input.formato !== undefined) torneio.formato = input.formato.toLowerCase().trim();
    if (input.descricao !== undefined) torneio.descricao = input.descricao?.trim();
    if (input.regras !== undefined) torneio.regras = input.regras?.trim();
    if (input.bannerUrl !== undefined) torneio.bannerUrl = input.bannerUrl?.trim();
    if (input.linkBanner !== undefined) torneio.linkBanner = input.linkBanner?.trim();
    if (input.somRodada !== undefined) torneio.somRodada = input.somRodada?.trim();
    if (input.storyFundoUrl !== undefined) torneio.storyFundoUrl = input.storyFundoUrl?.trim();
    if (input.storyFundoTextoRodape !== undefined) torneio.storyFundoTextoRodape = input.storyFundoTextoRodape;
    if (input.maxJogadores !== undefined) torneio.maxJogadores = input.maxJogadores;
    if (input.maxRodadas !== undefined) torneio.maxRodadas = input.maxRodadas;
    if (input.corteTop !== undefined) torneio.corteTop = input.corteTop;
    if (input.rodadasDay1 !== undefined) torneio.rodadasDay1 = input.rodadasDay1;
    if (input.vagasDay2 !== undefined) torneio.vagasDay2 = input.vagasDay2;
    if (input.premio !== undefined) torneio.premio = input.premio;
    if (input.linkLive !== undefined) torneio.linkLive = input.linkLive?.trim();
    if (input.secreto !== undefined) torneio.secreto = input.secreto;
    if (input.listasPublicas !== undefined) torneio.listasPublicas = input.listasPublicas;
    if (input.exibirNomeJogador !== undefined) torneio.exibirNomeJogador = input.exibirNomeJogador;

    await this.torneioGateway.atualizar(torneio);
    this.eventos.publicar("torneio_alterado", {
      torneioId: torneio.id,
    });

    return {
      id: torneio.id,
      nome: torneio.nome,
      horario: toBrasiliaISO(torneio.horario)!,
      formato: torneio.formato,
      donoId: torneio.donoId,
      anfitriaoId: torneio.anfitriaoId ?? null,
      status: torneio.status,
      descricao: torneio.descricao,
      regras: torneio.regras,
      bannerUrl: torneio.bannerUrl,
      linkBanner: torneio.linkBanner,
      somRodada: torneio.somRodada,
      storyFundoUrl: torneio.storyFundoUrl,
      storyFundoTextoRodape: torneio.storyFundoTextoRodape,
      maxJogadores: torneio.maxJogadores,
      maxRodadas: torneio.maxRodadas,
      corteTop: torneio.corteTop,
      rodadasDay1: torneio.rodadasDay1,
      vagasDay2: torneio.vagasDay2,
      day1Encerrado: torneio.day1Encerrado,
      day1EncerradoEm: toBrasiliaISO(torneio.day1EncerradoEm),
      premio: torneio.premio,
      linkLive: torneio.linkLive,
      secreto: torneio.secreto,
      listasPublicas: torneio.listasPublicas,
      exibirNomeJogador: torneio.exibirNomeJogador,
      criadoEm: toBrasiliaISO(torneio.criadoEm)!,
    };
  }
}
