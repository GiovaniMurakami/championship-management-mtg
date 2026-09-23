export interface EnviarEmailInput {
    para: string;
    assunto: string;
    html: string;
    texto?: string;
}

export interface EmailGateway {
    enviar(input: EnviarEmailInput): Promise<void>;
}
