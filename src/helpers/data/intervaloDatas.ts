import { z } from "zod";
import { ErroPersonalizado } from "../error/ErroPersonalizado";

export const intervaloDatasSchema = z.object({
  dataInicio: z.iso.date().optional(),
  dataFim: z.iso.date().optional(),
}).refine(({ dataInicio, dataFim }) => (!dataInicio && !dataFim) || Boolean(dataInicio && dataFim && dataInicio <= dataFim), {
  message: "Informe as duas datas, com a data inicial anterior ou igual à final.",
});

export type IntervaloDatas = z.infer<typeof intervaloDatasSchema>;

export function resolverIntervaloDatas(input: IntervaloDatas) {
  const parsed = intervaloDatasSchema.safeParse(input);
  if (!parsed.success) throw ErroPersonalizado.criar({ mensagem: "Intervalo de datas inválido.", status: 400 });
  const { dataInicio, dataFim } = parsed.data;
  return dataInicio && dataFim ? {
    dataInicio: new Date(`${dataInicio}T00:00:00.000-03:00`),
    dataFim: new Date(`${dataFim}T23:59:59.999-03:00`),
  } : undefined;
}
