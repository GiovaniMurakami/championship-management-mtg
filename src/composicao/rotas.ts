import { CadastrarUsuarioRota } from "../infra/api/express/rotas/usuario/cadastrarUsuario.express.route";
import { LoginUsuarioRota } from "../infra/api/express/rotas/usuario/loginUsuario.express.route";
import { AtualizarUsuarioRota } from "../infra/api/express/rotas/usuario/atualizarUsuario.express.route";
import { RefreshTokenRota } from "../infra/api/express/rotas/usuario/refreshToken.express.route";
import { LogoutUsuarioRota } from "../infra/api/express/rotas/usuario/logoutUsuario.express.route";
import { SolicitarResetSenhaRota } from "../infra/api/express/rotas/usuario/solicitarResetSenha.express.route";
import { ConfirmarResetSenhaRota } from "../infra/api/express/rotas/usuario/confirmarResetSenha.express.route";
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
import { RegistrarResultadoRota } from "../infra/api/express/rotas/torneio/registrarResultado.express.route";
import { ContestarResultadoRota } from "../infra/api/express/rotas/torneio/contestarResultado.express.route";
import { DroparJogadorRota } from "../infra/api/express/rotas/torneio/droparJogador.express.route";
import { ListarTorneiosRota } from "../infra/api/express/rotas/torneio/listarTorneios.express.route";
import { BuscarTorneioRota } from "../infra/api/express/rotas/torneio/buscarTorneio.express.route";
import { BuscarStandingsRota } from "../infra/api/express/rotas/torneio/buscarStandings.express.route";
import { MeuHistoricoTorneioRota } from "../infra/api/express/rotas/torneio/meuHistoricoTorneio.express.route";
import { ListarPartidasTorneioRota } from "../infra/api/express/rotas/torneio/listarPartidasTorneio.express.route";
import { AlterarTorneioRota } from "../infra/api/express/rotas/torneio/alterarTorneio.express.route";
import { ExcluirTorneioRota } from "../infra/api/express/rotas/torneio/excluirTorneio.express.route";
import { CriarLigaRota } from "../infra/api/express/rotas/liga/criarLiga.express.route";
import { AlterarLigaRota } from "../infra/api/express/rotas/liga/alterarLiga.express.route";
import { ExcluirLigaRota } from "../infra/api/express/rotas/liga/excluirLiga.express.route";
import { ListarLigasRota } from "../infra/api/express/rotas/liga/listarLigas.express.route";
import { BuscarLigaRota } from "../infra/api/express/rotas/liga/buscarLiga.express.route";
import { RankingLigaRota } from "../infra/api/express/rotas/liga/rankingLiga.express.route";
import { GerarUrlUploadImagemRota } from "../infra/api/express/rotas/imagem/gerarUrlUploadImagem.express.route";
import { HealthRota } from "../infra/api/express/rotas/health.express.route";
import { type CasosDeUso } from "./casos";

export function criarRotas(casos: CasosDeUso) {
    return [
        CadastrarUsuarioRota.criar(casos.cadastrarUsuario),
        LoginUsuarioRota.criar(casos.loginUsuario),
        AtualizarUsuarioRota.criar(casos.atualizarUsuario),
        RefreshTokenRota.criar(casos.refreshToken),
        LogoutUsuarioRota.criar(casos.logoutUsuario),
        SolicitarResetSenhaRota.criar(casos.solicitarResetSenha),
        ConfirmarResetSenhaRota.criar(casos.confirmarResetSenha),
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
        IniciarTorneioRota.criar(casos.iniciarTorneio),
        IniciarProximaRodadaRota.criar(casos.iniciarProximaRodada),
        RegistrarResultadoRota.criar(casos.registrarResultado, casos.buscarStandings),
        ContestarResultadoRota.criar(casos.contestarResultado),
        ListarTorneiosRota.criar(casos.listarTorneios),
        BuscarTorneioRota.criar(casos.buscarTorneio),
        BuscarStandingsRota.criar(casos.buscarStandings),
        MeuHistoricoTorneioRota.criar(casos.meuHistoricoTorneio),
        ListarPartidasTorneioRota.criar(casos.listarPartidasTorneio),
        AlterarTorneioRota.criar(casos.alterarTorneio),
        ExcluirTorneioRota.criar(casos.excluirTorneio),
        CriarLigaRota.criar(casos.criarLiga),
        ListarLigasRota.criar(casos.listarLigas),
        BuscarLigaRota.criar(casos.buscarLiga),
        AlterarLigaRota.criar(casos.alterarLiga),
        ExcluirLigaRota.criar(casos.excluirLiga),
        RankingLigaRota.criar(casos.rankingLiga),
        GerarUrlUploadImagemRota.criar(casos.gerarUrlUploadImagem),
        HealthRota.criar(),
    ];
}
