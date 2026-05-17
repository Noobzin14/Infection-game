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
│                           # Inclui save/load, loader dinâmico, internacionalização base e sistema de combate (estrutura)
│                           # Dependências: index.html (DOM), story/*.json
│
├── locales/
│   ├── pt-BR.json          # Strings em português do Brasil
│   └── en-US.json          # Strings em inglês (EUA)
│
├── tests/
│   └── game.test.js        # Suíte de testes unitários para funções centrais
│
├── dev-mode.js             # Painel oculto de modo desenvolvedor
│                           # Ativado por sequência de teclado "devmode"
│                           # 7 abas: CENA, STATUS, INVENTÁRIO, DESIGN, REPO, LOGS, LUPA (expandida)
│                           # LOGS: intercepta Logger + eventos do jogo em tempo real
│                           # LUPA: inspetor visual com tooltip, highlight e fixação
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
│       ├── ai-review.yml   # GitHub Actions — revisão automática de PR
│       ├── export-repo.yml # Geração automática do repo-export.md como artefato
│       └── process-logs.yml# Pipeline para processamento de logs
│
│
├── scripts/
│   └── export-repo.py      # Exporta documentação + código + dados para repo-export.md
│                           # Calcula estatísticas e problemas conhecidos
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


## Atualizações recentes no dev-mode

- Aba **LOGS** agora inclui busca por texto em tempo real (nível/categoria/mensagem/dados), contador filtrado/total e botão de limpeza da busca.
- Aba **CENA** agora inclui: histórico de navegação dev com botão de voltar/limpar, e seção **GRAFO DE CENAS** (toggle) com SVG clicável, destaque da cena atual e marcação de cenas referenciadas não escritas.
- Atalhos globais `Ctrl+Shift+...` adicionados quando DEV_MODE ativo: limpar logs, exportar estado, voltar cena, toggle grafo, toggle lupa, mostrar/ocultar painel e navegação direta entre abas 1-7, com toast discreto.
- Aba **INVENTÁRIO** substituída por grades tipo Excel para itens e traços, com filtros/busca/exportação, criação via editor JSON com validação por categoria, cache de fetch em sessão para `data/items.json` e `data/character.json`.

- Aba **LUPA** expandida com 4 sub-seções: Elemento Fixado, Editor de Conteúdo (texto/atributos/CSS inline), Color Picker HSL em canvas com destino em elemento/variável global e bloco de Variáveis Globais migrado da DESIGN.
