export interface ResetSenhaData {
    token: string;
    usuarioId: string;
    expiresAt: Date;
}

export interface ResetSenhaGateway {
    salvar(dados: ResetSenhaData): Promise<void>;
    buscarPorToken(token: string): Promise<ResetSenhaData | null>;
    excluirPorToken(token: string): Promise<void>;
    excluirPorUsuario(usuarioId: string): Promise<void>;
}
