export interface CasoDeUso<Input, Output> {
  executar(input: Input): Promise<Output>;
}
