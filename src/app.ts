import { CadastrarUsuario } from "./casosDeUso/usuario/cadastrarUsuario";
import { LoginUsuario } from "./casosDeUso/usuario/loginUsuario";
import { AtualizarUsuario } from "./casosDeUso/usuario/atualizarUsuario";
import { CadastrarDeck } from "./casosDeUso/deck/cadastrarDeck";
import { AtualizarDeck } from "./casosDeUso/deck/atualizarDeck";
import { ExcluirDeck } from "./casosDeUso/deck/excluirDeck";
import { ListarDecks } from "./casosDeUso/deck/listarDecks";
import { ApiExpress } from "./infra/api/express/api.express";
import { CadastrarUsuarioRota } from "./infra/api/express/rotas/usuario/cadastrarUsuario.express.route";
import { LoginUsuarioRota } from "./infra/api/express/rotas/usuario/loginUsuario.express.route";
import { AtualizarUsuarioRota } from "./infra/api/express/rotas/usuario/atualizarUsuario.express.route";
import { CadastrarDeckRota } from "./infra/api/express/rotas/deck/cadastrarDeck.express.route";
import { AtualizarDeckRota } from "./infra/api/express/rotas/deck/atualizarDeck.express.route";
import { ExcluirDeckRota } from "./infra/api/express/rotas/deck/excluirDeck.express.route";
import { ListarDecksRota } from "./infra/api/express/rotas/deck/listarDecks.express.route";
import { UsuarioRepositorio } from "./infra/mongodb/repositorios/usuarioRepositorio";
import { DeckRepositorio } from "./infra/mongodb/repositorios/deckRepositorio";
import dotenv from "dotenv";

export function app() {
  dotenv.config();

  const repositorios = {
    usuario: UsuarioRepositorio.criar(),
    deck: DeckRepositorio.criar(),
  };

  const cadastrarUsuario = CadastrarUsuario.criar(repositorios.usuario);
  const loginUsuario = LoginUsuario.criar(repositorios.usuario);
  const atualizarUsuario = AtualizarUsuario.criar(repositorios.usuario);
  const cadastrarDeck = CadastrarDeck.criar(repositorios.deck);
  const atualizarDeck = AtualizarDeck.criar(repositorios.deck);
  const excluirDeck = ExcluirDeck.criar(repositorios.deck);
  const listarDecks = ListarDecks.criar(repositorios.deck);

  const cadastrarUsuarioRota = CadastrarUsuarioRota.criar(cadastrarUsuario);
  const loginUsuarioRota = LoginUsuarioRota.criar(loginUsuario);
  const atualizarUsuarioRota = AtualizarUsuarioRota.criar(atualizarUsuario);
  const cadastrarDeckRota = CadastrarDeckRota.criar(cadastrarDeck);
  const atualizarDeckRota = AtualizarDeckRota.criar(atualizarDeck);
  const excluirDeckRota = ExcluirDeckRota.criar(excluirDeck);
  const listarDecksRota = ListarDecksRota.criar(listarDecks);

  const port = Number(process.env.PORT) || 0;

  const api = ApiExpress.criar([
    cadastrarUsuarioRota,
    loginUsuarioRota,
    atualizarUsuarioRota,
    cadastrarDeckRota,
    atualizarDeckRota,
    excluirDeckRota,
    listarDecksRota,
  ]);

  api.start(port);

  return api.retornarAplicacao();
}
