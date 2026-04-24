# INVARIANTS.md — Infection Game

## O que é este arquivo
Lista de contratos e regras que **nunca podem ser violados** por nenhuma mudança de código.
Qualquer PR que quebre um invariante deve ser bloqueado.

---

## Invariantes do motor de jogo (game.js)

### I1 — Variáveis globais obrigatórias
As seguintes variáveis devem sempre existir e ter os tipos corretos:
```javascript
nomeJogador     // string
cenas           // object
cenaAtual       // string
statusVida      // number (0-100)
statusSanidade  // number (0-100)
inventario      // array (máximo 5 itens)
historicoSessao // array
velocidadeTexto // number (ms)
```

### I2 — Fluxo de telas
A sequência de telas nunca pode ser alterada sem atualizar este arquivo:
```
tela-abertura → tela-nome → tela-jogo
```
Não existe navegação reversa — recomeçar vai para `tela-nome`.

### I3 — Carregamento do roteiro
O motor deve sempre carregar `story/chapter1.json` via `fetch()`.
O JSON deve ter a estrutura `{ "cenas": [...] }`.
Falha no fetch deve exibir mensagem de erro — nunca travar silenciosamente.

### I4 — Limite de inventário
O inventário nunca pode ter mais de 5 itens.
Tentar adicionar item com inventário cheio deve bloquear o avanço da cena
e exibir mensagem ao jogador.

### I5 — Efeitos de cena
O campo `efeito` nas escolhas só pode conter:
- `vida` → number (positivo ou negativo)
- `sanidade` → number (positivo ou negativo)
- `inventario` → string ou array de strings

Nenhum outro campo de efeito deve ser processado sem atualizar este arquivo.

### I6 — Histórico de sessão
O histórico existe apenas em memória.
Nunca deve ser salvo em `localStorage`, `sessionStorage` ou cookies.
Ao recarregar a página, o histórico é perdido — isso é comportamento esperado.

---

## Invariantes do roteiro (story/*.json)

### I7 — Estrutura de cena
Toda cena deve ter obrigatoriamente:
```json
{
  "id": "string único",
  "background": "string",
  "personagem": "string ou null",
  "texto": "string",
  "escolhas": [...]
}
```

### I8 — Navegação entre cenas
O campo `proxima` em cada escolha deve apontar para um `id` existente no mesmo arquivo
OU ser intencionalmente inexistente para acionar o "FIM DO CAPÍTULO".
IDs quebrados acidentais devem ser tratados como bug.

### I9 — IDs únicos
Nenhum arquivo JSON pode ter dois objetos de cena com o mesmo `id`.

---

## Invariantes visuais (style.css)

### I10 — Paleta 60/10/30
As três cores principais nunca devem ser alteradas sem decisão explícita:
- `--verde-militar: #2d4a1e` (60% — dominante)
- `--vermelho-sangue: #8b0000` (30% — destaque)
- `--preto-detalhe: #0a0a0a` (10% — detalhe)

### I11 — Layout 100vh
O jogo deve sempre ocupar exatamente 100vh sem scroll externo visível.
A divisão 70% background / 30% diálogo não deve ser alterada sem atualizar ARCHITECTURE.md.

---

## Invariantes de estrutura (repositório)

### I12 — Arquivos obrigatórios na raiz
Os seguintes arquivos devem sempre existir na raiz:
```
index.html
style.css
game.js
MEMORY.json
AGENTS.md
ARCHITECTURE.md
INVARIANTS.md
REPO_MAP.md
AI_WORKFLOW.md
```

### I13 — Roteiro em /story/
Todo arquivo de roteiro deve estar em `story/` e seguir o formato `chapterN.json`.
Nenhum roteiro pode ficar na raiz ou em outra pasta.
