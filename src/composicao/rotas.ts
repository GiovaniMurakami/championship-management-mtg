import { CadastrarUsuarioRota } from "../infra/api/express/rotas/usuario/cadastrarUsuario.express.route";
import { LoginUsuarioRota } from "../infra/api/express/rotas/usuario/loginUsuario.express.route";
import { AtualizarUsuarioRota } from "../infra/api/express/rotas/usuario/atualizarUsuario.express.route";
import { RefreshTokenRota } from "../infra/api/express/rotas/usuario/refreshToken.express.route";
import { LogoutUsuarioRota } from "../infra/api/express/rotas/usuario/logoutUsuario.express.route";
import { SolicitarResetSenhaRota } from "../infra/api/express/rotas/usuario/solicitarResetSenha.express.route";
import { ConfirmarResetSenhaRota } from "../infra/api/express/rotas/usuario/confirmarResetSenha.express.route";
import { ListarUsuariosRota } from "../infra/api/express/rotas/usuario/listarUsuarios.express.route";
import { BuscarPerfilPublicoRota } from "../infra/api/express/rotas/usuario/buscarPerfilPublico.express.route";
import { AlterarBloqueioTorneiosRota } from "../infra/api/express/rotas/usuario/alterarBloqueioTorneios.express.route";
import { ExcluirContaRota } from "../infra/api/express/rotas/usuario/excluirConta.express.route";
import { CadastrarDeckRota } from "../infra/api/express/rotas/deck/cadastrarDeck.express.route";
import { AtualizarDeckRota } from "../infra/api/express/rotas/deck/atualizarDeck.express.route";
import { ExcluirDeckRota } from "../infra/api/express/rotas/deck/excluirDeck.express.route";
import { BuscarDeckRota } from "../infra/api/express/rotas/deck/buscarDeck.express.route";
import { ListarDecksRota } from "../infra/api/express/rotas/deck/listarDecks.express.route";
import { CriarTorneioRota } from "../infra/api/express/rotas/torneio/criarTorneio.express.route";
import { InscreverTorneioRota } from "../infra/api/express/rotas/torneio/inscreverTorneio.express.route";
import { CheckInTorneioRota } from "../infra/api/express/rotas/torneio/checkInTorneio.express.route";
import { EscolherDeckTorneioRota } from "../infra/api/express/rotas/torneio/escolherDeckTorneio.express.route";
import { IniciarTorneioRota } from "../infra/api/express/rotas/torneio/iniciarTorneio.express.route";
import { IniciarProximaRodadaRota } from "../infra/api/express/rotas/torneio/iniciarProximaRodada.express.route";
import { RefazerRodadaRota } from "../infra/api/express/rotas/torneio/refazerRodada.express.route";
import { AjustarTotalRodadasRota } from "../infra/api/express/rotas/torneio/ajustarTotalRodadas.express.route";
import { EncerrarTorneioRota } from "../infra/api/express/rotas/torneio/encerrarTorneio.express.route";
import { RegistrarResultadoRota } from "../infra/api/express/rotas/torneio/registrarResultado.express.route";
import { ContestarResultadoRota } from "../infra/api/express/rotas/torneio/contestarResultado.express.route";
import { ConfirmarResultadoRota } from "../infra/api/express/rotas/torneio/confirmarResultado.express.route";
import { AtualizarMesaPartidaRota } from "../infra/api/express/rotas/torneio/atualizarMesaPartida.express.route";
import { AtualizarPareamentosRodadaRota } from "../infra/api/express/rotas/torneio/atualizarPareamentosRodada.express.route";
import { DroparJogadorRota } from "../infra/api/express/rotas/torneio/droparJogador.express.route";
import { DroparJogadoresSemDeckRota } from "../infra/api/express/rotas/torneio/droparJogadoresSemDeck.express.route";
import { DroparJogadoresSemCheckinRota } from "../infra/api/express/rotas/torneio/droparJogadoresSemCheckin.express.route";
import { DesdroparJogadorRota } from "../infra/api/express/rotas/torneio/desdroparJogador.express.route";
import { ListarTorneiosRota } from "../infra/api/express/rotas/torneio/listarTorneios.express.route";
import { BuscarTorneioRota } from "../infra/api/express/rotas/torneio/buscarTorneio.express.route";
import { BuscarSeoTorneioRota } from "../infra/api/express/rotas/torneio/buscarSeoTorneio.express.route";
import { RenderizarCompartilhamentoTorneioRota } from "../infra/api/express/rotas/torneio/renderizarCompartilhamentoTorneio.express.route";
import { BuscarStandingsRota } from "../infra/api/express/rotas/torneio/buscarStandings.express.route";
import { MeuHistoricoTorneioRota } from "../infra/api/express/rotas/torneio/meuHistoricoTorneio.express.route";
import { ListarPartidasTorneioRota } from "../infra/api/express/rotas/torneio/listarPartidasTorneio.express.route";
import { AlterarTorneioRota } from "../infra/api/express/rotas/torneio/alterarTorneio.express.route";
import { ExcluirTorneioRota } from "../infra/api/express/rotas/torneio/excluirTorneio.express.route";
import { GerarLinkIngressoRota } from "../infra/api/express/rotas/torneio/gerarLinkIngresso.express.route";
import { IngressarViaTorneioRota } from "../infra/api/express/rotas/torneio/ingressarViaTorneio.express.route";
import { AjustarResultadoRota } from "../infra/api/express/rotas/torneio/ajustarResultado.express.route";
import { DefinirAnfitriaoTorneioRota } from "../infra/api/express/rotas/torneio/definirAnfitriaoTorneio.express.route";
import { CriarLigaRota } from "../infra/api/express/rotas/liga/criarLiga.express.route";
import { AlterarLigaRota } from "../infra/api/express/rotas/liga/alterarLiga.express.route";
import { ExcluirLigaRota } from "../infra/api/express/rotas/liga/excluirLiga.express.route";
import { ListarLigasRota } from "../infra/api/express/rotas/liga/listarLigas.express.route";
import { BuscarLigaRota } from "../infra/api/express/rotas/liga/buscarLiga.express.route";
import { RankingLigaRota } from "../infra/api/express/rotas/liga/rankingLiga.express.route";
import { CriarTimeRota } from "../infra/api/express/rotas/time/criarTime.express.route";
import { ListarTimesRota } from "../infra/api/express/rotas/time/listarTimes.express.route";
import { BuscarTimeRota } from "../infra/api/express/rotas/time/buscarTime.express.route";
import { AlterarTimeRota } from "../infra/api/express/rotas/time/alterarTime.express.route";
import { ExcluirTimeRota } from "../infra/api/express/rotas/time/excluirTime.express.route";
import { EntrarTimeRota } from "../infra/api/express/rotas/time/entrarTime.express.route";
import { SairTimeRota } from "../infra/api/express/rotas/time/sairTime.express.route";
import { GerarConviteTimeRota } from "../infra/api/express/rotas/time/gerarConviteTime.express.route";
import { EntrarPorConviteTimeRota } from "../infra/api/express/rotas/time/entrarPorConviteTime.express.route";
import { SolicitarEntradaTimeRota } from "../infra/api/express/rotas/time/solicitarEntradaTime.express.route";
import { AprovarSolicitacaoTimeRota } from "../infra/api/express/rotas/time/aprovarSolicitacaoTime.express.route";
import { RejeitarSolicitacaoTimeRota } from "../infra/api/express/rotas/time/rejeitarSolicitacaoTime.express.route";
import { GerarUrlUploadImagemRota } from "../infra/api/express/rotas/imagem/gerarUrlUploadImagem.express.route";
import { ProxyImagemRota } from "../infra/api/express/rotas/imagem/proxyImagem.express.route";
import { BuscarAnunciosRota } from "../infra/api/express/rotas/site/buscarAnuncios.express.route";
import { BuscarAnunciosAdminRota } from "../infra/api/express/rotas/site/buscarAnunciosAdmin.express.route";
import { BuscarEstatisticasSiteRota } from "../infra/api/express/rotas/site/buscarEstatisticasSite.express.route";
import { RegistrarCliqueAnuncioRota } from "../infra/api/express/rotas/site/registrarCliqueAnuncio.express.route";
import { SalvarAnunciosRota } from "../infra/api/express/rotas/site/salvarAnuncios.express.route";
import { CadastrarStoryFundoRota } from "../infra/api/express/rotas/storyFundo/cadastrarStoryFundo.express.route";
import { ListarStoryFundosRota } from "../infra/api/express/rotas/storyFundo/listarStoryFundos.express.route";
import { ExcluirStoryFundoRota } from "../infra/api/express/rotas/storyFundo/excluirStoryFundo.express.route";
import { HealthRota } from "../infra/api/express/rotas/health.express.route";
import { ListarMetagameRota } from "../infra/api/express/rotas/metagame/listarMetagame.express.route";
import { BuscarArquetipoMetagameRota } from "../infra/api/express/rotas/metagame/buscarArquetipoMetagame.express.route";
import { type CasosDeUso } from "./casos";
import { CriarPostRota, ListarPostsRota, BuscarPostRota, EditarPostRota, ComentarPostRota, CurtirPostRota, ExcluirPostRota } from "../infra/api/express/rotas/post/postRotas.express.route";

