export interface LinkIngressoData {
    token: string;
    torneioId: string;
    criadoPorId: string;
    expiresAt: Date;
}

export interface LinkIngressoGateway {
    salvar(dados: LinkIngressoData): Promise<void>;
    buscarPorToken(token: string): Promise<LinkIngressoData | null>;
    excluirPorToken(token: string): Promise<void>;
}
