/**
 * logger.js — Sistema de Log do Infection Game
 *
 * Dois modos:
 * - Desenvolvimento: logs no console do navegador (F12)
 * - Produção: logs enviados ao endpoint do GitHub Actions
 *
 * Níveis: DEBUG, INFO, WARN, ERROR, FATAL
 */

// ─── CONFIGURAÇÃO ───────────────────────────────────────────────────────────

const LOG_CONFIG = {
  // Detecta automaticamente o ambiente
  ambiente:
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'desenvolvimento'
      : 'producao',

  // Nível mínimo para registrar (DEBUG < INFO < WARN < ERROR < FATAL)
  nivel_minimo: 'DEBUG',

  // Máximo de logs guardados na sessão antes de descartar os mais antigos
  max_logs_sessao: 200,

  // Cores para o console por nível
  cores: {
    DEBUG: 'color: #888',
    INFO: 'color: #4fc3f7',
    WARN: 'color: #ffb74d; font-weight: bold',
    ERROR: 'color: #e57373; font-weight: bold',
    FATAL: 'color: #ff1744; font-weight: bold; font-size: 14px'
  },

  // Categorias de erro
  categorias: {
    JS: 'JavaScript',
    JOGO: 'Jogo',
    PIPELINE: 'Pipeline',
    CENA: 'Cena',
    INVENTARIO: 'Inventário',
    JSON: 'JSON',
    REDE: 'Rede'
  }
};

// ─── ESTADO DO LOGGER ────────────────────────────────────────────────────────

const logsSessao = [];
const niveis = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

// ─── FUNÇÕES PRINCIPAIS ──────────────────────────────────────────────────────

/**
 * Registra uma entrada de log
 * @param {string} nivel - DEBUG | INFO | WARN | ERROR | FATAL
 * @param {string} categoria - JS | JOGO | PIPELINE | CENA | INVENTARIO | JSON | REDE
 * @param {string} mensagem - Descrição do evento
 * @param {object} dados - Dados extras (opcional)
 */
function log(nivel, categoria, mensagem, dados = null) {
  // Verifica se o nível é suficiente para registrar
  if (niveis.indexOf(nivel) < niveis.indexOf(LOG_CONFIG.nivel_minimo)) return;

  const entrada = {
    timestamp: new Date().toISOString(),
    nivel,
    categoria,
    mensagem,
    dados,
    cena: window.GameState?.cenaAtual || 'desconhecida',
    ambiente: LOG_CONFIG.ambiente
  };

  // Guarda na sessão
  logsSessao.push(entrada);
  if (logsSessao.length > LOG_CONFIG.max_logs_sessao) {
    logsSessao.shift(); // Remove o mais antigo
  }

  // Exibe no console sempre (desenvolvimento e produção)
  exibirConsole(entrada);

  // Em produção, erros graves são enviados ao GitHub Actions
  if (LOG_CONFIG.ambiente === 'producao' && (nivel === 'ERROR' || nivel === 'FATAL')) {
    enviarParaActions(entrada);
  }
}

// ─── ATALHOS POR NÍVEL ───────────────────────────────────────────────────────

