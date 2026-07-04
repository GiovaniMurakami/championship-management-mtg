import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { randomUUID } from "crypto";
import { criarRepositorios } from "../src/composicao/repositorios";
import { criarServicos } from "../src/composicao/servicos";
import { Parceiro } from "../src/dominio/entidade/parceiro";
import { Apoiador } from "../src/dominio/entidade/apoiador";
import { conectarMongoDB } from "../src/infra/mongodb/conexao";
import { TipoConteudoImagem } from "../src/dominio/gateway/imagemGateway";

dotenv.config();

const PARCEIROS_SEED = [
  { nome: "Bandeira Cards", arquivo: "bandeira-cards.png", link: "https://www.bandeiracards.com.br/", urlRemota: "https://tiagofuguete.com.br/wp-content/uploads/2025/06/bandeira-cards.png" },
  { nome: "Capi Cards", arquivo: "capi-cards.png", link: "https://www.capicards.shop/?view=ecom/home", urlRemota: "https://tiagofuguete.com.br/wp-content/uploads/2026/01/Capi-Cards-2.png" },
  { nome: "CardTrader", arquivo: "cardtrader.png", link: "https://www.cardtrader.com/invite/FUGUETE05", urlRemota: "https://tiagofuguete.com.br/wp-content/uploads/2025/12/CardTrader_logo-sem-fundo.png" },
  { nome: "Dungeon Games", arquivo: "dungeon.png", link: "https://www.dungeongamesstore.com.br/", urlRemota: "https://tiagofuguete.com.br/wp-content/uploads/2025/07/dungeon.png" },
  { nome: "Elfo Man", arquivo: "elfoman.png", link: "http://www.elfoman.com.br/", urlRemota: "https://tiagofuguete.com.br/wp-content/uploads/2025/07/elfoman.png" },
  { nome: "Glorin", arquivo: "glorin.png", link: "https://www.glorin.com.br/glorin", urlRemota: "https://tiagofuguete.com.br/wp-content/uploads/2025/12/Glorin-Full-Logo.png" },
  { nome: "Mineral Games", arquivo: "mineral.png", link: "https://www.mineralgames.com.br/", urlRemota: "https://tiagofuguete.com.br/wp-content/uploads/2025/06/mineral.png" },
  { nome: "Mont Shop", arquivo: "montshop.png", link: "https://www.montshop.com.br/", urlRemota: "https://tiagofuguete.com.br/wp-content/uploads/2025/06/mont.png" },
  { nome: "Muka Traders", arquivo: "muka.png", link: "https://www.mukatraders.com.br/", urlRemota: "https://tiagofuguete.com.br/wp-content/uploads/2025/06/muka.png" },
  { nome: "Orbita Playmats", arquivo: "orbita.png", link: "https://www.instagram.com/orbitaplaymats/", urlRemota: "https://tiagofuguete.com.br/wp-content/uploads/2025/08/orbita300px2.png" },
  { nome: "Rei das Cartinhas", arquivo: "rei-das-cartinhas.png", link: "https://www.reidascartinhas.com.br/?view=ecom/home", urlRemota: "https://tiagofuguete.com.br/wp-content/uploads/2025/07/rei.png" },
  { nome: "Taverna Games", arquivo: "taverna-games.png", link: "https://www.lojatavernagames.com.br/?view=ecom/home", urlRemota: "https://tiagofuguete.com.br/wp-content/uploads/2025/07/taverna.png" },
  { nome: "TCG InBox", arquivo: "tcg-inbox.png", link: "https://tcginbox.com.br/", urlRemota: "https://tiagofuguete.com.br/wp-content/uploads/2025/08/TCG-Box-Colorido-scaled.png" },
];

const APOIADORES_SEED =
  "Adilson Roberto Alves Silva; alexandre queiroz galleti; Angelo Graper; Antonio Sérgio Ribeiro Junior; Augusto Alves; Bruno Campitelli Belchior; Bruno Costa Castro Alves; Carlos Eduardo de Aguiar Nogueira Gomes; Cesar Fabricio Klemes da Cruz; Daniel Ruiz Dias; Daniel Seether; DERLI TIAGO CASTILHO DE GODOIS SCHLICK; Diego Nogueira; Dionatan silvestre da silva; Edson Henrique Medeiros Silva; Fabio Lima; FABIO OLIVEIRA COSTA; Fagner Ferreira Barbosa; Felipe José do Nascimento Henrique; Felipe Lapena Barreto; Felipe Pedroso Camargo; Felipe Ramos; Felipe Tavares Batista; Filipe Silqueira Reis; Flavio Augusto de Carvalho Fialho; flavio sarto; FREDERICO ROCHA BAUMGRATZ; isaque angelo de oliveira saboia; João Prado; JORGE FERNANDO KIKUTA; José Rauryson Alves Bezerra; Julio Thibes; LEANDRO FLORESTA DOS SANTOS; Leandro Sanches Bermudes; Luan Kupka; Lucas Ribeiro; Lucas Stamford; Luiz Paulo Feliciano Guedes Pinto; Marcelo Miziara; Marcelo Shanks; Marcos Tadeu Secol Felix; Max Diávila Machado; Miguel Filipe Rodriguez Moure; PAULO GONÇALVES PEREIRA; PEDRO HENRIQUE MANZONI DE LIMA; Regis Lima Claus; Renan Carvalho; Roberto Borzuk Kneip Salimena; robson pereira; Rodrigo Flores; Serra Leno; Thais Vieira Oliveira; THIAGO HENRIQUE DE MATTOS; Vat Alexsandro; Vinicius Santos; VITOR V MORGADO; Yago Busatto Leal";

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function contentTypeFromFile(fileName: string): TipoConteudoImagem {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/png";
}

