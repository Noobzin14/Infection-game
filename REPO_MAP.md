# REPO_MAP.md — Infection Game

## Mapa completo do repositório

```
Infection-game/
│
├── index.html              # Estrutura HTML das 3 telas do jogo
│                           # Dependências: style.css, game.js
│
├── style.css               # Tema visual 60/10/30
│                           # Verde Militar / Vermelho Sangue / Preto
│                           # Não depende de nenhum outro arquivo
│
├── game.js                 # Motor completo do jogo
│                           # Carrega story/chapter1.json via fetch
│                           # Gerencia estado global, telas, cenas
│                           # Dependências: index.html (DOM), story/*.json
│
├── dev-mode.js             # Painel oculto de modo desenvolvedor
│                           # Ativado por sequência de teclado "devmode"
│                           # Dependências: game.js (globais), logger.js
│
├── story/
│   └── chapter1.json       # Roteiro do Capítulo 1 — "Despertar"
│                           # 7 cenas: intro_01 até porta_fresta
│                           # Cena radio_check referenciada mas não escrita
│
├── assets/
│   ├── backgrounds/        # Imagens de cenário (vazio — .gitkeep)
│   ├── characters/         # Sprites dos personagens (vazio — .gitkeep)
│   └── sounds/             # Música e efeitos (vazio — .gitkeep)
│
├── .github/
│   └── workflows/
│       └── ai-review.yml   # GitHub Actions — revisão automática de PR
│                           # Usa GitHub Models (GPT-4o) gratuito
│
├── MEMORY.json             # Memória compartilhada Claude + Codex
│                           # Lore, mecânicas, bestiário, roteiro, arquitetura
│                           # ATUALIZAR a cada decisão importante
│
├── AGENTS.md               # Instruções para o Codex
│                           # Convenções, comandos, regras do projeto
│
├── ARCHITECTURE.md         # Como o sistema funciona
│                           # Telas, fluxo de dados, estado global
│
├── INVARIANTS.md           # O que nunca pode quebrar
│                           # 13 invariantes documentados
│
├── REPO_MAP.md             # Este arquivo
│                           # Mapa de todos os arquivos e dependências
│
├── AI_WORKFLOW.md          # Pipeline de revisão com duas IAs
│                           # Codex implementa, GitHub Models valida
│
└── README.md               # Visão geral pública do projeto
```

---

## Arquivos críticos (mudanças exigem revisão profunda)

| Arquivo | Motivo |
|---|---|
| `game.js` | Núcleo do jogo, estado global, fluxo principal |
| `MEMORY.json` | Fonte de verdade de todo o projeto |
| `AGENTS.md` | Guia o comportamento do Codex |
| `INVARIANTS.md` | Define o que não pode quebrar |
| `story/chapter1.json` | Contratos de navegação entre cenas |

---

## Arquivos de baixo risco

| Arquivo | Motivo |
|---|---|
| `style.css` | Visual apenas, sem lógica |
| `assets/*` | Mídia estática |
| `README.md` | Documentação pública |

---

## Cenas do Capítulo 1

| ID | Descrição | Próximas |
|---|---|---|
| `intro_01` | Acorda no bunker | `intro_02` |
| `intro_02` | Ouve passos gigantes | `intro_03a`, `intro_03b` |
| `intro_03a` | Fica quieto (-5 sanidade) | `exploracao_01` |
| `intro_03b` | Encontra cano enferrujado | `exploracao_01` |
| `exploracao_01` | Examina o bunker | `item_mochila`, `radio_check`*, `porta_fresta` |
| `item_mochila` | Encontra suprimentos | `exploracao_01` |
| `porta_fresta` | Vê inseto gigante (-10 sanidade) | `exploracao_01` |

*`radio_check` — referenciada mas não escrita. Aciona FIM DO CAPÍTULO.

---

## Próximas cenas a escrever

- `radio_check` — Tenta consertar o rádio
- Transição do bunker para a Amazônia
- Capítulo 2 — A Floresta
