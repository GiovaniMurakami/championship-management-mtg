import mongoose from "mongoose";
import { logger } from "../../helpers/logger";

let conexao: mongoose.Connection | null = null;
let conexaoEmAndamento: Promise<mongoose.Connection> | null = null;

function obterMaxPoolSize(): number {
  const configurado = Number(process.env.MONGODB_MAX_POOL_SIZE);
  if (Number.isFinite(configurado) && configurado > 0) {
    return configurado;
  }
  return process.env.AWS_LAMBDA_FUNCTION_NAME ? 1 : 10;
}

function contextoMongo() {
  return {
    maxPoolSize: obterMaxPoolSize(),
    lambda: process.env.AWS_LAMBDA_FUNCTION_NAME || null,
    logStream: process.env.AWS_LAMBDA_LOG_STREAM_NAME || null,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host || null,
  };
}

export async function conectarMongoDB(): Promise<mongoose.Connection> {
  if (conexao && conexao.readyState === 1) {
    logger.debug({ mongo: contextoMongo() }, "[MongoDB] Reutilizando conexão existente");
    return conexao;
  }

  if (conexaoEmAndamento) {
    logger.info({ mongo: contextoMongo() }, "[MongoDB] Aguardando conexão em andamento");
    return conexaoEmAndamento;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI não configurada.");
  }

  conexaoEmAndamento = (async () => {
    try {
      logger.info({ mongo: contextoMongo() }, "[MongoDB] Nova conexão sendo criada");

      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 25000,
        maxPoolSize: obterMaxPoolSize(),
        minPoolSize: 0,
        family: 4,
        tls: true,
        retryWrites: true,
        readPreference: "primary",
      });

      conexao = mongoose.connection;

      logger.info(
        {
          mongo: {
            ...contextoMongo(),
            readyState: conexao.readyState,
            host: conexao.host,
            name: conexao.name,
          },
        },
        "[MongoDB] Conexão estabelecida"
      );

      return conexao;
    } catch (error) {
      const detalhes =
        error instanceof Error ? error.message : "Falha desconhecida ao conectar no MongoDB.";

      logger.error({ err: error, mongo: contextoMongo() }, "[MongoDB] Falha ao conectar");

      throw new Error(
        [
          "Falha ao conectar no MongoDB.",
          "Verifique se o Atlas permite acesso de rede da AWS Lambda (Network Access).",
          "Confirme usuário/senha da MONGODB_URI e se a senha está URL-encoded.",
          "Confirme se o cluster está ativo e com TLS habilitado.",
          `Detalhe técnico: ${detalhes}`,
        ].join(" ")
      );
    } finally {
      conexaoEmAndamento = null;
    }
  })();

  return conexaoEmAndamento;
}
