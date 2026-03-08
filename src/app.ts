import { CadastrarUsuario } from "./casosDeUso/usuario/cadastrarUsuario";
import { LoginUsuario } from "./casosDeUso/usuario/loginUsuario";
import { ApiExpress } from "./infra/api/express/api.express";
import { CadastrarUsuarioRota } from "./infra/api/express/rotas/usuario/cadastrarUsuario.express.route";
import { LoginUsuarioRota } from "./infra/api/express/rotas/usuario/loginUsuario.express.route";
import { UsuarioRepositorio } from "./infra/mongodb/repositorios/usuarioRepositorio";
import dotenv from "dotenv";

export function app() {
  dotenv.config();

  const repositorios = {
    usuario: UsuarioRepositorio.criar(),
  };

  const cadastrarUsuario = CadastrarUsuario.criar(repositorios.usuario);
  const loginUsuario = LoginUsuario.criar(repositorios.usuario);

  const cadastrarUsuarioRota = CadastrarUsuarioRota.criar(cadastrarUsuario);
  const loginUsuarioRota = LoginUsuarioRota.criar(loginUsuario);

  const port = Number(process.env.PORT) || 0;

  const api = ApiExpress.criar([cadastrarUsuarioRota, loginUsuarioRota]);

  api.start(port);

  return api.retornarAplicacao();
}
