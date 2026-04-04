import { ApiExpress } from "./infra/api/express/api.express";
import { NotificacaoAbly } from "./infra/ably/notificacaoAbly";
import { inicializarAutenticarJwt } from "./middlewares/express/autenticarJwt";
import { criarRepositorios } from "./composicao/repositorios";
import { criarServicos } from "./composicao/servicos";
import { criarCasosDeUso } from "./composicao/casos";
import { criarRotas } from "./composicao/rotas";
import dotenv from "dotenv";

dotenv.config();

const requiredEnvVars = ["MONGODB_URI", "JWT_SECRET"] as const;
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Variável de ambiente obrigatória não definida: ${envVar}`);
  }
}

NotificacaoAbly.iniciar();

export function app() {
  const repos = criarRepositorios();
  const servicos = criarServicos();
  const casos = criarCasosDeUso(repos, servicos);
  const rotas = criarRotas(casos);

  // Injeta o repositório compartilhado no middleware autenticarJwt (evita criação duplicada)
  inicializarAutenticarJwt(repos.tokenBlacklist);

  const port = Number(process.env.PORT) || 0;
  const api = ApiExpress.criar(rotas);
  api.start(port);

  return api.retornarAplicacao();
}
