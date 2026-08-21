import { UsuarioRepositorio } from "../infra/mongodb/repositorios/usuarioRepositorio";
import { DeckRepositorio } from "../infra/mongodb/repositorios/deckRepositorio";
import { TorneioRepositorio } from "../infra/mongodb/repositorios/torneioRepositorio";
import { InscricaoRepositorio } from "../infra/mongodb/repositorios/inscricaoRepositorio";
import { PartidaRepositorio } from "../infra/mongodb/repositorios/partidaRepositorio";
import { TokenBlacklistRepositorio } from "../infra/mongodb/repositorios/tokenBlacklistRepositorio";
import { RefreshTokenRepositorio } from "../infra/mongodb/repositorios/refreshTokenRepositorio";
import { LigaRepositorio } from "../infra/mongodb/repositorios/ligaRepositorio";
import { LoginAttemptRepositorio } from "../infra/mongodb/repositorios/loginAttemptRepositorio";
import { ResetSenhaRepositorio } from "../infra/mongodb/repositorios/resetSenhaRepositorio";
import { LinkIngressoRepositorio } from "../infra/mongodb/repositorios/linkIngressoRepositorio";
import { TimeRepositorio } from "../infra/mongodb/repositorios/timeRepositorio";
import { SiteConfigRepositorio } from "../infra/mongodb/repositorios/siteConfigRepositorio";
import { StoryFundoRepositorio } from "../infra/mongodb/repositorios/storyFundoRepositorio";
import { TokenBlacklistDynamoRepositorio } from "../infra/dynamodb/repositorios/tokenBlacklistDynamoRepositorio";
import { RefreshTokenDynamoRepositorio } from "../infra/dynamodb/repositorios/refreshTokenDynamoRepositorio";
import { LoginAttemptDynamoRepositorio } from "../infra/dynamodb/repositorios/loginAttemptDynamoRepositorio";
import { ResetSenhaDynamoRepositorio } from "../infra/dynamodb/repositorios/resetSenhaDynamoRepositorio";
import { LinkIngressoDynamoRepositorio } from "../infra/dynamodb/repositorios/linkIngressoDynamoRepositorio";
import { SiteConfigDynamoRepositorio } from "../infra/dynamodb/repositorios/siteConfigDynamoRepositorio";
import { StoryFundoDynamoRepositorio } from "../infra/dynamodb/repositorios/storyFundoDynamoRepositorio";
import { UsuarioDynamoRepositorio } from "../infra/dynamodb/repositorios/usuarioDynamoRepositorio";
import { TorneioDynamoRepositorio } from "../infra/dynamodb/repositorios/torneioDynamoRepositorio";
import { InscricaoDynamoRepositorio } from "../infra/dynamodb/repositorios/inscricaoDynamoRepositorio";
import { PartidaDynamoRepositorio } from "../infra/dynamodb/repositorios/partidaDynamoRepositorio";
import { DeckDynamoRepositorio } from "../infra/dynamodb/repositorios/deckDynamoRepositorio";
import { LigaDynamoRepositorio } from "../infra/dynamodb/repositorios/ligaDynamoRepositorio";
import { TimeDynamoRepositorio } from "../infra/dynamodb/repositorios/timeDynamoRepositorio";

function usarDynamoDb(): boolean {
    return process.env.DATABASE_PROVIDER?.trim().toLowerCase() === "dynamodb";
}

export function criarRepositorios() {
    if (usarDynamoDb()) {
        return {
            usuario: UsuarioDynamoRepositorio.criar(),
            deck: DeckDynamoRepositorio.criar(),
            torneio: TorneioDynamoRepositorio.criar(),
            inscricao: InscricaoDynamoRepositorio.criar(),
            partida: PartidaDynamoRepositorio.criar(),
            tokenBlacklist: TokenBlacklistDynamoRepositorio.criar(),
            refreshToken: RefreshTokenDynamoRepositorio.criar(),
            liga: LigaDynamoRepositorio.criar(),
            loginAttempt: LoginAttemptDynamoRepositorio.criar(),
            resetSenha: ResetSenhaDynamoRepositorio.criar(),
            linkIngresso: LinkIngressoDynamoRepositorio.criar(),
            time: TimeDynamoRepositorio.criar(),
            siteConfig: SiteConfigDynamoRepositorio.criar(),
            storyFundo: StoryFundoDynamoRepositorio.criar(),
        };
    }

    return {
        usuario: UsuarioRepositorio.criar(),
        deck: DeckRepositorio.criar(),
        torneio: TorneioRepositorio.criar(),
        inscricao: InscricaoRepositorio.criar(),
        partida: PartidaRepositorio.criar(),
        tokenBlacklist: TokenBlacklistRepositorio.criar(),
        refreshToken: RefreshTokenRepositorio.criar(),
        liga: LigaRepositorio.criar(),
        loginAttempt: LoginAttemptRepositorio.criar(),
        resetSenha: ResetSenhaRepositorio.criar(),
        linkIngresso: LinkIngressoRepositorio.criar(),
        time: TimeRepositorio.criar(),
        siteConfig: SiteConfigRepositorio.criar(),
        storyFundo: StoryFundoRepositorio.criar(),
    };
}

export type Repositorios = ReturnType<typeof criarRepositorios>;
