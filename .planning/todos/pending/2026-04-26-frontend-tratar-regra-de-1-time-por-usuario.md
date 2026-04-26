---
created: 2026-04-26T12:38:39.537Z
title: Frontend tratar regra de 1 time por usuário
area: ui
files:
  - src/casosDeUso/time/criarTime.ts
  - src/casosDeUso/time/entrarTime.ts
  - src/casosDeUso/time/entrarPorConviteTime.ts
  - src/casosDeUso/time/solicitarEntradaTime.ts
---

## Problem

O backend impõe que um usuário só pode pertencer a 1 time por vez. Qualquer tentativa de criar time, entrar diretamente, entrar por convite ou solicitar entrada quando o usuário já é membro de outro time retorna HTTP 400 com mensagens como "Você já faz parte de um time. Saia dele antes de...". O frontend precisa lidar com isso de forma clara para o usuário.

## Solution

1. **Exibir mensagem de erro clara** em todas as telas/ações de time quando a API retornar 400 com mensagem de conflito de time — não exibir mensagem genérica.
2. **Bloquear/desabilitar botões** de "Criar time" e "Entrar no time" quando o usuário já pertence a um time. Para isso, consultar o time do usuário logado no carregamento das telas relevantes (ex: via `GET /time/listar` filtrando por `membroIds` do usuário, ou endpoint dedicado).
3. Fluxos afetados:
   - Tela criar time → botão desabilitado + tooltip explicando
   - Tela buscar/listar times → botão "Entrar" desabilitado por time
   - Fluxo de convite → mensagem de erro no redirecionamento
   - Tela de solicitação → bloquear envio
