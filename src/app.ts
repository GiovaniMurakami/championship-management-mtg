import { CadastrarUsuario } from "./casosDeUso/usuario/cadastrarUsuario";
import { LoginUsuario } from "./casosDeUso/usuario/loginUsuario";
import { AtualizarUsuario } from "./casosDeUso/usuario/atualizarUsuario";
import { RefreshToken } from "./casosDeUso/usuario/refreshToken";
import { LogoutUsuario } from "./casosDeUso/usuario/logoutUsuario";
import { CadastrarDeck } from "./casosDeUso/deck/cadastrarDeck";
import { AtualizarDeck } from "./casosDeUso/deck/atualizarDeck";
import { ExcluirDeck } from "./casosDeUso/deck/excluirDeck";
import { BuscarDeck } from "./casosDeUso/deck/buscarDeck";
import { ListarDecks } from "./casosDeUso/deck/listarDecks";
import { CriarTorneio } from "./casosDeUso/torneio/criarTorneio";
import { InscreverTorneio } from "./casosDeUso/torneio/inscreverTorneio";
import { CheckInTorneio } from "./casosDeUso/torneio/checkInTorneio";
import { EscolherDeckTorneio } from "./casosDeUso/torneio/escolherDeckTorneio";
import { IniciarTorneio } from "./casosDeUso/torneio/iniciarTorneio";
import { IniciarProximaRodada } from "./casosDeUso/torneio/iniciarProximaRodada";
import { RegistrarResultado } from "./casosDeUso/torneio/registrarResultado";
import { DroparJogador } from "./casosDeUso/torneio/droparJogador";
import { ListarTorneios } from "./casosDeUso/torneio/listarTorneios";
import { BuscarTorneio } from "./casosDeUso/torneio/buscarTorneio";
import { BuscarStandings } from "./casosDeUso/torneio/buscarStandings";
import { MeuHistoricoTorneio } from "./casosDeUso/torneio/meuHistoricoTorneio";
import { ListarPartidasTorneio } from "./casosDeUso/torneio/listarPartidasTorneio";
import { AlterarTorneio } from "./casosDeUso/torneio/alterarTorneio";
import { ExcluirTorneio } from "./casosDeUso/torneio/excluirTorneio";
import { CriarLiga } from "./casosDeUso/liga/criarLiga";
import { AlterarLiga } from "./casosDeUso/liga/alterarLiga";
import { ExcluirLiga } from "./casosDeUso/liga/excluirLiga";
import { ListarLigas } from "./casosDeUso/liga/listarLigas";
import { BuscarLiga } from "./casosDeUso/liga/buscarLiga";
import { RankingLiga } from "./casosDeUso/liga/rankingLiga";
import { ApiExpress } from "./infra/api/express/api.express";
import { NotificacaoAbly } from "./infra/ably/notificacaoAbly";
import { CadastrarUsuarioRota } from "./infra/api/express/rotas/usuario/cadastrarUsuario.express.route";
import { LoginUsuarioRota } from "./infra/api/express/rotas/usuario/loginUsuario.express.route";
import { AtualizarUsuarioRota } from "./infra/api/express/rotas/usuario/atualizarUsuario.express.route";
import { RefreshTokenRota } from "./infra/api/express/rotas/usuario/refreshToken.express.route";
import { LogoutUsuarioRota } from "./infra/api/express/rotas/usuario/logoutUsuario.express.route";
import { CadastrarDeckRota } from "./infra/api/express/rotas/deck/cadastrarDeck.express.route";
import { AtualizarDeckRota } from "./infra/api/express/rotas/deck/atualizarDeck.express.route";
import { ExcluirDeckRota } from "./infra/api/express/rotas/deck/excluirDeck.express.route";
import { BuscarDeckRota } from "./infra/api/express/rotas/deck/buscarDeck.express.route";
import { ListarDecksRota } from "./infra/api/express/rotas/deck/listarDecks.express.route";
import { CriarTorneioRota } from "./infra/api/express/rotas/torneio/criarTorneio.express.route";
import { InscreverTorneioRota } from "./infra/api/express/rotas/torneio/inscreverTorneio.express.route";
import { CheckInTorneioRota } from "./infra/api/express/rotas/torneio/checkInTorneio.express.route";
import { EscolherDeckTorneioRota } from "./infra/api/express/rotas/torneio/escolherDeckTorneio.express.route";
import { IniciarTorneioRota } from "./infra/api/express/rotas/torneio/iniciarTorneio.express.route";
import { IniciarProximaRodadaRota } from "./infra/api/express/rotas/torneio/iniciarProximaRodada.express.route";
import { RegistrarResultadoRota } from "./infra/api/express/rotas/torneio/registrarResultado.express.route";
import { DroparJogadorRota } from "./infra/api/express/rotas/torneio/droparJogador.express.route";
import { ListarTorneiosRota } from "./infra/api/express/rotas/torneio/listarTorneios.express.route";
import { BuscarTorneioRota } from "./infra/api/express/rotas/torneio/buscarTorneio.express.route";
import { BuscarStandingsRota } from "./infra/api/express/rotas/torneio/buscarStandings.express.route";
import { MeuHistoricoTorneioRota } from "./infra/api/express/rotas/torneio/meuHistoricoTorneio.express.route";
import { ListarPartidasTorneioRota } from "./infra/api/express/rotas/torneio/listarPartidasTorneio.express.route";
import { AlterarTorneioRota } from "./infra/api/express/rotas/torneio/alterarTorneio.express.route";
import { ExcluirTorneioRota } from "./infra/api/express/rotas/torneio/excluirTorneio.express.route";
import { CriarLigaRota } from "./infra/api/express/rotas/liga/criarLiga.express.route";
import { AlterarLigaRota } from "./infra/api/express/rotas/liga/alterarLiga.express.route";
import { ExcluirLigaRota } from "./infra/api/express/rotas/liga/excluirLiga.express.route";
import { ListarLigasRota } from "./infra/api/express/rotas/liga/listarLigas.express.route";
import { BuscarLigaRota } from "./infra/api/express/rotas/liga/buscarLiga.express.route";
import { RankingLigaRota } from "./infra/api/express/rotas/liga/rankingLiga.express.route";
import { UsuarioRepositorio } from "./infra/mongodb/repositorios/usuarioRepositorio";
import { DeckRepositorio } from "./infra/mongodb/repositorios/deckRepositorio";
import { TorneioRepositorio } from "./infra/mongodb/repositorios/torneioRepositorio";
import { InscricaoRepositorio } from "./infra/mongodb/repositorios/inscricaoRepositorio";
import { PartidaRepositorio } from "./infra/mongodb/repositorios/partidaRepositorio";
import { TokenBlacklistRepositorio } from "./infra/mongodb/repositorios/tokenBlacklistRepositorio";
import { LigaRepositorio } from "./infra/mongodb/repositorios/ligaRepositorio";
import { ChatGptServico } from "./infra/services/chatGptServico";
import dotenv from "dotenv";

