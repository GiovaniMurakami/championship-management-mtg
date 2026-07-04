import mongoose from "mongoose";
import dotenv from "dotenv";
import { conectarMongoDB } from "./conexao";
import "./rateLimitStore";
import "./repositorios/deckRepositorio";
import "./repositorios/inscricaoRepositorio";
import "./repositorios/ligaRepositorio";
import "./repositorios/linkIngressoRepositorio";
import "./repositorios/loginAttemptRepositorio";
import "./repositorios/partidaRepositorio";
import "./repositorios/refreshTokenRepositorio";
import "./repositorios/resetSenhaRepositorio";
import "./repositorios/siteConfigRepositorio";
import "./repositorios/postBlogRepositorio";
import "./repositorios/parceiroRepositorio";
import "./repositorios/apoiadorRepositorio";
import "./repositorios/timeRepositorio";
import "./repositorios/tokenBlacklistRepositorio";
import "./repositorios/torneioRepositorio";
import "./repositorios/usuarioRepositorio";

dotenv.config();

async function criarIndices(): Promise<void> {
  await conectarMongoDB();

  for (const nomeModelo of mongoose.modelNames()) {
    const model = mongoose.model(nomeModelo);
    const indices = model.schema.indexes();
    let criados = 0;
    let pulados = 0;

    for (const [campos, opcoes] of indices) {
      try {
        await model.collection.createIndex(
          campos as Record<string, 1 | -1 | "text">,
          opcoes as mongoose.mongo.CreateIndexesOptions
        );
        criados += 1;
      } catch (error) {
        if (error instanceof Error && "code" in error && [85, 86].includes(Number(error.code))) {
          pulados += 1;
          console.warn(`${nomeModelo}: indice conflitante pulado (${JSON.stringify(campos)})`);
          continue;
        }
        throw error;
      }
    }

    console.log(`${nomeModelo}: ${criados} indices criados/verificados${pulados ? `; ${pulados} pulados por conflito` : ""}`);
  }
}

criarIndices()
  .then(async () => {
    await mongoose.disconnect();
  })
  .catch(async (error) => {
    console.error("Falha ao criar/verificar indices do MongoDB.", error);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
