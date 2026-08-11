import { resolverNomeJogador } from "../../../src/helpers/torneio/resolverNomeJogador";
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
