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

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
  });

  conexao = mongoose.connection;
  return conexao;
}
