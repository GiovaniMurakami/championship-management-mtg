import { v4 as uuidv4 } from "uuid";

export type RoleUsuario = "user" | "admin";

export interface UsuarioProps {
  id: string;
  nome: string;
  email: string;
  senha: string;
  role?: RoleUsuario;
  telefone?: string;
  nickMTGO?: string;
  nickArena?: string;
  resultadosExpressivos?: number;
  criadoEm?: Date;
}

export class Usuario {
  public id: string;
  public nome: string;
  public email: string;
  public senha: string;
  public role: RoleUsuario;
  public telefone?: string;
  public nickMTGO?: string;
  public nickArena?: string;
  public resultadosExpressivos: number;
  public criadoEm: Date;

  constructor({ id, nome, email, senha, role, telefone, nickMTGO, nickArena, resultadosExpressivos, criadoEm }: UsuarioProps) {
    this.id = id;
    this.nome = nome;
    this.email = email;
    this.senha = senha;
    this.role = role || "user";
    this.telefone = telefone;
    this.nickMTGO = nickMTGO;
    this.nickArena = nickArena;
    this.resultadosExpressivos = resultadosExpressivos ?? 0;
    this.criadoEm = criadoEm || new Date();
  }

  public static criar({
    nome,
    email,
    senha,
  }: Omit<UsuarioProps, "id" | "criadoEm" | "role" | "telefone" | "nickMTGO" | "nickArena">) {
    return new Usuario({
      id: uuidv4(),
      nome,
      email,
      senha,
      role: "user",
      criadoEm: new Date(),
    });
  }
}
