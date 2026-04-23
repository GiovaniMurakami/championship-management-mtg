import { comRetry } from "../../src/helpers/retry";

describe("comRetry", () => {
    it("deve retornar o resultado da função na primeira tentativa bem-sucedida", async () => {
        const fn = jest.fn().mockResolvedValue("ok");

        const resultado = await comRetry(fn, 3, 0);

        expect(resultado).toBe("ok");
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it("deve tentar novamente após falha e retornar sucesso na segunda tentativa", async () => {
        const fn = jest.fn()
            .mockRejectedValueOnce(new Error("falha 1"))
            .mockResolvedValue("ok na 2a");

        const resultado = await comRetry(fn, 3, 0);

        expect(resultado).toBe("ok na 2a");
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it("deve lançar o último erro após esgotar todas as tentativas", async () => {
        const erroFinal = new Error("erro persistente");
        const fn = jest.fn().mockRejectedValue(erroFinal);

        await expect(comRetry(fn, 3, 0)).rejects.toThrow("erro persistente");
        expect(fn).toHaveBeenCalledTimes(3);
    });

    it("deve executar apenas uma tentativa se tentativas = 1 e falhar", async () => {
        const fn = jest.fn().mockRejectedValue(new Error("erro"));

        await expect(comRetry(fn, 1, 0)).rejects.toThrow("erro");
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it("deve tentar até a última tentativa antes de desistir", async () => {
        const fn = jest.fn()
            .mockRejectedValueOnce(new Error("e1"))
            .mockRejectedValueOnce(new Error("e2"))
            .mockResolvedValue("sucesso na 3a");

        const resultado = await comRetry(fn, 3, 0);

        expect(resultado).toBe("sucesso na 3a");
        expect(fn).toHaveBeenCalledTimes(3);
    });
});
