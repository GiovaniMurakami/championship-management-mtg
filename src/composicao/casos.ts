import { CadastrarUsuario } from "../casosDeUso/usuario/cadastrarUsuario";
import { LoginUsuario } from "../casosDeUso/usuario/loginUsuario";
import { AtualizarUsuario } from "../casosDeUso/usuario/atualizarUsuario";
import { RefreshToken } from "../casosDeUso/usuario/refreshToken";
import { LogoutUsuario } from "../casosDeUso/usuario/logoutUsuario";
import { SolicitarResetSenha } from "../casosDeUso/usuario/solicitarResetSenha";
import { ConfirmarResetSenha } from "../casosDeUso/usuario/confirmarResetSenha";
import { ListarUsuarios } from "../casosDeUso/usuario/listarUsuarios";
import { BuscarPerfilPublico } from "../casosDeUso/usuario/buscarPerfilPublico";
import { AlterarBloqueioTorneios } from "../casosDeUso/usuario/alterarBloqueioTorneios";
import { ExcluirConta } from "../casosDeUso/usuario/excluirConta";
import { CadastrarDeck } from "../casosDeUso/deck/cadastrarDeck";
import { AtualizarDeck } from "../casosDeUso/deck/atualizarDeck";
import { ExcluirDeck } from "../casosDeUso/deck/excluirDeck";
import { BuscarDeck } from "../casosDeUso/deck/buscarDeck";
import { ListarDecks } from "../casosDeUso/deck/listarDecks";
import { GerarUrlUploadImagem } from "../casosDeUso/imagem/gerarUrlUploadImagem";
import { CriarPost } from "../casosDeUso/post/criarPost";
import { ListarPosts } from "../casosDeUso/post/listarPosts";
import { ComentarPost } from "../casosDeUso/post/comentarPost";
import { CurtirPost } from "../casosDeUso/post/curtirPost";
import { ExcluirPost } from "../casosDeUso/post/excluirPost";
import { BuscarPost } from "../casosDeUso/post/buscarPost";
import { EditarPost } from "../casosDeUso/post/editarPost";
import { CriarTorneio } from "../casosDeUso/torneio/criarTorneio";
import { InscreverTorneio } from "../casosDeUso/torneio/inscreverTorneio";
import { CheckInTorneio } from "../casosDeUso/torneio/checkInTorneio";
import { EscolherDeckTorneio } from "../casosDeUso/torneio/escolherDeckTorneio";
import { IniciarTorneio } from "../casosDeUso/torneio/iniciarTorneio";
import { IniciarProximaRodada } from "../casosDeUso/torneio/iniciarProximaRodada";
import { RefazerRodada } from "../casosDeUso/torneio/refazerRodada";
import { AjustarTotalRodadas } from "../casosDeUso/torneio/ajustarTotalRodadas";
import { EncerrarTorneio } from "../casosDeUso/torneio/encerrarTorneio";
import { RegistrarResultado } from "../casosDeUso/torneio/registrarResultado";
import { ContestarResultado } from "../casosDeUso/torneio/contestarResultado";
import { ConfirmarResultado } from "../casosDeUso/torneio/confirmarResultado";
import { AtualizarMesaPartida } from "../casosDeUso/torneio/atualizarMesaPartida";
import { AtualizarPareamentosRodada } from "../casosDeUso/torneio/atualizarPareamentosRodada";
import { DroparJogador } from "../casosDeUso/torneio/droparJogador";
import { DroparJogadoresSemDeck } from "../casosDeUso/torneio/droparJogadoresSemDeck";
import { DroparJogadoresSemCheckin } from "../casosDeUso/torneio/droparJogadoresSemCheckin";
import { DesdroparJogador } from "../casosDeUso/torneio/desdroparJogador";
import { ListarTorneios } from "../casosDeUso/torneio/listarTorneios";
import { BuscarTorneio } from "../casosDeUso/torneio/buscarTorneio";
import { BuscarSeoTorneio } from "../casosDeUso/torneio/buscarSeoTorneio";
import { BuscarStandings } from "../casosDeUso/torneio/buscarStandings";
import { MeuHistoricoTorneio } from "../casosDeUso/torneio/meuHistoricoTorneio";
import { ListarPartidasTorneio } from "../casosDeUso/torneio/listarPartidasTorneio";
import { AlterarTorneio } from "../casosDeUso/torneio/alterarTorneio";
import { ExcluirTorneio } from "../casosDeUso/torneio/excluirTorneio";
import { GerarLinkIngresso } from "../casosDeUso/torneio/gerarLinkIngresso";
import { IngressarViaTorneio } from "../casosDeUso/torneio/ingressarViaTorneio";
import { AjustarResultado } from "../casosDeUso/torneio/ajustarResultado";
import { DefinirAnfitriaoTorneio } from "../casosDeUso/torneio/definirAnfitriaoTorneio";
import { CriarLiga } from "../casosDeUso/liga/criarLiga";
import { AlterarLiga } from "../casosDeUso/liga/alterarLiga";
import { ExcluirLiga } from "../casosDeUso/liga/excluirLiga";
import { ListarLigas } from "../casosDeUso/liga/listarLigas";
import { BuscarLiga } from "../casosDeUso/liga/buscarLiga";
import { RankingLiga } from "../casosDeUso/liga/rankingLiga";
import { CriarTime } from "../casosDeUso/time/criarTime";
import { ListarTimes } from "../casosDeUso/time/listarTimes";
import { BuscarTime } from "../casosDeUso/time/buscarTime";
import { AlterarTime } from "../casosDeUso/time/alterarTime";
import { ExcluirTime } from "../casosDeUso/time/excluirTime";
import { EntrarTime } from "../casosDeUso/time/entrarTime";
import { SairTime } from "../casosDeUso/time/sairTime";
import { GerarConviteTime } from "../casosDeUso/time/gerarConviteTime";
import { EntrarPorConviteTime } from "../casosDeUso/time/entrarPorConviteTime";
import { SolicitarEntradaTime } from "../casosDeUso/time/solicitarEntradaTime";
import { AprovarSolicitacaoTime } from "../casosDeUso/time/aprovarSolicitacaoTime";
import { RejeitarSolicitacaoTime } from "../casosDeUso/time/rejeitarSolicitacaoTime";
import { BuscarAnuncios } from "../casosDeUso/site/buscarAnuncios";
import { BuscarEstatisticasSite } from "../casosDeUso/site/buscarEstatisticasSite";
import { RegistrarCliqueAnuncio } from "../casosDeUso/site/registrarCliqueAnuncio";
import { SalvarAnuncios } from "../casosDeUso/site/salvarAnuncios";
import { CadastrarStoryFundo } from "../casosDeUso/storyFundo/cadastrarStoryFundo";
import { ListarStoryFundos } from "../casosDeUso/storyFundo/listarStoryFundos";
import { ExcluirStoryFundo } from "../casosDeUso/storyFundo/excluirStoryFundo";
import { ListarMetagame } from "../casosDeUso/metagame/listarMetagame";
import { BuscarArquetipoMetagame } from "../casosDeUso/metagame/buscarArquetipoMetagame";
import { type Repositorios } from "./repositorios";
import { type Servicos } from "./servicos";

