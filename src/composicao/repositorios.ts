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

export function criarRepositorios() {
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
    };
}

export type Repositorios = ReturnType<typeof criarRepositorios>;
