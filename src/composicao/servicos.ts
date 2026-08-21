import { EmailServico } from "../infra/services/emailServico";
import { S3Servico } from "../infra/services/s3Servico";
import { CacheDynamoDbServico } from "../infra/services/cacheDynamoDbServico";

export function criarServicos() {
    return {
        email: EmailServico.criar(),
        s3: S3Servico.criar(),
        cache: CacheDynamoDbServico.criar(),
    };
}

export type Servicos = ReturnType<typeof criarServicos>;
