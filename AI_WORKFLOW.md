# AI Workflow — Infection Game

## O que
Este projeto usa duas IAs com funções diferentes:
- **IA 1 — Codex**: implementa, refatora e ajusta arquivos
- **IA 2 — GitHub Models (GPT-4o)**: revisa impacto no sistema, contratos e riscos
- **Repositório**: fonte de verdade
- **Branch protection**: merge só entra se revisão passar

A regra central: **uma IA implementa; a outra valida o impacto no sistema inteiro**.

---

## Fluxo

```
Codex abre PR
    ↓
Codex revisa automaticamente (sintaxe, bugs, qualidade)
    ↓
GitHub Actions dispara revisão de impacto via GitHub Models
    ↓
IA 2 analisa: blast radius, contratos, estado global
    ↓
Comentário automático no PR com resultado
    ↓
Merge permitido
```

---

## Prioridade de revisão por arquivo

| Arquivo | Nível | Motivo |
|---|---|---|
| `game.js` | 🔴 Profunda | Núcleo do jogo, estado global, fluxo principal |
| `story/*.json` | 🟡 Média | Contratos de cena, IDs de navegação |
| `index.html` | 🟡 Média | Estrutura DOM que o game.js depende |
| `style.css` | 🟢 Leve | Visual apenas, sem lógica |
| `MEMORY.json` | 🔴 Profunda | Fonte de verdade do projeto |
| `AGENTS.md` | 🔴 Profunda | Instruções que guiam o Codex |
| `assets/` | 🟢 Leve | Mídia estática |

---

## Blast radius — o que nunca pode quebrar

Ver `INVARIANTS.md` para lista completa.

---

## Configuração do Codex

- Revisão automática: **Revisar todos os PRs**
- Acionador: **Ao abrir PR**
- Cache de contêineres: **Desativado** (HTML puro, sem build)
