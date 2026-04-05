import { ChatGptServico } from "../infra/services/chatGptServico";
import { EmailServico } from "../infra/services/emailServico";
import { S3Servico } from "../infra/services/s3Servico";

export function criarServicos() {
    return {
        email: EmailServico.criar(),
        s3: S3Servico.criar(),
        chatGpt: ChatGptServico.criar(),
    };
}

export type Servicos = ReturnType<typeof criarServicos>;
