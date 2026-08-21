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

export function criarRepositorios() {
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

export type Repositorios = ReturnType<typeof criarRepositorios>;
