import { resolverNomeJogador, toUsuarioPublico, isUsuarioExcluido } from "../../../src/helpers/torneio/resolverNomeJogador";
import { Usuario } from "../../../src/dominio/entidade/usuario";

describe("resolverNomeJogador", () => {
    const usuario = new Usuario({
        id: "u-1",
        nome: "Giovanni",
        email: "g@e.com",
        senha: "s",
        nickMTGO: "giova_mtgo",
        nickArena: "giova#12345",
    });

    it("retorna o nome cadastrado por padrão", () => {
        expect(resolverNomeJogador(usuario)).toBe("Giovanni");
        expect(resolverNomeJogador(usuario, "nome")).toBe("Giovanni");
    });

    it("retorna nick MTGO quando modo é nickMOL", () => {
        expect(resolverNomeJogador(usuario, "nickMOL")).toBe("giova_mtgo");
    });

    it("retorna nick Arena quando modo é nickArena", () => {
        expect(resolverNomeJogador(usuario, "nickArena")).toBe("giova#12345");
    });

    it("faz fallback para o nome se o nick do modo estiver ausente", () => {
        const semNicks = new Usuario({
            id: "u-2",
            nome: "SemNick",
            email: "s@e.com",
            senha: "s",
        });

        expect(resolverNomeJogador(semNicks, "nickMOL")).toBe("SemNick");
        expect(resolverNomeJogador(semNicks, "nickArena")).toBe("SemNick");
    });
});

describe("toUsuarioPublico", () => {
    it("exibe o nick MOL, não o nome real", () => {
        const usuario = new Usuario({
            id: "u-1",
            nome: "Giovanni",
            email: "g@e.com",
            senha: "s",
            nickMTGO: "giova_mtgo",
        });

        expect(toUsuarioPublico(usuario)).toEqual({
            id: "u-1",
            nome: "giova_mtgo",
            excluido: false,
        });
    });

    it("faz fallback para o nome quando não há nick MOL", () => {
        const usuario = new Usuario({
            id: "u-2",
            nome: "SemNick",
            email: "s@e.com",
            senha: "s",
        });

        expect(toUsuarioPublico(usuario).nome).toBe("SemNick");
    });

    it("anonimiza usuário excluído", () => {
        const usuario = new Usuario({
            id: "u-3",
            nome: "Usuário excluído",
            email: "x@e.com",
            senha: "s",
            nickMTGO: "ainda_visivel",
            excluido: true,
        });

        expect(toUsuarioPublico(usuario)).toEqual({
            id: "u-3",
            nome: "Usuário excluído",
            excluido: true,
        });
    });

    it("usa o fallbackId quando o usuário não existe", () => {
        expect(toUsuarioPublico(null, "u-faltando")).toEqual({
            id: "u-faltando",
            nome: "u-faltando",
            excluido: false,
        });
    });

    it("sem fallback, anuncia usuário excluído e trata ausente", () => {
        expect(isUsuarioExcluido(undefined)).toBe(false);
        expect(toUsuarioPublico()).toEqual({
            id: "",
            nome: "Usuário excluído",
            excluido: false,
        });
    });
});
