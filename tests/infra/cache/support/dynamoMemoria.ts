import { DynamoDBClient, GetItemCommand, QueryCommand, PutItemCommand, DeleteItemCommand, UpdateItemCommand, TransactWriteItemsCommand, BatchWriteItemCommand, type AttributeValue } from "@aws-sdk/client-dynamodb";

type Item = Record<string, AttributeValue>;
type Operacao = {
  TableName?: string; Key?: Item; Item?: Item;
  ConditionExpression?: string; UpdateExpression?: string;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Item;
};

/** Simula somente os comandos utilizados pelos repositórios. Expressões desconhecidas falham. */
export class DynamoMemoria {
  readonly itens = new Map<string, Item>();
  readonly comandos: unknown[] = [];
  antes?: (command: unknown) => Promise<void>;
  private spy?: vi.SpyInstance;
  private chave(op: Operacao) { const item = op.Key ?? op.Item!; return `${op.TableName}/${item.pk.S}/${item.sk.S}`; }
  private clone<T>(value: T): T { return value === undefined ? value : JSON.parse(JSON.stringify(value)); }
  private condicao(op: Operacao) {
    const expr = op.ConditionExpression;
    if (!expr) return true;
    const item = this.itens.get(this.chave(op));
    const attr = (name: string) => item?.[op.ExpressionAttributeNames?.[name] ?? name];
    const eq = (name: string, value: string) => JSON.stringify(attr(name)) === JSON.stringify(op.ExpressionAttributeValues?.[value]);
    if (expr === "attribute_not_exists(pk)") return !item?.pk;
    if (expr === "attribute_exists(pk)") return Boolean(item?.pk);
    if (expr === "attribute_not_exists(#version) OR #version = :version") return !attr("#version") || eq("#version", ":version");
    if (expr === "#status = :pendente") return eq("#status", ":pendente");
    throw new Error(`Condição não simulada: ${expr}`);
  }
  private atualizar(op: Operacao) {
    const item = { ...this.itens.get(this.chave(op)), ...op.Key };
    const expr = op.UpdateExpression!;
    const values = op.ExpressionAttributeValues!;
    if (expr.startsWith("ADD ")) {
      const [, name, value] = expr.split(" ");
      item[name] = { N: String(Number(item[name]?.N ?? 0) + Number(values[value].N)) };
    } else if (expr.includes("if_not_exists")) {
      const name = expr.match(/^SET (\w+) =/)?.[1];
      if (!name || expr !== `SET ${name} = if_not_exists(${name}, :base) + :incremento`) throw new Error(`Update não simulado: ${expr}`);
      item[name] = { N: String(Number(item[name]?.N ?? values[":base"].N) + Number(values[":incremento"].N)) };
    } else {
      if (!expr.startsWith("SET ")) throw new Error(`Update não simulado: ${expr}`);
      for (const assignment of expr.slice(4).split(", ")) {
        const match = assignment.match(/^(#?\w+) = (:\w+)$/);
        if (!match || !values[match[2]]) throw new Error(`Update não simulado: ${assignment}`);
        item[op.ExpressionAttributeNames?.[match[1]] ?? match[1]] = values[match[2]];
      }
    }
    this.itens.set(this.chave(op), this.clone(item));
  }
  instalar() {
    this.spy = vi.spyOn(DynamoDBClient.prototype, "send").mockImplementation((async (command: unknown) => {
      this.comandos.push(command);
      await this.antes?.(command);
      if (command instanceof GetItemCommand) return { Item: this.clone(this.itens.get(this.chave(command.input))) };
      if (command instanceof QueryCommand) {
        if (command.input.KeyConditionExpression !== "pk = :pk") throw new Error("Query não simulada");
        const prefix = `${command.input.TableName}/${command.input.ExpressionAttributeValues![":pk"].S}/`;
        return { Items: this.clone([...this.itens.entries()].filter(([key]) => key.startsWith(prefix)).sort(([a], [b]) => a.localeCompare(b)).map(([, item]) => item)) };
      }
      if (command instanceof TransactWriteItemsCommand) {
        const ops = command.input.TransactItems!;
        if (!ops.every((op) => this.condicao(op.Put ?? op.Update ?? op.Delete ?? op.ConditionCheck!))) {
          throw Object.assign(new Error("Condição da transação falhou"), { name: "TransactionCanceledException" });
        }
        for (const op of ops) {
          if (op.Put) this.itens.set(this.chave(op.Put), this.clone(op.Put.Item!));
          if (op.Delete) this.itens.delete(this.chave(op.Delete));
          if (op.Update) this.atualizar(op.Update);
        }
        return {};
      }
      if (command instanceof BatchWriteItemCommand) {
        for (const [TableName, requests] of Object.entries(command.input.RequestItems!)) for (const op of requests) {
          if (op.PutRequest) this.itens.set(this.chave({ TableName, ...op.PutRequest }), this.clone(op.PutRequest.Item!));
          if (op.DeleteRequest) this.itens.delete(this.chave({ TableName, ...op.DeleteRequest }));
        }
        return { UnprocessedItems: {} };
      }
      if (command instanceof PutItemCommand || command instanceof DeleteItemCommand || command instanceof UpdateItemCommand) {
        if (!this.condicao(command.input)) throw Object.assign(new Error("Condição falhou"), { name: "ConditionalCheckFailedException" });
        if (command instanceof PutItemCommand) this.itens.set(this.chave(command.input), this.clone(command.input.Item!));
        else if (command instanceof DeleteItemCommand) this.itens.delete(this.chave(command.input));
        else this.atualizar(command.input);
        return {};
      }
      throw new Error(`Comando não simulado: ${(command as object).constructor.name}`);
    }) as never);
  }
  leiturasDados() {
    return this.comandos.filter((c) => (c instanceof GetItemCommand || c instanceof QueryCommand) && c.input.TableName === "dados-cache-test").length;
  }
  restaurar() { this.spy?.mockRestore(); }
}
