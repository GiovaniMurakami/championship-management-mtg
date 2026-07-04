import dotenv from "dotenv";
import mongoose from "mongoose";
import { criarRepositorios } from "../src/composicao/repositorios";
import { ImportarPostsWordpress } from "../src/casosDeUso/blog/importarPostsWordpress";
import { conectarMongoDB } from "../src/infra/mongodb/conexao";

dotenv.config();

async function main() {
  await conectarMongoDB();
  const repos = criarRepositorios();
  const importar = ImportarPostsWordpress.criar(repos.postBlog);
  const resultado = await importar.executar();
  console.log(`Importação concluída: ${resultado.importados} novos, ${resultado.ignorados} já existentes.`);
}

main()
  .then(async () => {
    await mongoose.disconnect();
  })
  .catch(async (error) => {
    console.error("Falha ao importar posts do WordPress.", error);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