const Logger = {
  debug: (categoria, mensagem, dados) => log('DEBUG', categoria, mensagem, dados),
  info: (categoria, mensagem, dados) => log('INFO', categoria, mensagem, dados),
  warn: (categoria, mensagem, dados) => log('WARN', categoria, mensagem, dados),
  error: (categoria, mensagem, dados) => log('ERROR', categoria, mensagem, dados),
  fatal: (categoria, mensagem, dados) => log('FATAL', categoria, mensagem, dados),

  // Retorna todos os logs da sessão
  getLogs: () => [...logsSessao],

  // Retorna logs filtrados por nível
  getErros: () => logsSessao.filter((l) => l.nivel === 'ERROR' || l.nivel === 'FATAL'),

  // Limpa os logs da sessão
  limpar: () => {
    logsSessao.length = 0;
  },

  // Exporta logs como JSON (útil para copiar e reportar bugs)
  exportar: () => {
    const blob = new Blob([JSON.stringify(logsSessao, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `infection-game-log-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

// ─── EXIBIÇÃO NO CONSOLE ─────────────────────────────────────────────────────

function exibirConsole(entrada) {
  const prefixo = `%c[${entrada.nivel}] [${entrada.categoria}]`;
  const cor = LOG_CONFIG.cores[entrada.nivel];
  const msg = `${entrada.mensagem} (cena: ${entrada.cena})`;

  if (entrada.dados) {
    console.groupCollapsed(prefixo + ' ' + msg, cor);
    console.log('Timestamp:', entrada.timestamp);
    console.log('Dados:', entrada.dados);
    console.groupEnd();
  } else {
    console.log(prefixo + ' ' + msg, cor);
  }
}

// ─── ENVIO PARA GITHUB ACTIONS ───────────────────────────────────────────────

async function enviarParaActions(entrada) {
  // Temporariamente desativado: será reativado quando o repositório for público
  // ou quando o proxy via GitHub Actions estiver configurado.
  return;

  try {
    // Usa o GitHub Issues API para registrar erros de produção
    // O token é público apenas para criar issues — seguro para uso no frontend
    await fetch('https://api.github.com/repos/Noobzin14/Infection-game/issues', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `token ${obterTokenPublico()}`
      },
      body: JSON.stringify({
        title: `[${entrada.nivel}] ${entrada.categoria}: ${entrada.mensagem.substring(0, 80)}`,
        body: [
          '## Log de Erro Automático',
          '',
          `**Nível:** ${entrada.nivel}`,
          `**Categoria:** ${entrada.categoria}`,
          `**Mensagem:** ${entrada.mensagem}`,
          `**Cena:** ${entrada.cena}`,
          `**Timestamp:** ${entrada.timestamp}`,
          `**Ambiente:** ${entrada.ambiente}`,
          '',
          '## Dados',
          '```json',
          JSON.stringify(entrada.dados, null, 2),
          '```',
          '',
          '## Contexto da Sessão',
          '```json',
          JSON.stringify(
            {
              statusVida: typeof statusVida !== 'undefined' ? statusVida : null,
              statusSanidade: typeof statusSanidade !== 'undefined' ? statusSanidade : null,
              inventario: typeof inventario !== 'undefined' ? inventario : null,
              ultimosCenas: logsSessao
                .filter((l) => l.categoria === 'CENA')
                .slice(-5)
                .map((l) => l.cena)
            },
            null,
            2
          ),
          '```'
        ].join('\n'),
        labels: ['bug', 'log-automatico', entrada.nivel.toLowerCase()]
      })
    });

    Logger.debug('PIPELINE', 'Erro enviado ao GitHub Issues com sucesso');
  } catch (erro) {
    // Falha silenciosa — não queremos loop de erros
    console.warn('[LOGGER] Falha ao enviar erro ao GitHub:', erro.message);
  }
}

function obterTokenPublico() {
  // Token com escopo mínimo (só criar issues públicas)
  // SUBSTITUA pelo token gerado no GitHub com permissão apenas de 'issues: write'
  return window.GITHUB_ISSUES_TOKEN || '';
}

// ─── CAPTURA GLOBAL DE ERROS JS ──────────────────────────────────────────────

// Captura erros não tratados
window.addEventListener('error', (evento) => {
  Logger.error('JS', `Erro não tratado: ${evento.message}`, {
    arquivo: evento.filename,
    linha: evento.lineno,
    coluna: evento.colno,
    stack: evento.error?.stack
  });
});

// Captura promises rejeitadas não tratadas
window.addEventListener('unhandledrejection', (evento) => {
  Logger.error('JS', `Promise rejeitada: ${evento.reason}`, {
    reason: evento.reason?.stack || evento.reason
  });
});

// ─── EXPORTA ─────────────────────────────────────────────────────────────────

window.Logger = Logger;
window.Logger.config = LOG_CONFIG;
