# ARCHITECTURE.md — Infection Game

## Visão geral
Visual Novel RPG em HTML/JS/CSS puro, sem frameworks ou dependências externas.
Tema: apocalipse com insetos gigantes no Amazonas causado pelo Agente BIO-7.

---

## Stack
- **Frontend**: HTML5 + CSS3 + JavaScript ES6+ (vanilla)
- **Dados**: JSON estático em `/story/`
- **Assets**: imagens e sons em `/assets/`
- **Deploy**: Netlify (auto-deploy a cada push na main)
- **Repositório**: GitHub (privado)

---

## Estrutura de telas

```
┌─────────────────────────────┐
│       tela-abertura         │  fade in 1.5s
│  INFECTION + botão INICIAR  │
└────────────┬────────────────┘
             │ clique
┌────────────▼────────────────┐
│         tela-nome           │
│  input nome + CONFIRMAR     │
└────────────┬────────────────┘
             │ confirma nome
┌────────────▼────────────────┐
│         tela-jogo           │
│  ┌──────────────────────┐   │
│  │   area-background    │70%│  classe CSS por cena
│  │   overlay-status     │   │  vida, sanidade, inventário
│  └──────────────────────┘   │
│  ┌──────────────────────┐   │
│  │    area-dialogo      │30%│  nome + texto + escolhas
│  └──────────────────────┘   │
│  [📜] ícone histórico        │  canto inferior direito
│  [painel-historico]          │  slide da direita, 300px
└─────────────────────────────┘
```

---

## Fluxo de dados

```
chapter1.json
     │ fetch() ao confirmar nome
     ▼
objeto global `cenas` (indexado por id)
     │ renderCena(id)
     ▼
DOM atualizado:
  - classe de background na area-background
  - nome do personagem no cabecalho-dialogo
  - texto digitado letra por letra (30ms/char)
  - botões de escolha renderizados após texto completo
     │ clique numa escolha
     ▼
aplicar efeito (vida/sanidade/inventário)
registrar no historicoSessao
fade out 0.3s → renderCena(proxima)
```

---

## Estado global do jogo

| Variável | Tipo | Valor inicial | Descrição |
|---|---|---|---|
| `nomeJogador` | string | — | Definido na tela de nome |
| `cenas` | object | {} | Todas as cenas do JSON indexadas por id |
| `cenaAtual` | string | "intro_01" | ID da cena em exibição |
| `statusVida` | number | 100 | Vida do protagonista (0-100) |
| `statusSanidade` | number | 100 | Sanidade do protagonista (0-100) |
| `inventario` | array | [] | Itens carregados (máx. 5) |
| `historicoSessao` | array | [] | Registro de cenas visitadas (só memória) |
| `velocidadeTexto` | number | 30 | ms por caractere (ajustável) |

---

## Formato de cena JSON

```json
{
  "id": "string_unico",
  "background": "nome_da_classe_css",
  "personagem": "Nome do Personagem ou null",
  "texto": "Texto da cena com suporte a \\n",
  "escolhas": [
    {
      "texto": "Texto do botão",
      "proxima": "id_da_proxima_cena",
      "efeito": {
        "vida": -10,
        "sanidade": -5,
        "inventario": "Nome do item"
      }
    }
  ]
}
```

---

## Classes de background disponíveis

| Valor no JSON | Classe CSS | Cor |
|---|---|---|
| `bunker_escuro` | `.bg-bunker` | Verde muito escuro (#111A0D) |
| `bunker_fraco_luz` | `.bg-bunker-luz` | Verde escuro médio |
| `bunker_dia` | `.bg-bunker-dia` | Verde militar médio |
| `floresta` | `.bg-floresta` | Verde médio (#3D6B2A) |
| `noite` | `.bg-noite` | Preto esverdeado (#0D1A0A) |

---

## Dependências entre arquivos

```
index.html
  └── style.css (layout, telas, cores)
  └── game.js (lógica, estado, navegação)
        └── story/chapter1.json (roteiro)
              └── assets/ (imagens referenciadas)
```

**Regra**: nenhum arquivo pode criar dependência circular.
**Regra**: `style.css` não depende de `game.js`.
**Regra**: `game.js` não modifica `style.css` diretamente — usa classes CSS.

---

## Mecânicas planejadas (não implementadas)

- Sistema de atributos (Força, Agilidade, Resistência, Percepção, Mente)
- Sistema de traços positivos/negativos (criação de personagem)
- Personalidade (Pragmático / Empático / Instável)
- Combate por turnos com partes do corpo destruíveis
- Sistema de craft
- Bestiário com traços, HP, dano, agilidade por espécie
