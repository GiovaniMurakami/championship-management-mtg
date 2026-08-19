# Metagame

Agregação pública de arquétipos a partir de torneios **finalizados** (não secretos), por formato e janela de dias.

Arquétipo = `nomeConsolidado` do deck. Se estiver vazio, usa o `nome` que o usuário deu — cada lista aparece no metagame para poder consolidar depois.

## Endpoints

```
GET /metagame?formato=pauper&dias=30
GET /metagame/:formato/:slug?dias=30
```

Públicos. `dias` ∈ 7, 14, 30, 90, 365 (padrão 30). Rate limit **40 req / 15 min** por IP (`heavy-read`), aplicado antes da validação.

### Lista

Retorna `formato`, `dias`, `totalDecks`, `totalTorneios`, `arquetipos` (nome, slug, copias, metaPct, vitorias, derrotas, empates, winrate, cartaRepresentativa, cartasChave, cartasCores) e `recentes` (últimos torneios com decks e recorde).

`cartasCores` = nomes da primeira lista encontrada (maindeck; commander nos formatos Commander) para o front calcular os pips WUBRG.

### Detalhe

404 se o slug não existir na janela. Inclui `listaTipica` (primeira lista do arquétipo na janela), `listas`, `matchups` e `resultados`.

Jogador em `listas` / `resultados` / `recentes`: `usuario.nome` é o **nick MOL** (`nickMTGO`), com fallback para o nome cadastrado.

## Regras

- Bye não entra em winrate/matchup.
- Meta % = cópias do arquétipo / total de decks com inscrição.
- Winrate = vitórias / (V+D+E).
- Carta representativa: por padrão, não-terreno básico mais copiado no main (commander: carta de commander). Se algum deck do grupo tiver `cartaRepresentativa`, usa a mais votada entre os overrides. O valor pode ser o nome da carta ou o UUID Scryfall da arte escolhida pelo admin.
- Admin autenticado pode alterar `nomeConsolidado` e `cartaRepresentativa` de um deck (ou de todas as listas do arquétipo) pela página de detalhe; usa `PUT /deck/:id`. Deck travado aceita esses dois campos.