function resolveFrontPublicDir(): string | null {
  const candidates = [
    process.env.FRONT_PUBLIC_DIR,
    path.resolve(__dirname, "../../championship-management-mtg-front/public"),
    path.resolve(__dirname, "../championship-management-mtg-front/public"),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const parceirosDir = path.join(candidate, "images/landing/parceiros");
    if (fs.existsSync(parceirosDir)) return candidate;
  }

  return null;
}

async function carregarImagemParceiro(
  item: (typeof PARCEIROS_SEED)[number],
  parceirosDir: string | null,
): Promise<{ body: Buffer; contentType: TipoConteudoImagem; ext: string } | null> {
  const filePath = parceirosDir ? path.join(parceirosDir, item.arquivo) : null;
  if (filePath && fs.existsSync(filePath)) {
    return {
      body: fs.readFileSync(filePath),
      contentType: contentTypeFromFile(item.arquivo),
      ext: path.extname(item.arquivo),
    };
  }

  if (!item.urlRemota) return null;

  const response = await fetch(item.urlRemota);
  if (!response.ok) {
    console.warn(`Falha ao baixar imagem remota (${response.status}): ${item.urlRemota}`);
    return null;
  }

  const contentTypeHeader = response.headers.get("content-type") || "image/png";
  const contentType = contentTypeHeader.split(";")[0].trim() as TipoConteudoImagem;
  const extFromUrl = path.extname(new URL(item.urlRemota).pathname) || path.extname(item.arquivo) || ".png";
  const arrayBuffer = await response.arrayBuffer();

  return {
    body: Buffer.from(arrayBuffer),
    contentType: contentType.startsWith("image/") ? contentType : contentTypeFromFile(item.arquivo),
    ext: extFromUrl,
  };
}

async function main() {
  await conectarMongoDB();
  const repos = criarRepositorios();
  const servicos = criarServicos();
  const publicDir = resolveFrontPublicDir();
  const parceirosDir = publicDir ? path.join(publicDir, "images/landing/parceiros") : null;

  const existentes = await repos.parceiro.listar(false);
  const nomesExistentes = new Set(existentes.map((item) => item.nome.toLowerCase()));

  let parceirosImportados = 0;
  let parceirosIgnorados = 0;

  for (let index = 0; index < PARCEIROS_SEED.length; index += 1) {
    const item = PARCEIROS_SEED[index];
    if (nomesExistentes.has(item.nome.toLowerCase())) {
      parceirosIgnorados += 1;
      continue;
    }

    const imagem = await carregarImagemParceiro(item, parceirosDir);
    if (!imagem) {
      console.warn(`Imagem não encontrada para parceiro: ${item.nome}`);
      continue;
    }

    const chave = `imagens/parceiros/${slugify(item.nome)}-${randomUUID().slice(0, 8)}${imagem.ext}`;
    const upload = await servicos.s3.enviarImagem({ chave, contentType: imagem.contentType, body: imagem.body });

    const parceiro = Parceiro.criar({
      nome: item.nome,
      imagemUrl: upload.urlPublica,
      linkUrl: item.link,
      ordem: index,
      ativo: true,
    });
    await repos.parceiro.salvar(parceiro);
    parceirosImportados += 1;
  }

  const apoiadoresExistentes = await repos.apoiador.listar(false);
  const apoiadoresNomes = new Set(apoiadoresExistentes.map((item) => item.nome.toLowerCase()));
  const nomesApoiadores = APOIADORES_SEED.split(";").map((nome) => nome.trim()).filter(Boolean);

  let apoiadoresImportados = 0;
  let apoiadoresIgnorados = 0;

  for (let index = 0; index < nomesApoiadores.length; index += 1) {
    const nome = nomesApoiadores[index];
    if (apoiadoresNomes.has(nome.toLowerCase())) {
      apoiadoresIgnorados += 1;
      continue;
    }

    await repos.apoiador.salvar(Apoiador.criar({ nome, ordem: index, ativo: true }));
    apoiadoresImportados += 1;
  }

  console.log(
    `Parceiros: ${parceirosImportados} importados, ${parceirosIgnorados} ignorados. Apoiadores: ${apoiadoresImportados} importados, ${apoiadoresIgnorados} ignorados.`,
  );
}

main()
  .then(async () => {
    await mongoose.disconnect();
  })
  .catch(async (error) => {
    console.error("Falha ao importar parceiros e apoiadores.", error);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
