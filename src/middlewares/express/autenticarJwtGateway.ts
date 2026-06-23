import { TokenBlacklistGateway } from "../../dominio/gateway/tokenBlacklistGateway";
import { TokenBlacklistRepositorio } from "../../infra/mongodb/repositorios/tokenBlacklistRepositorio";

let _blacklistGateway: TokenBlacklistGateway | undefined;

export function inicializarAutenticarJwt(gateway: TokenBlacklistGateway): void {
  _blacklistGateway = gateway;
}

export function getBlacklistGateway(): TokenBlacklistGateway {
  if (!_blacklistGateway) {
    _blacklistGateway = TokenBlacklistRepositorio.criar();
  }
  return _blacklistGateway;
}