dotenv.config();
NotificacaoAbly.iniciar();

export function app() {

  const repositorios = {
    usuario: UsuarioRepositorio.criar(),
    deck: DeckRepositorio.criar(),
    torneio: TorneioRepositorio.criar(),
    inscricao: InscricaoRepositorio.criar(),
    partida: PartidaRepositorio.criar(),
    tokenBlacklist: TokenBlacklistRepositorio.criar(),
    liga: LigaRepositorio.criar(),
  };

  const cadastrarUsuario = CadastrarUsuario.criar(repositorios.usuario);
  const loginUsuario = LoginUsuario.criar(repositorios.usuario);
  const atualizarUsuario = AtualizarUsuario.criar(repositorios.usuario);
  const refreshToken = RefreshToken.criar(repositorios.usuario, repositorios.tokenBlacklist);
  const logoutUsuario = LogoutUsuario.criar(repositorios.tokenBlacklist);
  const chatGptServico = ChatGptServico.criar();
  const cadastrarDeck = CadastrarDeck.criar(repositorios.deck, chatGptServico);
  const atualizarDeck = AtualizarDeck.criar(repositorios.deck);
  const excluirDeck = ExcluirDeck.criar(repositorios.deck);
  const buscarDeck = BuscarDeck.criar(repositorios.deck, repositorios.usuario);
  const listarDecks = ListarDecks.criar(repositorios.deck, repositorios.usuario);

  const criarTorneio = CriarTorneio.criar(repositorios.torneio);
  const inscreverTorneio = InscreverTorneio.criar(
    repositorios.torneio,
    repositorios.inscricao,
    repositorios.usuario
  );
  const checkInTorneio = CheckInTorneio.criar(
    repositorios.torneio,
    repositorios.inscricao
  );
  const escolherDeckTorneio = EscolherDeckTorneio.criar(
    repositorios.torneio,
    repositorios.inscricao,
    repositorios.deck
  );
  const iniciarTorneio = IniciarTorneio.criar(
    repositorios.torneio,
    repositorios.inscricao,
    repositorios.partida,
    repositorios.usuario
  );
  const iniciarProximaRodada = IniciarProximaRodada.criar(
    repositorios.torneio,
    repositorios.inscricao,
    repositorios.partida,
    repositorios.usuario
  );
  const registrarResultado = RegistrarResultado.criar(
    repositorios.torneio,
    repositorios.partida
  );
  const droparJogador = DroparJogador.criar(
    repositorios.torneio,
    repositorios.inscricao,
    repositorios.usuario
  );
  const listarTorneios = ListarTorneios.criar(repositorios.torneio, repositorios.inscricao);
  const buscarTorneio = BuscarTorneio.criar(
    repositorios.torneio,
    repositorios.inscricao,
    repositorios.partida,
    repositorios.usuario
  );
  const buscarStandings = BuscarStandings.criar(
    repositorios.torneio,
    repositorios.inscricao,
    repositorios.partida,
    repositorios.usuario,
    repositorios.deck
  );
  const meuHistoricoTorneio = MeuHistoricoTorneio.criar(
    repositorios.torneio,
    repositorios.partida,
    repositorios.usuario
  );
  const listarPartidasTorneio = ListarPartidasTorneio.criar(
    repositorios.torneio,
    repositorios.partida
  );
  const alterarTorneio = AlterarTorneio.criar(repositorios.torneio);
  const excluirTorneio = ExcluirTorneio.criar(repositorios.torneio);

  const criarLiga = CriarLiga.criar(repositorios.liga, repositorios.torneio);
  const alterarLiga = AlterarLiga.criar(repositorios.liga, repositorios.torneio);
  const excluirLiga = ExcluirLiga.criar(repositorios.liga);
  const listarLigas = ListarLigas.criar(repositorios.liga);
  const buscarLiga = BuscarLiga.criar(repositorios.liga, repositorios.torneio);
  const rankingLiga = RankingLiga.criar(
    repositorios.liga,
    repositorios.partida,
    repositorios.inscricao,
    repositorios.deck,
    repositorios.usuario
  );

  const cadastrarUsuarioRota = CadastrarUsuarioRota.criar(cadastrarUsuario);
  const loginUsuarioRota = LoginUsuarioRota.criar(loginUsuario);
  const atualizarUsuarioRota = AtualizarUsuarioRota.criar(atualizarUsuario);
  const refreshTokenRota = RefreshTokenRota.criar(refreshToken);
  const logoutUsuarioRota = LogoutUsuarioRota.criar(logoutUsuario);
  const cadastrarDeckRota = CadastrarDeckRota.criar(cadastrarDeck);
  const atualizarDeckRota = AtualizarDeckRota.criar(atualizarDeck);
  const excluirDeckRota = ExcluirDeckRota.criar(excluirDeck);
  const buscarDeckRota = BuscarDeckRota.criar(buscarDeck);
  const listarDecksRota = ListarDecksRota.criar(listarDecks);

  const criarTorneioRota = CriarTorneioRota.criar(criarTorneio);
  const inscreverTorneioRota = InscreverTorneioRota.criar(inscreverTorneio);
  const checkInTorneioRota = CheckInTorneioRota.criar(checkInTorneio);
  const escolherDeckTorneioRota = EscolherDeckTorneioRota.criar(escolherDeckTorneio);
  const iniciarTorneioRota = IniciarTorneioRota.criar(iniciarTorneio);
  const iniciarProximaRodadaRota = IniciarProximaRodadaRota.criar(iniciarProximaRodada);
  const registrarResultadoRota = RegistrarResultadoRota.criar(
    registrarResultado,
    buscarStandings
  );
  const droparJogadorRota = DroparJogadorRota.criar(droparJogador);
  const listarTorneiosRota = ListarTorneiosRota.criar(listarTorneios);
  const buscarTorneioRota = BuscarTorneioRota.criar(buscarTorneio);
  const buscarStandingsRota = BuscarStandingsRota.criar(buscarStandings);
  const meuHistoricoTorneioRota = MeuHistoricoTorneioRota.criar(meuHistoricoTorneio);
  const listarPartidasTorneioRota = ListarPartidasTorneioRota.criar(listarPartidasTorneio);
  const alterarTorneioRota = AlterarTorneioRota.criar(alterarTorneio);
  const excluirTorneioRota = ExcluirTorneioRota.criar(excluirTorneio);

  const criarLigaRota = CriarLigaRota.criar(criarLiga);
  const alterarLigaRota = AlterarLigaRota.criar(alterarLiga);
  const excluirLigaRota = ExcluirLigaRota.criar(excluirLiga);
  const listarLigasRota = ListarLigasRota.criar(listarLigas);
  const buscarLigaRota = BuscarLigaRota.criar(buscarLiga);
  const rankingLigaRota = RankingLigaRota.criar(rankingLiga);

  const port = Number(process.env.PORT) || 0;

  const api = ApiExpress.criar([
    cadastrarUsuarioRota,
    loginUsuarioRota,
    atualizarUsuarioRota,
    refreshTokenRota,
    logoutUsuarioRota,
    cadastrarDeckRota,
    atualizarDeckRota,
    excluirDeckRota,
    listarDecksRota,
    buscarDeckRota,
    criarTorneioRota,
    inscreverTorneioRota,
    checkInTorneioRota,
    escolherDeckTorneioRota,
    droparJogadorRota,
    iniciarTorneioRota,
    iniciarProximaRodadaRota,
    registrarResultadoRota,
    listarTorneiosRota,
    buscarTorneioRota,
    buscarStandingsRota,
    meuHistoricoTorneioRota,
    listarPartidasTorneioRota,
    alterarTorneioRota,
    excluirTorneioRota,
    criarLigaRota,
    listarLigasRota,
    buscarLigaRota,
    alterarLigaRota,
    excluirLigaRota,
    rankingLigaRota,
  ]);

  api.start(port);

  return api.retornarAplicacao();
}