export function criarRotas(casos: CasosDeUso) {
    return [
        CadastrarUsuarioRota.criar(casos.cadastrarUsuario),
        LoginUsuarioRota.criar(casos.loginUsuario),
        AtualizarUsuarioRota.criar(casos.atualizarUsuario),
        ExcluirContaRota.criar(casos.excluirConta),
        RefreshTokenRota.criar(casos.refreshToken),
        LogoutUsuarioRota.criar(casos.logoutUsuario),
        SolicitarResetSenhaRota.criar(casos.solicitarResetSenha),
        ConfirmarResetSenhaRota.criar(casos.confirmarResetSenha),
        ListarUsuariosRota.criar(casos.listarUsuarios),
        BuscarPerfilPublicoRota.criar(casos.buscarPerfilPublico),
        AlterarBloqueioTorneiosRota.criar(casos.alterarBloqueioTorneios),
        CadastrarDeckRota.criar(casos.cadastrarDeck),
        AtualizarDeckRota.criar(casos.atualizarDeck),
        ExcluirDeckRota.criar(casos.excluirDeck),
        ListarDecksRota.criar(casos.listarDecks),
        BuscarDeckRota.criar(casos.buscarDeck),
        CriarTorneioRota.criar(casos.criarTorneio),
        InscreverTorneioRota.criar(casos.inscreverTorneio),
        CheckInTorneioRota.criar(casos.checkInTorneio),
        EscolherDeckTorneioRota.criar(casos.escolherDeckTorneio),
        DroparJogadorRota.criar(casos.droparJogador),
        DroparJogadoresSemDeckRota.criar(casos.droparJogadoresSemDeck),
        DroparJogadoresSemCheckinRota.criar(casos.droparJogadoresSemCheckin),
        DesdroparJogadorRota.criar(casos.desdroparJogador),
        IniciarTorneioRota.criar(casos.iniciarTorneio),
        IniciarProximaRodadaRota.criar(casos.iniciarProximaRodada),
        RefazerRodadaRota.criar(casos.refazerRodada),
        AjustarTotalRodadasRota.criar(casos.ajustarTotalRodadas),
        EncerrarTorneioRota.criar(casos.encerrarTorneio),
        RegistrarResultadoRota.criar(casos.registrarResultado),
        ContestarResultadoRota.criar(casos.contestarResultado),
        ConfirmarResultadoRota.criar(casos.confirmarResultado),
        AtualizarMesaPartidaRota.criar(casos.atualizarMesaPartida),
        AtualizarPareamentosRodadaRota.criar(casos.atualizarPareamentosRodada),
        ListarTorneiosRota.criar(casos.listarTorneios),
        BuscarSeoTorneioRota.criar(casos.buscarSeoTorneio),
        RenderizarCompartilhamentoTorneioRota.criar(casos.buscarSeoTorneio),
        RenderizarCompartilhamentoTorneioRota.criar(casos.buscarSeoTorneio, "/torneio/share/:torneioId"),
        BuscarTorneioRota.criar(casos.buscarTorneio),
        BuscarStandingsRota.criar(casos.buscarStandings),
        MeuHistoricoTorneioRota.criar(casos.meuHistoricoTorneio),
        ListarPartidasTorneioRota.criar(casos.listarPartidasTorneio),
        AlterarTorneioRota.criar(casos.alterarTorneio),
        ExcluirTorneioRota.criar(casos.excluirTorneio),
        GerarLinkIngressoRota.criar(casos.gerarLinkIngresso),
        IngressarViaTorneioRota.criar(casos.ingressarViaTorneio),
        AjustarResultadoRota.criar(casos.ajustarResultado),
        DefinirAnfitriaoTorneioRota.criar(casos.definirAnfitriaoTorneio),
        CriarLigaRota.criar(casos.criarLiga),
        ListarLigasRota.criar(casos.listarLigas),
        BuscarLigaRota.criar(casos.buscarLiga),
        AlterarLigaRota.criar(casos.alterarLiga),
        ExcluirLigaRota.criar(casos.excluirLiga),
        RankingLigaRota.criar(casos.rankingLiga),
        CriarTimeRota.criar(casos.criarTime),
        ListarTimesRota.criar(casos.listarTimes),
        BuscarTimeRota.criar(casos.buscarTime),
        AlterarTimeRota.criar(casos.alterarTime),
        ExcluirTimeRota.criar(casos.excluirTime),
        EntrarTimeRota.criar(casos.entrarTime),
        SairTimeRota.criar(casos.sairTime),
        GerarConviteTimeRota.criar(casos.gerarConviteTime),
        EntrarPorConviteTimeRota.criar(casos.entrarPorConviteTime),
        SolicitarEntradaTimeRota.criar(casos.solicitarEntradaTime),
        AprovarSolicitacaoTimeRota.criar(casos.aprovarSolicitacaoTime),
        RejeitarSolicitacaoTimeRota.criar(casos.rejeitarSolicitacaoTime),
        BuscarAnunciosRota.criar(casos.buscarAnuncios),
        BuscarAnunciosAdminRota.criar(casos.buscarAnuncios),
        BuscarEstatisticasSiteRota.criar(casos.buscarEstatisticasSite),
        RegistrarCliqueAnuncioRota.criar(casos.registrarCliqueAnuncio),
        SalvarAnunciosRota.criar(casos.salvarAnuncios),
        GerarUrlUploadImagemRota.criar(casos.gerarUrlUploadImagem),
        CriarPostRota.criar(casos.criarPost),
        ListarPostsRota.criar(casos.listarPosts),
        BuscarPostRota.criar(casos.buscarPost),
        EditarPostRota.criar(casos.editarPost),
        ComentarPostRota.criar(casos.comentarPost),
        CurtirPostRota.criar(casos.curtirPost, true),
        CurtirPostRota.criar(casos.curtirPost, false),
        ExcluirPostRota.criar(casos.excluirPost),
        ProxyImagemRota.criar(),
        ListarStoryFundosRota.criar(casos.listarStoryFundos),
        CadastrarStoryFundoRota.criar(casos.cadastrarStoryFundo),
        ExcluirStoryFundoRota.criar(casos.excluirStoryFundo),
        ListarMetagameRota.criar(casos.listarMetagame),
        BuscarArquetipoMetagameRota.criar(casos.buscarArquetipoMetagame),
        HealthRota.criar(),
    ];
}
