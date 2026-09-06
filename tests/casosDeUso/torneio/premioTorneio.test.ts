import { alterarTorneioSchema } from "../../../src/helpers/validacao/schemas";

describe("prêmio do torneio", () => {
  it("aceita Player Points inteiros e Tix fracionados", () => {
    expect(alterarTorneioSchema.parse({ premio: { playerPoints: 100, tix: 2.5 } }).premio).toEqual({ playerPoints: 100, tix: 2.5 });
  });
  it.each([{ playerPoints: -1, tix: 0 }, { playerPoints: 1.5, tix: 0 }, { playerPoints: 0, tix: -1 }, { playerPoints: 0 }])("rejeita prêmio inválido %j", premio => {
    expect(alterarTorneioSchema.safeParse({ premio }).success).toBe(false);
  });
  it("permite zerar o prêmio ou omiti-lo em uma edição", () => {
    expect(alterarTorneioSchema.parse({ premio: { playerPoints: 0, tix: 0 } }).premio).toEqual({ playerPoints: 0, tix: 0 });
    expect(alterarTorneioSchema.parse({ nome: "Teste" }).premio).toBeUndefined();
  });
});
