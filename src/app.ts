import { CadastrarUsuario } from "./casosDeUso/usuario/cadastrarUsuario";
import { LoginUsuario } from "./casosDeUso/usuario/loginUsuario";
import { AtualizarUsuario } from "./casosDeUso/usuario/atualizarUsuario";
import { CadastrarDeck } from "./casosDeUso/deck/cadastrarDeck";
import { AtualizarDeck } from "./casosDeUso/deck/atualizarDeck";
import { ExcluirDeck } from "./casosDeUso/deck/excluirDeck";
import { ListarDecks } from "./casosDeUso/deck/listarDecks";
import { CriarTorneio } from "./casosDeUso/torneio/criarTorneio";
import { InscreverTorneio } from "./casosDeUso/torneio/inscreverTorneio";
import { CheckInTorneio } from "./casosDeUso/torneio/checkInTorneio";
import { EscolherDeckTorneio } from "./casosDeUso/torneio/escolherDeckTorneio";
import { IniciarTorneio } from "./casosDeUso/torneio/iniciarTorneio";
import { IniciarProximaRodada } from "./casosDeUso/torneio/iniciarProximaRodada";
import { RegistrarResultado } from "./casosDeUso/torneio/registrarResultado";
import { ListarTorneios } from "./casosDeUso/torneio/listarTorneios";
import { BuscarTorneio } from "./casosDeUso/torneio/buscarTorneio";
import { BuscarStandings } from "./casosDeUso/torneio/buscarStandings";
import { ApiExpress } from "./infra/api/express/api.express";
import { CadastrarUsuarioRota } from "./infra/api/express/rotas/usuario/cadastrarUsuario.express.route";
import { LoginUsuarioRota } from "./infra/api/express/rotas/usuario/loginUsuario.express.route";
import { AtualizarUsuarioRota } from "./infra/api/express/rotas/usuario/atualizarUsuario.express.route";
import { CadastrarDeckRota } from "./infra/api/express/rotas/deck/cadastrarDeck.express.route";
import { AtualizarDeckRota } from "./infra/api/express/rotas/deck/atualizarDeck.express.route";
import { ExcluirDeckRota } from "./infra/api/express/rotas/deck/excluirDeck.express.route";
import { ListarDecksRota } from "./infra/api/express/rotas/deck/listarDecks.express.route";
import { CriarTorneioRota } from "./infra/api/express/rotas/torneio/criarTorneio.express.route";
import { InscreverTorneioRota } from "./infra/api/express/rotas/torneio/inscreverTorneio.express.route";
import { CheckInTorneioRota } from "./infra/api/express/rotas/torneio/checkInTorneio.express.route";
import { EscolherDeckTorneioRota } from "./infra/api/express/rotas/torneio/escolherDeckTorneio.express.route";
import { IniciarTorneioRota } from "./infra/api/express/rotas/torneio/iniciarTorneio.express.route";
import { IniciarProximaRodadaRota } from "./infra/api/express/rotas/torneio/iniciarProximaRodada.express.route";
import { RegistrarResultadoRota } from "./infra/api/express/rotas/torneio/registrarResultado.express.route";
import { ListarTorneiosRota } from "./infra/api/express/rotas/torneio/listarTorneios.express.route";
import { BuscarTorneioRota } from "./infra/api/express/rotas/torneio/buscarTorneio.express.route";
import { BuscarStandingsRota } from "./infra/api/express/rotas/torneio/buscarStandings.express.route";
import { UsuarioRepositorio } from "./infra/mongodb/repositorios/usuarioRepositorio";
import { DeckRepositorio } from "./infra/mongodb/repositorios/deckRepositorio";
import { TorneioRepositorio } from "./infra/mongodb/repositorios/torneioRepositorio";
import { InscricaoRepositorio } from "./infra/mongodb/repositorios/inscricaoRepositorio";
import { PartidaRepositorio } from "./infra/mongodb/repositorios/partidaRepositorio";
import dotenv from "dotenv";

export function app() {
  dotenv.config();

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
  const cadastrarDeck = CadastrarDeck.criar(repositorios.deck);
  const atualizarDeck = AtualizarDeck.criar(repositorios.deck);
  const excluirDeck = ExcluirDeck.criar(repositorios.deck);
  const listarDecks = ListarDecks.criar(repositorios.deck);

  const criarTorneio = CriarTorneio.criar(repositorios.torneio);
  const inscreverTorneio = InscreverTorneio.criar(
    repositorios.torneio,
    repositorios.inscricao
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
    repositorios.partida
  );
  const iniciarProximaRodada = IniciarProximaRodada.criar(
    repositorios.torneio,
    repositorios.inscricao,
    repositorios.partida
  );
  const registrarResultado = RegistrarResultado.criar(
    repositorios.torneio,
    repositorios.partida
  );
  const listarTorneios = ListarTorneios.criar(repositorios.torneio);
  const buscarTorneio = BuscarTorneio.criar(repositorios.torneio);
  const buscarStandings = BuscarStandings.criar(
    repositorios.torneio,
    repositorios.inscricao,
    repositorios.partida
  );

  const cadastrarUsuarioRota = CadastrarUsuarioRota.criar(cadastrarUsuario);
  const loginUsuarioRota = LoginUsuarioRota.criar(loginUsuario);
  const atualizarUsuarioRota = AtualizarUsuarioRota.criar(atualizarUsuario);
  const cadastrarDeckRota = CadastrarDeckRota.criar(cadastrarDeck);
  const atualizarDeckRota = AtualizarDeckRota.criar(atualizarDeck);
  const excluirDeckRota = ExcluirDeckRota.criar(excluirDeck);
  const listarDecksRota = ListarDecksRota.criar(listarDecks);

  const criarTorneioRota = CriarTorneioRota.criar(criarTorneio);
  const inscreverTorneioRota = InscreverTorneioRota.criar(inscreverTorneio);
  const checkInTorneioRota = CheckInTorneioRota.criar(checkInTorneio);
  const escolherDeckTorneioRota = EscolherDeckTorneioRota.criar(escolherDeckTorneio);
  const iniciarTorneioRota = IniciarTorneioRota.criar(iniciarTorneio);
  const iniciarProximaRodadaRota = IniciarProximaRodadaRota.criar(iniciarProximaRodada);
  const registrarResultadoRota = RegistrarResultadoRota.criar(registrarResultado);
  const listarTorneiosRota = ListarTorneiosRota.criar(listarTorneios);
  const buscarTorneioRota = BuscarTorneioRota.criar(buscarTorneio);
  const buscarStandingsRota = BuscarStandingsRota.criar(buscarStandings);

  const port = Number(process.env.PORT) || 0;

  const api = ApiExpress.criar([
    cadastrarUsuarioRota,
    loginUsuarioRota,
    atualizarUsuarioRota,
    cadastrarDeckRota,
    atualizarDeckRota,
    excluirDeckRota,
    listarDecksRota,
    criarTorneioRota,
    inscreverTorneioRota,
    checkInTorneioRota,
    escolherDeckTorneioRota,
    iniciarTorneioRota,
    iniciarProximaRodadaRota,
    registrarResultadoRota,
    listarTorneiosRota,
    buscarTorneioRota,
    buscarStandingsRota,
  ]);

  api.start(port);

  return api.retornarAplicacao();
}