export function criarCasosDeUso(repos: Repositorios, servicos: Servicos) {
    // --- Usuário ---
    const cadastrarUsuario = CadastrarUsuario.criar(repos.usuario, servicos.email);
    const loginUsuario = LoginUsuario.criar(repos.usuario, repos.loginAttempt, repos.refreshToken, servicos.email, repos.resetSenha);
    const atualizarUsuario = AtualizarUsuario.criar(repos.usuario);
    const refreshToken = RefreshToken.criar(repos.usuario, repos.refreshToken);
    const logoutUsuario = LogoutUsuario.criar(repos.tokenBlacklist, repos.refreshToken);
    const solicitarResetSenha = SolicitarResetSenha.criar(repos.usuario, repos.resetSenha, servicos.email);
    const confirmarResetSenha = ConfirmarResetSenha.criar(repos.usuario, repos.resetSenha);
    const listarUsuarios = ListarUsuarios.criar(repos.usuario);
    const buscarPerfilPublico = BuscarPerfilPublico.criar(repos.usuario, repos.deck, repos.partida, repos.torneio);
    const alterarBloqueioTorneios = AlterarBloqueioTorneios.criar(
      repos.usuario,
      repos.inscricao,
      repos.torneio,
    );
    const excluirConta = ExcluirConta.criar(
      repos.usuario,
      repos.torneio,
      repos.time,
      repos.refreshToken,
      repos.resetSenha,
      repos.loginAttempt,
    );

    // --- Deck ---
    const cadastrarDeck = CadastrarDeck.criar(repos.deck);
    const atualizarDeck = AtualizarDeck.criar(repos.deck);
    const excluirDeck = ExcluirDeck.criar(repos.deck);
    const buscarDeck = BuscarDeck.criar(repos.deck, repos.usuario, repos.partida);
    const listarDecks = ListarDecks.criar(repos.deck, repos.usuario);

    // --- Imagem ---
    const gerarUrlUploadImagem = GerarUrlUploadImagem.criar(servicos.s3);
    const criarPost = CriarPost.criar(repos.post);
    const listarPosts = ListarPosts.criar(repos.post, repos.usuario);
    const buscarPost = BuscarPost.criar(repos.post, repos.usuario);
    const editarPost = EditarPost.criar(repos.post, servicos.s3);
    const comentarPost = ComentarPost.criar(repos.post);
    const curtirPost = CurtirPost.criar(repos.post);
    const excluirPost = ExcluirPost.criar(repos.post, servicos.s3);

    // --- Torneio ---
    const criarTorneio = CriarTorneio.criar(repos.torneio);
    const inscreverTorneio = InscreverTorneio.criar(repos.torneio, repos.inscricao, repos.usuario);
    const checkInTorneio = CheckInTorneio.criar(repos.torneio, repos.inscricao, repos.usuario);
    const escolherDeckTorneio = EscolherDeckTorneio.criar(repos.torneio, repos.inscricao, repos.deck, repos.usuario);
    const iniciarTorneio = IniciarTorneio.criar(repos.torneio, repos.inscricao, repos.partida, repos.usuario);
    const iniciarProximaRodada = IniciarProximaRodada.criar(repos.torneio, repos.inscricao, repos.partida, repos.usuario);
    const refazerRodada = RefazerRodada.criar(repos.torneio, repos.partida);
    const ajustarTotalRodadas = AjustarTotalRodadas.criar(repos.torneio);
    const encerrarTorneio = EncerrarTorneio.criar(repos.torneio);
    const registrarResultado = RegistrarResultado.criar(repos.torneio, repos.partida);
    const contestarResultado = ContestarResultado.criar(repos.torneio, repos.partida);
    const confirmarResultado = ConfirmarResultado.criar(repos.torneio, repos.partida);
    const atualizarMesaPartida = AtualizarMesaPartida.criar(repos.torneio, repos.partida);
    const atualizarPareamentosRodada = AtualizarPareamentosRodada.criar(repos.torneio, repos.inscricao, repos.partida, repos.usuario);
    const droparJogador = DroparJogador.criar(repos.torneio, repos.inscricao, repos.usuario, repos.partida);
    const droparJogadoresSemDeck = DroparJogadoresSemDeck.criar(repos.torneio, repos.inscricao, droparJogador);
    const droparJogadoresSemCheckin = DroparJogadoresSemCheckin.criar(repos.torneio, repos.inscricao, droparJogador);
    const desdroparJogador = DesdroparJogador.criar(repos.torneio, repos.inscricao, repos.usuario, repos.partida);
    const listarTorneios = ListarTorneios.criar(repos.torneio, repos.inscricao, servicos.cache);
    const buscarTorneio = BuscarTorneio.criar(repos.torneio, repos.inscricao, repos.partida, repos.usuario);
    const buscarSeoTorneio = BuscarSeoTorneio.criar(repos.torneio, servicos.cache);
    const buscarStandings = BuscarStandings.criar(repos.torneio, repos.inscricao, repos.partida, repos.usuario, repos.deck, repos.time, servicos.cache);
    const meuHistoricoTorneio = MeuHistoricoTorneio.criar(repos.torneio, repos.partida, repos.usuario);
    const listarPartidasTorneio = ListarPartidasTorneio.criar(repos.torneio, repos.partida, repos.usuario, servicos.cache);
    const alterarTorneio = AlterarTorneio.criar(repos.torneio);
    const excluirTorneio = ExcluirTorneio.criar(repos.torneio);
    const gerarLinkIngresso = GerarLinkIngresso.criar(repos.torneio, repos.linkIngresso);
    const ingressarViaTorneio = IngressarViaTorneio.criar(repos.torneio, repos.inscricao, repos.partida, repos.usuario, repos.linkIngresso, repos.deck);
    const ajustarResultado = AjustarResultado.criar(repos.torneio, repos.partida);
    const definirAnfitriaoTorneio = DefinirAnfitriaoTorneio.criar(repos.torneio, repos.usuario);

    // --- Liga ---
    const criarLiga = CriarLiga.criar(repos.liga, repos.torneio, servicos.cache);
    const alterarLiga = AlterarLiga.criar(repos.liga, repos.torneio, servicos.cache);
    const excluirLiga = ExcluirLiga.criar(repos.liga, servicos.cache);
    const listarLigas = ListarLigas.criar(repos.liga);
    const buscarLiga = BuscarLiga.criar(repos.liga, repos.torneio);
    const rankingLiga = RankingLiga.criar(repos.liga, repos.partida, repos.inscricao, repos.deck, repos.usuario, repos.time, servicos.cache);

    // --- Time ---
    const criarTime = CriarTime.criar(repos.time);
    const listarTimes = ListarTimes.criar(repos.time);
    const buscarTime = BuscarTime.criar(repos.time, repos.usuario, repos.inscricao, repos.partida);
    const alterarTime = AlterarTime.criar(repos.time);
    const excluirTime = ExcluirTime.criar(repos.time);
    const entrarTime = EntrarTime.criar(repos.time, repos.usuario);
    const sairTime = SairTime.criar(repos.time);
    const gerarConviteTime = GerarConviteTime.criar(repos.time);
    const entrarPorConviteTime = EntrarPorConviteTime.criar(repos.time, repos.usuario);
    const solicitarEntradaTime = SolicitarEntradaTime.criar(repos.time);
    const aprovarSolicitacaoTime = AprovarSolicitacaoTime.criar(repos.time, repos.usuario);
    const rejeitarSolicitacaoTime = RejeitarSolicitacaoTime.criar(repos.time);

    // --- Site ---
    const buscarAnuncios = BuscarAnuncios.criar(repos.siteConfig, servicos.cache);
    const buscarEstatisticasSite = BuscarEstatisticasSite.criar(repos.torneio, repos.inscricao);
    const registrarCliqueAnuncio = RegistrarCliqueAnuncio.criar(repos.siteConfig, servicos.cache);
    const salvarAnuncios = SalvarAnuncios.criar(repos.siteConfig, servicos.cache);

    const cadastrarStoryFundo = CadastrarStoryFundo.criar(repos.storyFundo);
    const listarStoryFundos = ListarStoryFundos.criar(repos.storyFundo);
    const excluirStoryFundo = ExcluirStoryFundo.criar(repos.storyFundo);

    const listarMetagame = ListarMetagame.criar(
        repos.torneio, repos.inscricao, repos.partida, repos.deck, repos.usuario, servicos.cache
    );
    const buscarArquetipoMetagame = BuscarArquetipoMetagame.criar(
        repos.torneio, repos.inscricao, repos.partida, repos.deck, repos.usuario, servicos.cache
    );

    return {
        cadastrarUsuario, loginUsuario, atualizarUsuario, refreshToken, logoutUsuario,
        solicitarResetSenha, confirmarResetSenha, listarUsuarios, buscarPerfilPublico, alterarBloqueioTorneios, excluirConta,
        cadastrarDeck, atualizarDeck, excluirDeck, buscarDeck, listarDecks,
        gerarUrlUploadImagem,
        criarPost, listarPosts, buscarPost, editarPost, comentarPost, curtirPost, excluirPost,
        criarTorneio, inscreverTorneio, checkInTorneio, escolherDeckTorneio,
        iniciarTorneio, iniciarProximaRodada, refazerRodada, ajustarTotalRodadas, encerrarTorneio, registrarResultado, contestarResultado, confirmarResultado, atualizarMesaPartida, atualizarPareamentosRodada,
        droparJogador, droparJogadoresSemDeck, droparJogadoresSemCheckin, desdroparJogador, listarTorneios, buscarTorneio, buscarSeoTorneio, buscarStandings,
        meuHistoricoTorneio, listarPartidasTorneio, alterarTorneio, excluirTorneio,
        gerarLinkIngresso, ingressarViaTorneio, ajustarResultado, definirAnfitriaoTorneio,
        criarLiga, alterarLiga, excluirLiga, listarLigas, buscarLiga, rankingLiga,
        criarTime, listarTimes, buscarTime, alterarTime, excluirTime, entrarTime, sairTime,
        gerarConviteTime, entrarPorConviteTime, solicitarEntradaTime, aprovarSolicitacaoTime, rejeitarSolicitacaoTime,
        buscarAnuncios, buscarEstatisticasSite, registrarCliqueAnuncio, salvarAnuncios,
        cadastrarStoryFundo, listarStoryFundos, excluirStoryFundo,
        listarMetagame, buscarArquetipoMetagame,
    };
}

export type CasosDeUso = ReturnType<typeof criarCasosDeUso>;
