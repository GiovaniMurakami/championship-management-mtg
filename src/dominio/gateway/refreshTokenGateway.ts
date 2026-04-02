export interface RefreshTokenData {
  token: string;
  usuarioId: string;
  expiresAt: Date;
}

export interface RefreshTokenGateway {
  salvar(dados: RefreshTokenData): Promise<void>;
  consumir(token: string): Promise<RefreshTokenData | null>;
  excluirPorUsuario(usuarioId: string): Promise<void>;
}
