import { TokenBlacklistGateway } from "../../dominio/gateway/tokenBlacklistGateway";
import { TokenBlacklistDynamoRepositorio } from "../../infra/dynamodb/repositorios/tokenBlacklistDynamoRepositorio";

let _blacklistGateway: TokenBlacklistGateway | undefined;

export function inicializarAutenticarJwt(gateway: TokenBlacklistGateway): void {
  _blacklistGateway = gateway;
}

export function getBlacklistGateway(): TokenBlacklistGateway {
  if (!_blacklistGateway) {
    _blacklistGateway = TokenBlacklistDynamoRepositorio.criar();
  }
  return _blacklistGateway;
}
