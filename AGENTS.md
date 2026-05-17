# AGENTS.md

## Escopo
Estas instruções se aplicam ao diretório `Infection-game/` e subdiretórios.

## Objetivo
- Manter a estrutura de visual novel sobre apocalipse de insetos.
- Preservar organização por `story/` e `assets/`.

## Convenções
- Use português do Brasil nos textos do jogo.
- Mantenha o JSON de roteiro válido e legível.
- Evite dependências externas desnecessárias para a estrutura base.
- Save: sempre incluir campo `versao` ao escrever saves.
- Testes: ao adicionar nova função crítica ao `game.js`, adicionar caso de teste em `tests/game.test.js`.
- Internacionalização: todo texto exibido ao jogador deve usar `t('chave', 'fallback')` em vez de string hardcoded.
- Capítulos: novos capítulos vão em `story/chapterN.json` — nunca embutir roteiro no `game.js`.
