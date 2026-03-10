import { v4 as uuidv4 } from "uuid";

export interface UsuarioProps {
  id: string;
  nome: string;
  email: string;
  senha: string;
  telefone?: string;
  nickMTGO?: string;
  nickArena?: string;
  criadoEm?: Date;
}

export class Usuario {
  public id: string;
  public nome: string;
  public email: string;
  public senha: string;
  public telefone?: string;
  public nickMTGO?: string;
  public nickArena?: string;
  public criadoEm: Date;

  constructor({ id, nome, email, senha, telefone, nickMTGO, nickArena, criadoEm }: UsuarioProps) {
    this.id = id;
    this.nome = nome;
    this.email = email;
    this.senha = senha;
    this.telefone = telefone;
    this.nickMTGO = nickMTGO;
    this.nickArena = nickArena;
    this.criadoEm = criadoEm || new Date();
  }

  public static criar({
    nome,
    email,
    senha,
  }: Omit<UsuarioProps, "id" | "criadoEm" | "telefone" | "nickMTGO" | "nickArena">) {
    return new Usuario({
      id: uuidv4(),
      nome,
      email,
      senha,
      criadoEm: new Date(),
    });
  }
}
