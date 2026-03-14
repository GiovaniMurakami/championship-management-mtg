import { Usuario } from "../../../src/dominio/entidade/usuario";

describe("Usuario", () => {
    it("deve criar uma instância com todos os campos", () => {
        const props = {
            id: "id-1",
            nome: "João",
            email: "joao@email.com",
            senha: "hash123",
            telefone: "11999999999",
            nickMTGO: "joaoMTGO",
            nickArena: "joaoArena",
            criadoEm: new Date("2025-01-01"),
        };

        const usuario = new Usuario(props);

        expect(usuario.id).toBe("id-1");
        expect(usuario.nome).toBe("João");
        expect(usuario.email).toBe("joao@email.com");
        expect(usuario.senha).toBe("hash123");
        expect(usuario.telefone).toBe("11999999999");
        expect(usuario.nickMTGO).toBe("joaoMTGO");
        expect(usuario.nickArena).toBe("joaoArena");
        expect(usuario.criadoEm).toEqual(new Date("2025-01-01"));
    });

    it("deve definir criadoEm automaticamente quando não informado", () => {
        const antes = new Date();
        const usuario = new Usuario({
            id: "id-1",
            nome: "João",
            email: "joao@email.com",
            senha: "hash123",
        });
        const depois = new Date();

        expect(usuario.criadoEm.getTime()).toBeGreaterThanOrEqual(antes.getTime());
        expect(usuario.criadoEm.getTime()).toBeLessThanOrEqual(depois.getTime());
    });

    describe("criar", () => {
        it("deve gerar id e criadoEm automaticamente", () => {
            const usuario = Usuario.criar({
                nome: "Maria",
                email: "maria@email.com",
                senha: "senha123",
            });

            expect(usuario.id).toBeDefined();
            expect(usuario.id.length).toBeGreaterThan(0);
            expect(usuario.nome).toBe("Maria");
            expect(usuario.email).toBe("maria@email.com");
            expect(usuario.senha).toBe("senha123");
            expect(usuario.criadoEm).toBeInstanceOf(Date);
            expect(usuario.telefone).toBeUndefined();
            expect(usuario.nickMTGO).toBeUndefined();
            expect(usuario.nickArena).toBeUndefined();
        });

        it("deve gerar ids únicos", () => {
            const u1 = Usuario.criar({ nome: "A", email: "a@e.com", senha: "s" });
            const u2 = Usuario.criar({ nome: "B", email: "b@e.com", senha: "s" });
            expect(u1.id).not.toBe(u2.id);
        });
    });
});
