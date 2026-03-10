import mongoose from "mongoose";

let conexao: mongoose.Connection | null = null;

export async function conectarMongoDB(): Promise<mongoose.Connection> {
  if (conexao && conexao.readyState === 1) {
    return conexao;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI não configurada.");
  }

  try {
    await mongoose.connect(uri, {
      // Lambda + Atlas pode oscilar no primeiro handshake DNS/TLS.
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 30000,
      maxPoolSize: 10,
      family: 4,
      tls: true,
      retryWrites: true,
    });
  } catch (error) {
    const detalhes =
      error instanceof Error ? error.message : "Falha desconhecida ao conectar no MongoDB.";

    throw new Error(
      [
        "Falha ao conectar no MongoDB.",
        "Verifique se o Atlas permite acesso de rede da AWS Lambda (Network Access).",
        "Confirme usuário/senha da MONGODB_URI e se a senha está URL-encoded.",
        "Confirme se o cluster está ativo e com TLS habilitado.",
        `Detalhe técnico: ${detalhes}`,
      ].join(" ")
    );
  }

  conexao = mongoose.connection;
  return conexao;
}
