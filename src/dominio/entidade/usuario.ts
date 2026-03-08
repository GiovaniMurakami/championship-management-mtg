import { v4 as uuidv4 } from "uuid";

export interface UsuarioProps {
  id: string;
  nome: string;
  email: string;
  senha: string;
  criadoEm?: Date;
}

export class Usuario {
  public id: string;
  public nome: string;
  public email: string;
  public senha: string;
  public criadoEm: Date;

  constructor({ id, nome, email, senha, criadoEm }: UsuarioProps) {
    this.id = id;
    this.nome = nome;
    this.email = email;
    this.senha = senha;
    this.criadoEm = criadoEm || new Date();
  }

  public static criar({
    nome,
    email,
    senha,
  }: Omit<UsuarioProps, "id" | "criadoEm">) {
    return new Usuario({
      id: uuidv4(),
      nome,
      email,
      senha,
      criadoEm: new Date(),
    });
  }
}
