import { randomUUID } from "crypto";

export type TimeProps = {
    id?: string;
    nome: string;
    descricao?: string;
    imagemUrl?: string;
    donoId: string;
    membroIds?: string[];
    solicitacoesPendentes?: string[];
    conviteToken?: string;
    criadoEm?: Date;
};

export class Time {
    public id: string;
    public nome: string;
    public descricao?: string;
    public imagemUrl?: string;
    public donoId: string;
    public membroIds: string[];
    public solicitacoesPendentes: string[];
    public conviteToken?: string;
    public criadoEm: Date;

    constructor(props: TimeProps) {
        this.id = props.id ?? randomUUID();
        this.nome = props.nome;
        this.descricao = props.descricao;
        this.imagemUrl = props.imagemUrl;
        this.donoId = props.donoId;
        this.membroIds = props.membroIds ?? [];
        this.solicitacoesPendentes = props.solicitacoesPendentes ?? [];
        this.conviteToken = props.conviteToken;
        this.criadoEm = props.criadoEm ?? new Date();
    }

    public static criar(props: TimeProps): Time {
        return new Time(props);
    }
}
