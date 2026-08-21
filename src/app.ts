import { ApiExpress } from "./infra/api/express/api.express";
import { NotificacaoAbly } from "./infra/ably/notificacaoAbly";
import { inicializarAutenticarJwt } from "./middlewares/express/autenticarJwt";
import { criarRepositorios } from "./composicao/repositorios";
import { criarServicos } from "./composicao/servicos";
import { criarCasosDeUso } from "./composicao/casos";
import { criarRotas } from "./composicao/rotas";
import { assertJwtConfig } from "./helpers/jwt";
import { iniciarInvalidadorCacheTorneio } from "./infra/cache/invalidadorCacheTorneio";
import dotenv from "dotenv";

if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  dotenv.config();
}

let runtimeInicializado = false;

function validarConfiguracaoRuntime(): void {
  if (!process.env.DYNAMODB_DATA_TABLE) {
    throw new Error("Variável de ambiente obrigatória não definida: DYNAMODB_DATA_TABLE");
  }

  assertJwtConfig();
}

export function inicializarDependenciasDeProcesso(): void {
  if (runtimeInicializado) return;

  if (process.env.ABLY_API_KEY) {
    NotificacaoAbly.iniciar();
  }

  runtimeInicializado = true;
}

export function app() {
  validarConfiguracaoRuntime();

  const repos = criarRepositorios();
  const servicos = criarServicos();
  iniciarInvalidadorCacheTorneio(servicos.cache);
  const casos = criarCasosDeUso(repos, servicos);
  const rotas = criarRotas(casos);

  inicializarAutenticarJwt(repos.tokenBlacklist);

  const api = ApiExpress.criar(rotas);
  return api.retornarAplicacao();
}
