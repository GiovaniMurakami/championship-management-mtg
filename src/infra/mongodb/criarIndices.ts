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
import "./repositorios/storyFundoRepositorio";
import "./repositorios/timeRepositorio";
import "./repositorios/tokenBlacklistRepositorio";
import "./repositorios/torneioRepositorio";
import "./repositorios/usuarioRepositorio";

dotenv.config();

/**
 * Sincroniza índices com o schema Mongoose:
 * cria os que faltam e remove os que não estão mais definidos (ex.: sort antigo por criadoEm).
 */
async function criarIndices(): Promise<void> {
  await conectarMongoDB();

  // Normaliza docs legados sem `secreto` para o índice parcial / filtro `secreto: false`
  const torneios = mongoose.models.Torneio;
  if (torneios) {
    const result = await torneios.collection.updateMany(
      { secreto: { $exists: false } },
      { $set: { secreto: false } },
    );
    if (result.modifiedCount > 0) {
      console.log(`Torneio: ${result.modifiedCount} docs legados com secreto=false`);
    }
  }

  for (const nomeModelo of mongoose.modelNames()) {
    const model = mongoose.model(nomeModelo);
    try {
      const removidos = await model.syncIndexes();
      const definidos = model.schema.indexes().length;
      console.log(
        `${nomeModelo}: ${definidos} indices no schema; sync OK` +
          (removidos.length ? `; removidos: ${removidos.join(", ")}` : ""),
      );
    } catch (error) {
      console.error(`${nomeModelo}: falha ao sincronizar indices`, error);
      throw error;
    }
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
