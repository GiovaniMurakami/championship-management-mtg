import { CadastrarUsuario } from "./casosDeUso/usuario/cadastrarUsuario";
import { LoginUsuario } from "./casosDeUso/usuario/loginUsuario";
import { AtualizarUsuario } from "./casosDeUso/usuario/atualizarUsuario";
import { RefreshToken } from "./casosDeUso/usuario/refreshToken";
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
import { ApiExpress } from "./infra/api/express/api.express";
import { NotificacaoAbly } from "./infra/ably/notificacaoAbly";
import { CadastrarUsuarioRota } from "./infra/api/express/rotas/usuario/cadastrarUsuario.express.route";
import { LoginUsuarioRota } from "./infra/api/express/rotas/usuario/loginUsuario.express.route";
import { AtualizarUsuarioRota } from "./infra/api/express/rotas/usuario/atualizarUsuario.express.route";
import { RefreshTokenRota } from "./infra/api/express/rotas/usuario/refreshToken.express.route";
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
import { UsuarioRepositorio } from "./infra/mongodb/repositorios/usuarioRepositorio";
import { DeckRepositorio } from "./infra/mongodb/repositorios/deckRepositorio";
import { TorneioRepositorio } from "./infra/mongodb/repositorios/torneioRepositorio";
import { InscricaoRepositorio } from "./infra/mongodb/repositorios/inscricaoRepositorio";
import { PartidaRepositorio } from "./infra/mongodb/repositorios/partidaRepositorio";
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
  };

  const cadastrarUsuario = CadastrarUsuario.criar(repositorios.usuario);
  const loginUsuario = LoginUsuario.criar(repositorios.usuario);
  const atualizarUsuario = AtualizarUsuario.criar(repositorios.usuario);
  const refreshToken = RefreshToken.criar(repositorios.usuario);
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

  const cadastrarUsuarioRota = CadastrarUsuarioRota.criar(cadastrarUsuario);
  const loginUsuarioRota = LoginUsuarioRota.criar(loginUsuario);
  const atualizarUsuarioRota = AtualizarUsuarioRota.criar(atualizarUsuario);
  const refreshTokenRota = RefreshTokenRota.criar(refreshToken);
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

  const port = Number(process.env.PORT) || 0;

  const api = ApiExpress.criar([
    cadastrarUsuarioRota,
    loginUsuarioRota,
    atualizarUsuarioRota,
    refreshTokenRota,
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
  ]);

  api.start(port);

  return api.retornarAplicacao();
}
