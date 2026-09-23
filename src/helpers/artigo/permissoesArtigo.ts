import { RoleUsuario } from "../../dominio/entidade/usuario";

export function podeEditarArtigo(role: RoleUsuario | string | undefined): boolean {
  return role === "admin" || role === "editor";
}

export function podePublicarArtigo(role: RoleUsuario | string | undefined): boolean {
  return role === "admin";
}
