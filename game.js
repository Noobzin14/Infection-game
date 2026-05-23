window.GameState = window.GameState || {};

Object.assign(window.GameState, {
  nomeJogador: '',
  cenas: {},
  cenaAtual: null,
  statusVida: 100,
  statusSanidade: 100,
  inventario: [],
  historicoSessao: [],
  cenasVisitadas: [],
  velocidadeTexto: 30,
  capituloAtual: 1,
  atributos: {
    forca: 5,
    resistencia: 5,
    agilidade: 5,
    percepcao: 5,
    mente: 5
  },
  tracos: [],
  emCombate: false,
  combateEncerrado: false,
  inimigoAtual: null,
  turnoCombate: 0,
  acoesDisponiveis: [],
  locale: 'pt-BR',
  locales: {}
});

let configuracaoPersonagem = {};

let intervaloDigitacao = null;
let digitando = false;
let textoCompletoAtual = '';
let inicializacaoEmAndamento = false;


const CHAVE_SALVAMENTO = 'infection_game_save_v1';
const VERSAO_SAVE_ATUAL = '1';

// Efeitos de status em combate
const EFEITOS_STATUS = {
  sangramento:       { dano_por_turno: 5,  turnos: 3 },
  sangramento_grave: { dano_por_turno: 12, turnos: 4 },
  veneno:            { dano_por_turno: 8,  turnos: 4 },
  fogo:              { dano_por_turno: 10, turnos: 3 },
  atordoamento:      { pula_turno: true,   turnos: 1 },
  imobilizacao:      { impede_fuga: true,  turnos: 2 }
};

// Bestiário carregado dinamicamente
let BESTIARIO_COMBATE = {};

function criarSnapshotProgresso() {
  return {
    versao: VERSAO_SAVE_ATUAL,
    nomeJogador: window.GameState.nomeJogador,
    capituloAtual: window.GameState.capituloAtual,
    cenaAtual: window.GameState.cenaAtual,
    statusVida: window.GameState.statusVida,
    statusSanidade: window.GameState.statusSanidade,
    inventario: [...window.GameState.inventario],
    atributos: { ...window.GameState.atributos },
    tracos: [...window.GameState.tracos],
    velocidadeTexto: window.GameState.velocidadeTexto
  };
}

function salvarProgresso() {
  try {
    const snapshot = criarSnapshotProgresso();
    window.localStorage.setItem(CHAVE_SALVAMENTO, JSON.stringify(snapshot));
  } catch (erro) {
    Logger.warn('SAVE', 'Falha ao salvar progresso.', { erro: erro.message });
  }
}

function restaurarProgressoSalvo(dados) {
  if (!dados || typeof dados !== 'object') {
    return null;
  }

  window.GameState.nomeJogador = typeof dados.nomeJogador === 'string' ? dados.nomeJogador : window.GameState.nomeJogador;
  window.GameState.capituloAtual = Number.isInteger(dados.capituloAtual) ? dados.capituloAtual : window.GameState.capituloAtual;
  window.GameState.cenaAtual = typeof dados.cenaAtual === 'string' ? dados.cenaAtual : window.GameState.cenaAtual;
  window.GameState.statusVida = typeof dados.statusVida === 'number' ? dados.statusVida : window.GameState.statusVida;
  window.GameState.statusSanidade = typeof dados.statusSanidade === 'number' ? dados.statusSanidade : window.GameState.statusSanidade;
  window.GameState.inventario = Array.isArray(dados.inventario) ? dados.inventario.slice(0, 5) : window.GameState.inventario;
  window.GameState.atributos = (dados.atributos && typeof dados.atributos === 'object') ? {
    ...window.GameState.atributos,
    ...dados.atributos
  } : window.GameState.atributos;
  window.GameState.tracos = Array.isArray(dados.tracos) ? dados.tracos : window.GameState.tracos;
  window.GameState.velocidadeTexto = typeof dados.velocidadeTexto === 'number' ? dados.velocidadeTexto : window.GameState.velocidadeTexto;
  window.GameState.emCombate = false;
  window.GameState.inimigoAtual = null;
  window.GameState.turnoCombate = 0;
  window.GameState.acoesDisponiveis = [];

  return {
    capitulo: window.GameState.capituloAtual,
    cena: window.GameState.cenaAtual
  };
}

function carregarProgressoSalvo() {
  try {
    const bruto = window.localStorage.getItem(CHAVE_SALVAMENTO);
    if (!bruto) {
      return null;
    }
    const dados = JSON.parse(bruto);
    if (dados?.versao !== VERSAO_SAVE_ATUAL) {
      window.localStorage.removeItem(CHAVE_SALVAMENTO);
      Logger.warn('JOGO', 'Save incompatível descartado');
      exibirToastDiscreto(t('ui.save_incompativel', 'Save anterior incompatível — novo jogo iniciado.'));
      return false;
    }
    return restaurarProgressoSalvo(dados);
  } catch (erro) {
    Logger.warn('SAVE', 'Falha ao carregar progresso salvo.', { erro: erro.message });
    return null;
  }
}

function exibirToastDiscreto(mensagem) {
  const toast = document.createElement('div');
  toast.textContent = mensagem;
  toast.style.position = 'fixed';
  toast.style.right = '16px';
  toast.style.bottom = '16px';
  toast.style.zIndex = '9999';
  toast.style.padding = '8px 12px';
  toast.style.border = '1px solid rgba(139, 0, 0, 0.85)';
  toast.style.background = 'rgba(10, 10, 10, 0.9)';
  toast.style.color = '#f0f0f0';
  toast.style.borderRadius = '6px';
  toast.style.fontSize = '12px';
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.2s ease';
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 250);
  }, 2400);
}



function t(chave, fallback = '', locale = window.GameState.locale, contexto = {}) {
  const dicionario = window.GameState.locales?.[locale] || {};
  const valor = chave
    .split('.')
    .reduce((acc, parte) => (acc && typeof acc === 'object' ? acc[parte] : undefined), dicionario);

  const textoBase = typeof valor === 'string' ? valor : fallback;
  if (typeof textoBase !== 'string') {
    return '';
  }

  return textoBase.replace(/\{(\w+)\}/g, (_, nome) => {
    if (Object.hasOwn(contexto, nome)) {
      return String(contexto[nome]);
    }
    return `{${nome}}`;
  });
}

function resolverTextoLocalizado(campoTexto) {
  if (typeof campoTexto === 'string') {
    return campoTexto;
  }
  if (campoTexto && typeof campoTexto === 'object') {
    return campoTexto[window.GameState.locale] || campoTexto['pt-BR'] || '';
  }
  return '';
}

function resolverEscolhasLocalizadas(cena) {
  const escolhasFonte = Array.isArray(cena.escolhas) ? cena.escolhas : cena.choices;
  return (escolhasFonte || []).map((escolha) => {
    const textoFonte = escolha.texto ?? escolha.text;
    const textoResolvido = resolverTextoLocalizado(textoFonte) || (typeof escolha.texto === 'string' ? escolha.texto : escolha.text);
    return {
      ...escolha,
      texto: textoResolvido,
      text: textoResolvido
    };
  });
}

async function carregarLocale(locale = 'pt-BR') {
  try {
    const resposta = await fetch(`locales/${locale}.json`);
    if (!resposta.ok) {
      throw new Error(`Locale ${locale} indisponível`);
    }
    const dados = await resposta.json();
    window.GameState.locales[locale] = dados;
    window.GameState.locale = locale;
  } catch (erro) {
    Logger.warn('I18N', 'Falha ao carregar locale.', { locale, erro: erro.message });
  }
}

const elementos = {
  telaAbertura: document.getElementById('tela-abertura'),
  telaNome: document.getElementById('tela-nome'),
  telaJogo: document.getElementById('tela-jogo'),
  btnIniciar: document.getElementById('btn-iniciar'),
  inputNome: document.getElementById('input-nome'),
  btnConfirmar: document.getElementById('btn-confirmar'),
  erroNome: document.getElementById('erro-nome'),
  areaBackground: document.getElementById('area-background'),
  nomePersonagem: document.getElementById('nome-personagem'),
  textoDialogo: document.getElementById('texto-dialogo'),
  escolhasContainer: document.getElementById('escolhas-container'),
  statusVida: document.getElementById('status-vida'),
  statusSanidade: document.getElementById('status-sanidade'),
  statusInventario: document.getElementById('status-inventario'),
  btnHistorico: document.getElementById('btn-historico'),
  painelHistorico: document.getElementById('painel-historico'),
  btnFecharHistorico: document.getElementById('btn-fechar-historico'),
  listaHistorico: document.getElementById('lista-historico')
};

function alternarTela(telaAtiva) {
  [elementos.telaAbertura, elementos.telaNome, elementos.telaJogo].forEach((tela) => {
    const ativa = tela === telaAtiva;
    tela.classList.toggle('tela-ativa', ativa);
    tela.setAttribute('aria-hidden', String(!ativa));
  });
}

function atualizarStatus() {
  elementos.statusVida.textContent = `${t('ui.vida', 'Vida')}: ${window.GameState.statusVida}`;
  elementos.statusSanidade.textContent = `${t('ui.sanidade', 'Sanidade')}: ${window.GameState.statusSanidade}`;
  elementos.statusInventario.textContent =
    `Atributos — FOR ${window.GameState.atributos.forca} | AGI ${window.GameState.atributos.agilidade} | RES ${window.GameState.atributos.resistencia} | PER ${window.GameState.atributos.percepcao} | MEN ${window.GameState.atributos.mente} | Inventário: ${window.GameState.inventario.length}/5`;
}

function limitarAtributo(valor) {
  return Math.max(1, Math.min(10, valor));
}

function recalcularStatusMaximos() {
  const formulas = configuracaoPersonagem.formulas || {};
  const hpBase = typeof formulas.hp_base === 'number' ? formulas.hp_base : 50;
  const hpPorResistencia = typeof formulas.hp_por_resistencia === 'number' ? formulas.hp_por_resistencia : 10;
  const sanidadeBase = typeof formulas.sanidade_base === 'number' ? formulas.sanidade_base : 50;
  const sanidadePorMente = typeof formulas.sanidade_por_mente === 'number' ? formulas.sanidade_por_mente : 10;

  const hpMaximo = hpBase + (window.GameState.atributos.resistencia * hpPorResistencia);
  const sanidadeMaxima = sanidadeBase + (window.GameState.atributos.mente * sanidadePorMente);

  window.GameState.statusVida = Math.max(0, Math.min(100, hpMaximo, window.GameState.statusVida));
  window.GameState.statusSanidade = Math.max(0, Math.min(100, sanidadeMaxima, window.GameState.statusSanidade));
}

function avancarCena(escolha, textoEscolha) {
  if (window.GameState.emCombate) {
    registrarHistorico('Ação de cena bloqueada durante combate.');
    return;
  }
  
  // Verificar comando especial __recomecar__
  if (escolha.proxima === '__recomecar__' || escolha.next_scene === '__recomecar__') {
    window.location.reload();
    return;
  }
  
  const resultadoEfeitos = aplicarEfeitos(escolha.efeito);
  if (resultadoEfeitos === 'INVENTARIO_CHEIO') {
    registrarHistorico(`Escolha bloqueada por inventário cheio: ${textoEscolha || 'Sem texto'}`);
    return;
  }

  if (resultadoEfeitos === 'COLAPSO_MENTAL') {
    registrarHistorico('Colapso mental: fim de jogo.');
    return;
  }

  if (window.GameState.cenaAtual === 'criacao_03') {
    window.GameState.statusVida = Math.min(100, 80 + (window.GameState.atributos.resistencia * 10));
    window.GameState.statusSanidade = Math.min(100, 60 + (window.GameState.atributos.mente * 8));
    registrarHistorico('Status recalculado após criação do personagem.');
    atualizarStatus();
    salvarProgresso();
  }

  registrarHistorico(`Escolha: ${textoEscolha || 'Sem texto'}`);
  elementos.telaJogo.style.opacity = '0';
  elementos.telaJogo.style.transition = 'opacity 0.3s ease';

  setTimeout(() => {
    elementos.telaJogo.style.opacity = '1';
    renderCena(escolha.proxima || escolha.next_scene);
  }, 300);
}

function renderEscolhas(cena) {
  const escolhasCena = Array.isArray(cena.escolhas) ? cena.escolhas : cena.choices;

  (escolhasCena || []).forEach((escolha) => {
    const textoEscolha = typeof escolha.texto === 'string' ? escolha.texto : (typeof escolha.text === 'string' ? escolha.text : '');

    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'botao-principal botao-escolha';
    botao.textContent = textoEscolha || 'Continuar';
    botao.addEventListener('click', () => avancarCena(escolha, textoEscolha));
    elementos.escolhasContainer.appendChild(botao);
  });

  if (!escolhasCena || escolhasCena.length === 0) {
    criarBotaoRecomecar();
  }
}

function registrarHistorico(mensagem) {
  const registro = `[${new Date().toLocaleTimeString('pt-BR')}] ${mensagem}`;
  window.GameState.historicoSessao.push(registro);

  const item = document.createElement('li');
  item.textContent = registro;
  elementos.listaHistorico.prepend(item);
}

function aplicarEfeitos(efeito = {}) {
  if (efeito.atributos && typeof efeito.atributos === 'object') {
    Object.entries(efeito.atributos).forEach(([atributo, valor]) => {
      if (typeof valor === 'number' && Object.hasOwn(window.GameState.atributos, atributo)) {
        window.GameState.atributos[atributo] = limitarAtributo(valor);
      }
    });
    registrarHistorico('Atributos base definidos na criação.');
  }

  if (efeito.modificadores && typeof efeito.modificadores === 'object') {
    Object.entries(efeito.modificadores).forEach(([atributo, valor]) => {
      if (typeof valor === 'number' && Object.hasOwn(window.GameState.atributos, atributo)) {
        window.GameState.atributos[atributo] = limitarAtributo(window.GameState.atributos[atributo] + valor);
      }
    });
    registrarHistorico('Atributos modificados por escolha.');
  }

  if (typeof efeito.traco === 'string' && efeito.traco.trim()) {
    if (!window.GameState.tracos.includes(efeito.traco)) {
      window.GameState.tracos.push(efeito.traco);
      registrarHistorico(`Novo traço: ${efeito.traco}`);
    }
  }

  if (typeof efeito.vida === 'number') {
    window.GameState.statusVida = Math.max(0, window.GameState.statusVida + efeito.vida);
  }

  if (typeof efeito.sanidade === 'number') {
    window.GameState.statusSanidade = Math.max(0, window.GameState.statusSanidade + efeito.sanidade);

    if (window.GameState.statusSanidade <= 0) {
      atualizarStatus();
      renderCena('colapso_mental');
      return 'COLAPSO_MENTAL';
    }
  }

  if (efeito.inventario !== undefined) {
    const itens = Array.isArray(efeito.inventario)
      ? efeito.inventario
      : [efeito.inventario];

    if (window.GameState.inventario.length + itens.length > 5) {
      registrarHistorico('Inventário cheio — descarte um item primeiro.');
      return 'INVENTARIO_CHEIO';
    }

    itens.forEach((item) => {
      window.GameState.inventario.push(item);
      registrarHistorico(`Item obtido: ${item}`);
    });
  }

  recalcularStatusMaximos();
  atualizarStatus();
  salvarProgresso();
  return 'OK';
}

function adicionarItemInventario(item) {
  if (window.GameState.inventario.length >= 5) {
    elementos.textoDialogo.textContent = 'Inventário cheio. Libere espaço antes de avançar.';
    Logger.warn('INVENTARIO', 'Tentativa de adicionar item com inventário cheio.', {
      item,
      capacidade: 5,
      ocupacaoAtual: window.GameState.inventario.length,
      cena: window.GameState.cenaAtual
    });
    return false;
  }

  window.GameState.inventario.push(item);
  registrarHistorico(`Item obtido: ${item}`);
  salvarProgresso();
  return 'OK';
}

function limparDigitacao() {
  if (intervaloDigitacao) {
    clearInterval(intervaloDigitacao);
    intervaloDigitacao = null;
  }
  digitando = false;
}

function mostrarTextoGradual(texto, aoFinal) {
  limparDigitacao();
  textoCompletoAtual = texto;
  elementos.textoDialogo.textContent = '';
  elementos.textoDialogo.style.opacity = '0.95';
  let indice = 0;
  digitando = true;

  intervaloDigitacao = setInterval(() => {
    if (indice >= texto.length) {
      limparDigitacao();
      elementos.textoDialogo.style.opacity = '1';
      aoFinal();
      return;
    }

    elementos.textoDialogo.textContent += texto[indice];
    indice += 1;
  }, window.GameState.velocidadeTexto);
}


function limparClassesBackground() {
  const classesBackground = Array.from(elementos.areaBackground.classList)
    .filter((classe) => classe.startsWith('bg-'));

  classesBackground.forEach((classe) => {
    elementos.areaBackground.classList.remove(classe);
  });
}

function aplicarClasseBackground(backgroundCena) {
  limparClassesBackground();

  if (typeof backgroundCena !== 'string' || !backgroundCena.trim()) {
    return;
  }

  const nomeClasse = backgroundCena
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!nomeClasse) {
    return;
  }

  elementos.areaBackground.classList.add(`bg-${nomeClasse}`);
}

function criarBotaoRecomecar() {
  elementos.escolhasContainer.innerHTML = '';
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'botao-principal botao-escolha';
  botao.textContent = 'Recomeçar';
  botao.addEventListener('click', () => window.location.reload());
  elementos.escolhasContainer.appendChild(botao);
}


function mapearOpcaoNarrativaParaEscolha(opcao = {}) {
  const efeito = {};

  if (opcao.atributos && typeof opcao.atributos === 'object') {
    efeito.atributos = opcao.atributos;
  }

  if (opcao.modificadores && typeof opcao.modificadores === 'object') {
    efeito.modificadores = opcao.modificadores;
  }

  if (typeof opcao.traco_inicial === 'string' && opcao.traco_inicial.trim()) {
    efeito.traco = opcao.traco_inicial;
  }

  return {
    texto: opcao.texto,
    proxima: opcao.proxima,
    efeito
  };
}

function resolverCenaCriacaoDinamica(cena) {
  if (!cena || cena.tipo !== 'criacao') {
    return cena;
  }

  const perguntas = Array.isArray(configuracaoPersonagem.perguntas_narrativas)
    ? configuracaoPersonagem.perguntas_narrativas
    : [];

  const pergunta = perguntas.find((item) => item.cena_id === cena.id);
  if (!pergunta) {
    return cena;
  }

  return {
    ...cena,
    texto: pergunta.narrativa || cena.texto,
    escolhas: (pergunta.opcoes || []).map(mapearOpcaoNarrativaParaEscolha)
  };
}

function renderCena(id) {
  const cena = window.GameState.cenas[id];
  const cenaJaVisitada = window.GameState.cenasVisitadas.includes(id);
  window.GameState.cenaAtual = id;
  if (!cenaJaVisitada) {
    window.GameState.cenasVisitadas.push(id);
  }
  salvarProgresso();
  elementos.escolhasContainer.innerHTML = '';

  if (!cena) {
    Logger.error('CENA', 'Cena não encontrada para renderização.', {
      idSolicitado: id,
      cenasDisponiveis: Object.keys(window.GameState.cenas).length
    });
    elementos.nomePersonagem.textContent = window.GameState.nomeJogador || 'SISTEMA';
    limparClassesBackground();
    elementos.textoDialogo.textContent = 'FIM DO CAPÍTULO';
    criarBotaoRecomecar();
    registrarHistorico('Capítulo encerrado.');
    return;
  }

  const cenaRenderizavelBase = resolverCenaCriacaoDinamica(cena);
  let cenaRenderizavel = cenaRenderizavelBase;

  if (id === 'item_mochila' && cenaJaVisitada) {
    cenaRenderizavel = {
      ...cenaRenderizavelBase,
      texto: t('cenas.item_mochila.vazia', 'A mochila está vazia — você já pegou tudo.'),
      escolhas: [
        {
          texto: t('cenas.item_mochila.deixar_e_continuar', 'Deixar para lá e continuar explorando'),
          proxima: 'exploracao_01'
        }
      ]
    };
  }

  if (cenaRenderizavel.tipo === 'criacao') {
    elementos.telaJogo.classList.add('modo-criacao');
  } else {
    elementos.telaJogo.classList.remove('modo-criacao');
  }

  const nomeExibicao = cenaRenderizavel.personagem || window.GameState.nomeJogador;
  elementos.nomePersonagem.textContent = nomeExibicao;

  aplicarClasseBackground(cenaRenderizavel.background);

  const textoCena = resolverTextoLocalizado(cenaRenderizavel.texto) || resolverTextoLocalizado(cenaRenderizavel.text);
  let escolhasCena = resolverEscolhasLocalizadas(cenaRenderizavel);

  if (id === 'exploracao_01' && window.GameState.cenasVisitadas.includes('item_mochila')) {
    escolhasCena = escolhasCena.filter((escolha) => escolha.proxima !== 'item_mochila' && escolha.next_scene !== 'item_mochila');
  }

  // Salvar cena anterior antes de iniciar combate (para retorno após vitória/fuga)
  const combateCena = cenaRenderizavel.combate;
  const pularCombateUmaVez = window.GameState.combateEncerrado === true;

  if (pularCombateUmaVez) {
    window.GameState.combateEncerrado = false;
  }

  if (combateCena && !window.GameState.emCombate && !pularCombateUmaVez) {
    window.GameState.cenaAnterior = id;
    iniciarCombate(combateCena.inimigo, id);
    return;
  }

  mostrarTextoGradual(textoCena || '', () => {
    Logger.info('CENA', 'Cena renderizada com sucesso.', {
      idCena: id,
      personagem: nomeExibicao,
      totalEscolhas: (escolhasCena || []).length
    });

    renderEscolhas({ ...cenaRenderizavel, escolhas: escolhasCena });
  });
}


// Bestiário carregado dinamicamente - será populado via fetch em carregarConfiguracaoPersonagem
// (já declarado na linha 50)

let bancoItens = {};

function obterPrimeiraArma() {
  const gruposArmas = bancoItens?.armas || {};
  for (const grupo of Object.values(gruposArmas)) {
    if (Array.isArray(grupo) && grupo.length > 0) {
      return grupo[0];
    }
  }
  return null;
}

/**
 * Renderiza a UI de combate no painel inferior
 * Substitui a área de diálogo pelo painel de combate
 */
function renderCombate() {
  const inimigo = window.GameState.inimigoAtual;
  if (!inimigo) {
    return;
  }

  // Atualizar cabeçalho do diálogo para mostrar info do combate
  elementos.nomePersonagem.textContent = `COMBATE — ${inimigo.nome}`;
  
  // Criar HTML completo do painel de combate
  const hpPorcentagemInimigo = Math.round((inimigo.hp / inimigo.hpMaximo) * 100);
  const hpPorcentagemJogador = Math.round((window.GameState.statusVida / 100) * 100);
  
  // Gerar botões das partes do corpo (somente partes não destruídas)
  let partesHTML = '';
  const partesDisponiveis = Object.entries(inimigo.partes || {})
    .filter(([, parteDados]) => !parteDados.destruida);

  if (partesDisponiveis.length > 0) {
    for (const [parteNome] of partesDisponiveis) {
      const nomeParte = parteNome.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      partesHTML += `<button type="button" class="parte-btn" data-parte="${parteNome}">${nomeParte}</button>`;
    }
  } else {
    partesHTML = '<span style="color: #888; font-style: italic;">Nenhuma parte disponível.</span>';
  }
  
  // Gerar lista de itens do inventário
  let itensHTML = '';
  if (window.GameState.alvoSelecionado === 'selecionando_item') {
    if (window.GameState.inventario.length === 0) {
      itensHTML = '<span style="color: #888; font-style: italic;">Inventário vazio.</span>';
    } else {
      for (const itemId of window.GameState.inventario) {
        // Buscar nome do item
        let nomeItem = itemId;
        for (const categoria of Object.values(bancoItens || {})) {
          if (Array.isArray(categoria)) {
            const itemEncontrado = categoria.find(i => i.id === itemId || i.nome === itemId);
            if (itemEncontrado) {
              nomeItem = itemEncontrado.nome || itemId;
              break;
            }
          }
        }
        itensHTML += `<button type="button" class="btn-acao-combate" data-item="${itemId}" style="font-size: 11px;">${nomeItem}</button>`;
      }
    }
  }
  
  elementos.textoDialogo.innerHTML = `
    <div class="painel-combate">
      <!-- Info do Inimigo -->
      <div class="barra-hp-container">
        <span style="color: var(--vermelho-sangue); font-weight: bold;">[INIMIGO]</span>
        <span>${inimigo.nome}</span>
        <span>HP:</span>
        <div class="barra-hp" style="flex: 1; max-width: 150px;">
          <div class="barra-hp-fill inimigo" style="width: ${hpPorcentagemInimigo}%;"></div>
        </div>
        <span>${inimigo.hp}/${inimigo.hpMaximo}</span>
      </div>
      
      <!-- Partes do corpo (aparecem ao atacar) -->
      ${window.GameState.alvoSelecionado === 'selecionando_parte' ? `
      <div class="partes-container" style="margin-top: 4px;">
        ${partesHTML}
      </div>
      ` : ''}
      
      <!-- Lista de itens (aparece ao usar item) -->
      ${window.GameState.alvoSelecionado === 'selecionando_item' ? `
      <div class="acoes-combate" style="margin-top: 4px;">
        ${itensHTML}
      </div>
      ` : ''}
      
      <!-- Info do Jogador -->
      <div class="barra-hp-container" style="margin-top: 6px; border-top: 1px solid #333; padding-top: 6px;">
        <span style="color: #2d4a1e; font-weight: bold;">[JOGADOR]</span>
        <span>${window.GameState.nomeJogador}</span>
        <span>Vida:</span>
        <div class="barra-hp" style="flex: 1; max-width: 150px;">
          <div class="barra-hp-fill jogador" style="width: ${hpPorcentagemJogador}%;"></div>
        </div>
        <span>${window.GameState.statusVida}/100</span>
        <span style="margin-left: 12px;">San:</span>
        <span>${window.GameState.statusSanidade}/100</span>
        <span style="margin-left: 12px;">Inv:</span>
        <span>${window.GameState.inventario.length}/5</span>
      </div>
      
      <!-- Ações de combate -->
      <div class="acoes-combate" style="margin-top: 8px;">
        <button type="button" class="btn-acao-combate" data-acao="atacar">ATACAR ▾</button>
        <button type="button" class="btn-acao-combate" data-acao="usar-item">USAR ITEM</button>
        <button type="button" class="btn-acao-combate" data-acao="fugir">FUGIR</button>
        <button type="button" class="btn-acao-combate" data-acao="examinar">EXAMINAR</button>
      </div>
      
      <!-- Log de combate -->
      <div class="log-combate" id="log-combate-msg">
        Turno ${window.GameState.turnoCombate}: Selecione uma ação.
      </div>
    </div>
  `;
  
  // Adicionar event listeners para as ações principais após inserir HTML no DOM
  document.querySelector('[data-acao="fugir"]')
    ?.addEventListener('click', () => resolverAcaoJogador('fugir'));
  document.querySelector('[data-acao="atacar"]')
    ?.addEventListener('click', () => resolverAcaoJogador('atacar'));
  document.querySelector('[data-acao="usar-item"]')
    ?.addEventListener('click', () => resolverAcaoJogador('usar-item'));
  document.querySelector('[data-acao="examinar"]')
    ?.addEventListener('click', () => resolverAcaoJogador('examinar'));
  
  // Adicionar event listeners para as partes do corpo
  elementos.textoDialogo.querySelectorAll('.parte-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const parte = btn.dataset.parte;
      if (!btn.classList.contains('destruida')) {
        resolverAtaqueParte(parte);
      }
    });
  });
  
  // Adicionar event listeners para os itens do inventário
  elementos.textoDialogo.querySelectorAll('[data-item]').forEach(btn => {
    btn.addEventListener('click', () => {
      const itemId = btn.dataset.item;
      usarItemCombate(itemId);
    });
  });
}

/**
 * Exibe mensagem no log de combate
 */
function logCombate(mensagem) {
  const logEl = document.getElementById('log-combate-msg');
  if (logEl) {
    logEl.textContent = mensagem;
  }
  registrarHistorico(`Combate: ${mensagem}`);
}

/**
 * Inicia o combate com os dados do inimigo
 */
function iniciarCombate(dadosInimigo, cenaId) {
  // Verificar se o bestiário foi carregado
  if (!BESTIARIO_COMBATE || Object.keys(BESTIARIO_COMBATE).length === 0) {
    Logger.error('COMBATE', 'Bestiário não carregado. Impossível iniciar combate.');
    Logger.info('COMBATE', 'Inimigos disponíveis: nenhum (bestiário vazio)');
    // Renderizar cena normalmente sem combate
    if (cenaId) {
      renderCena(cenaId);
    }
    return;
  }
  
  // Buscar inimigo no bestiário por ID ou nome
  let baseInimigo = BESTIARIO_COMBATE[dadosInimigo] || BESTIARIO_COMBATE['barata_americana'];
  
  // Se não encontrou, registrar erro e renderizar cena normalmente sem combate
  if (!baseInimigo) {
    Logger.error('COMBATE', 'Inimigo não encontrado: ' + dadosInimigo);
    Logger.info('COMBATE', 'Inimigos disponíveis: ' + Object.keys(BESTIARIO_COMBATE).join(', '));
    // Renderizar cena normalmente sem combate
    if (cenaId) {
      renderCena(cenaId);
    }
    return;
  }
  
  window.GameState.emCombate = true;
  window.GameState.turnoCombate = 1;
  window.GameState.acoesDisponiveis = ['atacar', 'usar_item', 'fugir', 'examinar'];
  window.GameState.alvoSelecionado = null;
  
  // Clonar inimigo e inicializar estado de combate
  window.GameState.inimigoAtual = {
    ...baseInimigo,
    hpMaximo: baseInimigo.hp,
    turnoAtual: 0,
    statusAtivos: [],
    partes: JSON.parse(JSON.stringify(baseInimigo.partes || {}))
  };
  
  registrarHistorico(`Combate iniciado contra ${window.GameState.inimigoAtual.nome}.`);
  renderCombate();
}

/**
 * Processa a ação escolhida pelo jogador
 */
function resolverAcaoJogador(acao) {
  const inimigo = window.GameState.inimigoAtual;
  
  switch (acao) {
    case 'atacar':
      // Entrar em modo de seleção de parte
      window.GameState.alvoSelecionado = 'selecionando_parte';
      logCombate('Selecione a parte do corpo para atacar.');
      renderCombate();
      break;
      
    case 'usar_item':
    case 'usar-item':
      resolverUsarItem();
      break;
      
    case 'fugir':
      resolverFuga();
      break;
      
    case 'examinar':
      resolverExaminar();
      break;
  }
}

/**
 * Resolve o ataque a uma parte específica do inimigo
 */
function resolverAtaqueParte(parteAlvo) {
  if (!window.GameState.emCombate) {
    return;
  }

  // Verificar se o inimigo ainda existe (pode ter sido perdido durante o combate)
  if (!window.GameState.inimigoAtual) {
    Logger.error('COMBATE', 'Inimigo atual é null em resolverAtaqueParte.');
    return;
  }
  
  const inimigo = window.GameState.inimigoAtual;
  
  if (!inimigo.partes || !inimigo.partes[parteAlvo]) {
    logCombate('Parte do corpo inválida.');
    return;
  }
  
  const parte = inimigo.partes[parteAlvo];
  if (parte.destruida) {
    logCombate(`Esta parte já está destruída!`);
    return;
  }
  
  // Calcular dano
  const arma = obterPrimeiraArma();
  const danoArma = arma && arma.dano ? Math.round((arma.dano.min + arma.dano.max) / 2) : 2;
  const bonusCombativo = window.GameState.tracos.includes('combativo') ? 1 : 0;
  const danoBase = window.GameState.atributos.forca * 1.5;
  const danoTotal = Math.floor(danoBase + danoArma + bonusCombativo);
  
  // Aplicar dano na parte
  parte.hp = Math.max(0, parte.hp - danoTotal);
  
  // Aplicar dano no HP total também
  inimigo.hp = Math.max(0, inimigo.hp - danoTotal);
  Logger.info('COMBATE', `Dano aplicado no inimigo. HP atual: ${inimigo.hp}`);
  
  const nomeParte = parteAlvo.replace('_', ' ').toLowerCase();
  
  // Verificar se a parte foi destruída
  if (parte.hp <= 0 && !parte.destruida) {
    parte.destruida = true;
    aplicarEfeitoDestruicao(parte.efeito_destruicao, inimigo);
    logCombate(`Você acertou ${nomeParte} por ${danoTotal} de dano e DESTRUIU a parte!`);
  } else {
    logCombate(`Você acertou ${nomeParte} por ${danoTotal} de dano.`);
  }
  
  // Sair do modo de seleção
  window.GameState.alvoSelecionado = null;

  verificarFimCombate();
  if (!window.GameState.emCombate) {
    return;
  }
  
  // Avançar para turno do inimigo
  setTimeout(() => resolverTurnoInimigo(), 800);
}

/**
 * Aplica efeitos de destruição de parte
 */
function aplicarEfeitoDestruicao(efeito, inimigo) {
  switch (efeito) {
    case 'morte_instantanea':
      inimigo.hp = 0;
      logCombate(`${inimigo.nome} morre instantaneamente!`);
      break;
      
    case 'sangramento_grave':
      inimigo.statusAtivos.push({ tipo: 'sangramento_grave', turnosRestantes: 4 });
      logCombate(`${inimigo.nome} começa a sangrar gravemente!`);
      break;
      
    case 'veneno':
      window.GameState.statusAtivos = window.GameState.statusAtivos || [];
      window.GameState.statusAtivos.push({ tipo: 'veneno', turnosRestantes: 4 });
      logCombate(`Você foi envenenado pelo ${inimigo.nome}!`);
      break;
      
    case 'reduz_velocidade':
      inimigo.velocidade = Math.max(1, (inimigo.velocidade || 5) - 3);
      logCombate(`A velocidade de ${inimigo.nome} foi reduzida!`);
      break;
      
    case 'remove_deteccao':
      inimigo.detectouJogador = false;
      logCombate(`${inimigo.nome} perdeu a detecção do jogador!`);
      break;
      
    case 'veneno_area':
      window.GameState.statusAtivos = window.GameState.statusAtivos || [];
      window.GameState.statusAtivos.push({ tipo: 'veneno', turnosRestantes: 3 });
      logCombate(`Veneno em área liberado! Você foi afetado.`);
      break;
      
    case 'reduz_dano':
      inimigo.danoReduzido = true;
      logCombate(`O dano de ${inimigo.nome} foi reduzido!`);
      break;
  }
}

/**
 * Resolve o uso de item em combate
 * Exibe lista de itens do inventário para o jogador escolher
 */
function resolverUsarItem() {
  if (window.GameState.inventario.length === 0) {
    logCombate('Inventário vazio.');
    // Não passa turno, apenas informa e retorna ao estado normal de combate
    window.GameState.alvoSelecionado = null;
    renderCombate();
    return;
  }
  
  // Exibir lista de itens como botões clicáveis na UI de combate
  window.GameState.alvoSelecionado = 'selecionando_item';
  renderCombate();
  logCombate('Selecione um item para usar.');
}

/**
 * Usa um item específico do inventário
 */
function usarItemCombate(itemId) {
  const indexItem = window.GameState.inventario.indexOf(itemId);
  
  if (indexItem === -1) {
    logCombate('Item não encontrado no inventário.');
    window.GameState.alvoSelecionado = null;
    renderCombate();
    return;
  }
  
  // Buscar dados do item
  let itemDados = null;
  for (const categoria of Object.values(bancoItens || {})) {
    if (Array.isArray(categoria)) {
      itemDados = categoria.find(i => i.id === itemId || i.nome === itemId);
      if (itemDados) break;
    }
  }
  
  // Aplicar efeitos do item
  if (itemDados && itemDados.efecto) {
    const efeito = itemDados.efecto;
    let mensagemEfeito = '';
    
    if (efeito.vida) {
      window.GameState.statusVida = Math.min(100, window.GameState.statusVida + efeito.vida);
      mensagemEfeito += `${efeito.vida} de vida`;
    }
    if (efeito.sanidade) {
      window.GameState.statusSanidade = Math.min(100, window.GameState.statusSanidade + efeito.sanidade);
      if (mensagemEfeito) mensagemEfeito += ', ';
      mensagemEfeito += `${efeito.sanidade} de sanidade`;
    }
    
    logCombate(`Você usou ${itemDados.nome || itemId} e recuperou ${mensagemEfeito}.`);
  } else {
    logCombate(`Você usou ${itemId}.`);
  }
  
  // Remover item do inventário
  window.GameState.inventario.splice(indexItem, 1);
  atualizarStatus();
  salvarProgresso();
  
  // Sair do modo de seleção e passar turno para o inimigo
  window.GameState.alvoSelecionado = null;
  setTimeout(() => resolverTurnoInimigo(), 500);
}

/**
 * Resolve tentativa de fuga
 */
function resolverFuga() {
  const inimigo = window.GameState.inimigoAtual;
  
  // Verificar se há efeito que impede fuga
  if (inimigo.statusAtivos?.some(s => s.tipo === 'imobilizacao')) {
    logCombate('Você não pode fugir enquanto está imobilizado!');
    setTimeout(() => resolverTurnoInimigo(), 500);
    return;
  }
  
  // Calcular chance de fuga
  const chanceFuga = (window.GameState.atributos.agilidade * 0.08) + 
    ((inimigo.velocidade || 5) < window.GameState.atributos.agilidade ? 0.2 : -0.2);
  const fugaBemSucedida = Math.random() < Math.max(0.05, Math.min(0.95, chanceFuga));
  
  if (fugaBemSucedida) {
    logCombate('Você conseguiu fugir com sucesso!');
    encerrarCombate('fuga');
  } else {
    logCombate('Você tenta fugir mas o inimigo bloqueia o caminho!');
    setTimeout(() => resolverTurnoInimigo(), 500);
  }
}

/**
 * Examina o inimigo (não consome turno)
 */
function resolverExaminar() {
  const inimigo = window.GameState.inimigoAtual;
  
  let infoExame = `${inimigo.nome}:\n`;
  infoExame += `HP Total: ${inimigo.hp}/${inimigo.hpMaximo}\n`;
  
  if (inimigo.partes) {
    infoExame += `Partes:\n`;
    for (const [parteNome, parteDados] of Object.entries(inimigo.partes)) {
      const nomeParte = parteNome.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      const statusParte = parteDados.destruida ? 'DESTRUÍDA' : `${parteDados.hp} HP`;
      infoExame += `  - ${nomeParte}: ${statusParte}\n`;
    }
  }
  
  if (inimigo.tracos && inimigo.tracos.length > 0) {
    infoExame += `Traços: ${inimigo.tracos.join(', ')}\n`;
  }
  
  if (inimigo.fraquezas && inimigo.fraquezas.length > 0) {
    infoExame += `Fraquezas: ${inimigo.fraquezas.join(', ')}`;
  }
  
  alert(infoExame);
  // Examinar não consome turno
  renderCombate();
}

/**
 * Aplica efeitos de status em uma entidade (jogador ou inimigo)
 */
function aplicarEfeitosStatus(entidade, ehJogador = false) {
  const statusAtivos = entidade.statusAtivos || [];
  
  for (let i = statusAtivos.length - 1; i >= 0; i--) {
    const status = statusAtivos[i];
    const efeitoConfig = EFEITOS_STATUS[status.tipo];
    
    if (!efeitoConfig) continue;
    
    // Aplicar dano por turno
    if (efeitoConfig.dano_por_turno) {
      if (ehJogador) {
        window.GameState.statusVida = Math.max(0, window.GameState.statusVida - efeitoConfig.dano_por_turno);
        logCombate(`${status.tipo} causa ${efeitoConfig.dano_por_turno} de dano em você!`);
      } else {
        entidade.hp = Math.max(0, entidade.hp - efeitoConfig.dano_por_turno);
        logCombate(`${entidade.nome} sofre ${efeitoConfig.dano_por_turno} de dano de ${status.tipo}!`);
      }
    }
    
    // Decrementar duração
    status.turnosRestantes--;
    
    // Remover se expirou
    if (status.turnosRestantes <= 0) {
      statusAtivos.splice(i, 1);
      logCombate(`Efeito ${status.tipo} expirou.`);
    }
  }
  
  entidade.statusAtivos = statusAtivos;
}

/**
 * Resolve o turno do inimigo
 */
function resolverTurnoInimigo() {
  if (!window.GameState.emCombate || !window.GameState.inimigoAtual) {
    return;
  }
  
  const inimigo = window.GameState.inimigoAtual;
  inimigo.turnoAtual++;
  
  // Aplicar efeitos de status no inimigo
  aplicarEfeitosStatus(inimigo, false);
  
  // Verificar se inimigo morreu por efeitos de status
  if (inimigo.hp <= 0) {
    encerrarCombate('vitoria');
    return;
  }
  
  // Verificar traços de comportamento
  if (inimigo.tracos?.includes('fuga_baixo_hp') && inimigo.hp < inimigo.hpMaximo * 0.3) {
    logCombate(`${inimigo.nome} recua assustado!`);
    setTimeout(() => encerrarCombate('fuga_inimigo'), 1000);
    return;
  }
  
  // Verificar atordoamento
  if (inimigo.statusAtivos?.some(s => s.tipo === 'atordoamento')) {
    logCombate(`${inimigo.nome} está atordoado e perde o turno!`);
    window.GameState.turnoCombate++;
    renderCombate();
    return;
  }
  
  // Ataque básico do inimigo
  const acerto = Math.random() < (0.7 + (inimigo.agilidade || 5) * 0.02);
  
  if (acerto) {
    const danoBase = inimigo.dano || 8;
    const dano = danoBase + Math.floor(Math.random() * 5);
    
    // Aplicar dano ao jogador
    window.GameState.statusVida = Math.max(0, window.GameState.statusVida - dano);
    logCombate(`${inimigo.nome} ataca! Você recebe ${dano} de dano.`);
    
    // Verificar colapso mental por sanidade baixa
    if (window.GameState.statusVida <= 0) {
      setTimeout(() => encerrarCombate('derrota'), 1000);
      return;
    }
  } else {
    logCombate(`${inimigo.nome} ataca mas erra!`);
  }
  
  // Aplicar efeitos de status no jogador
  window.GameState.statusAtivos = window.GameState.statusAtivos || [];
  aplicarEfeitosStatus({ statusAtivos: window.GameState.statusAtivos }, true);
  
  window.GameState.turnoCombate++;
  atualizarStatus();
  verificarFimCombate();
  renderCombate();
}

/**
 * Verifica condições de fim de combate
 */
function verificarFimCombate() {
  Logger.info('COMBATE', 'verificarFimCombate chamado — HP inimigo: ' + window.GameState.inimigoAtual?.hp);
  if (!window.GameState.inimigoAtual) {
    return;
  }
  
  if (window.GameState.inimigoAtual.hp <= 0) {
    encerrarCombate('vitoria');
  } else if (window.GameState.statusVida <= 0) {
    encerrarCombate('derrota');
  }
}

function limparEstadoCombate() {
  const painelCombate = elementos.textoDialogo.querySelector('.painel-combate');
  if (painelCombate) {
    painelCombate.replaceWith(painelCombate.cloneNode(false));
  }

  elementos.textoDialogo.textContent = '';
  window.GameState.inimigoAtual = null;
  window.GameState.turnoCombate = 0;
  window.GameState.alvoSelecionado = null;
  window.GameState.acoesDisponiveis = [];
}

/**
 * Encerra o combate e processa o resultado
 */
function encerrarCombate(resultado) {
  if (!window.GameState.emCombate && resultado !== 'fuga_inimigo') {
    return;
  }

  window.GameState.emCombate = false;
  window.GameState.combateEncerrado = true;
  const inimigoDerrotado = window.GameState.inimigoAtual;
  
  switch (resultado) {
    case 'vitoria':
      logCombate('Você venceu o combate!');
      // Loot: adicionar drops se houver espaço
      if (inimigoDerrotado?.drops) {
        for (const drop of inimigoDerrotado.drops) {
          if (window.GameState.inventario.length < 5) {
            window.GameState.inventario.push(drop);
            logCombate(`Obteve: ${drop}`);
          }
        }
      }
      atualizarStatus();
      salvarProgresso();
      // Limpar painel de combate e restaurar área de diálogo normal após 2 segundos
      setTimeout(() => {
        limparEstadoCombate();
        renderCena(window.GameState.cenaAnterior || 'exploracao_01');
      }, 2000);
      break;
      
    case 'derrota':
      logCombate('Você foi derrotado...');
      setTimeout(() => {
        limparEstadoCombate();
        renderCena('game_over');
      }, 1500);
      break;
      
    case 'fuga':
      logCombate('Você fugiu do combate.');
      setTimeout(() => {
        limparEstadoCombate();
        renderCena(window.GameState.cenaAnterior || 'exploracao_01');
      }, 1000);
      break;
      
    case 'fuga_inimigo':
      logCombate('O inimigo fugiu!');
      setTimeout(() => {
        limparEstadoCombate();
        renderCena(window.GameState.cenaAtual);
      }, 2000);
      break;
  }
}

async function carregarCapitulo(numero = 1) {
  try {
    const resposta = await fetch(`story/chapter${numero}.json`);
    if (!resposta.ok) {
      throw new Error(`Falha HTTP ${resposta.status}`);
    }

    const dados = await resposta.json();
    Logger.info('CARREGAMENTO', 'JSON do capítulo carregado.', { totalCenas: dados.cenas?.length || 0 });
    
    window.GameState.capituloAtual = numero;
    window.GameState.cenas = {};
    
    for (const cena of dados.cenas || []) {
      if (cena && cena.id) {
        window.GameState.cenas[cena.id] = cena;
      }
    }
    
    Logger.info('CARREGAMENTO', 'Cenas indexadas.', { totalIndexadas: Object.keys(window.GameState.cenas).length, ids: Object.keys(window.GameState.cenas) });

    const primeiraCena = window.GameState.cenas['criacao_01'] ? 'criacao_01' : (dados.cenas && dados.cenas[0] && dados.cenas[0].id) || null;
    
    Logger.info('CARREGAMENTO', 'Primeira cena determinada.', { primeiraCena, temCriacao01: !!window.GameState.cenas['criacao_01'] });
    
    if (!primeiraCena) {
      throw new Error('Nenhuma cena encontrada no capítulo.');
    }

    atualizarStatus();
    registrarHistorico(`Capítulo ${numero} carregado: ${dados.titulo || dados.title || 'Sem título'}`);
    alternarTela(elementos.telaJogo);
    renderCena(primeiraCena);
  } catch (erro) {
    Logger.fatal('REDE', 'Falha ao carregar JSON do capítulo.', {
      arquivo: `story/chapter${numero}.json`,
      erro: erro.message
    });
    elementos.erroNome.textContent = `Erro ao carregar capítulo: ${erro.message}`;
    elementos.erroNome.style.color = '#ff2e2e';
  }
}

async function carregarConfiguracaoPersonagem() {
  try {
    const resposta = await fetch('data/character.json');
    if (!resposta.ok) {
      throw new Error(`Falha HTTP ${resposta.status}`);
    }
    configuracaoPersonagem = await resposta.json();

    const respostaItens = await fetch('data/items.json');
    if (respostaItens.ok) {
      bancoItens = await respostaItens.json();
    }

    // Carregar bestiário para o sistema de combate
    const respostaBestiario = await fetch('data/bestiary.json');
    if (respostaBestiario.ok) {
      const dadosBestiario = await respostaBestiario.json();
      // Indexar inimigos por ID e também por nome para compatibilidade
      BESTIARIO_COMBATE = {};
      for (const inimigo of dadosBestiario.inimigos || []) {
        // Indexar por ID
        BESTIARIO_COMBATE[inimigo.id] = inimigo;
        // Indexar por nome para compatibilidade com cenas antigas
        BESTIARIO_COMBATE[inimigo.nome] = inimigo;
      }
      window.GameState.bestiario = BESTIARIO_COMBATE;
      Logger.info('COMBATE', 'Bestiário carregado com sucesso.', { total: Object.keys(BESTIARIO_COMBATE).length });
      Logger.info('COMBATE', 'Inimigos disponíveis: ' + Object.keys(BESTIARIO_COMBATE).join(', '));
    }
  } catch (erro) {
    configuracaoPersonagem = {};
    registrarHistorico(`Aviso: character.json indisponível (${erro.message}).`);
    Logger.warn('COMBATE', 'Falha ao carregar bestiário.', { erro: erro.message });
  } finally {
    recalcularStatusMaximos();
    atualizarStatus();
    salvarProgresso();
  }
}

function validarNome(nome) {
  return nome.trim().length > 0;
}

elementos.btnIniciar.addEventListener('click', () => {
  alternarTela(elementos.telaNome);
  elementos.inputNome.focus();
});

elementos.btnConfirmar.addEventListener('click', async () => {
  if (inicializacaoEmAndamento) {
    return;
  }

  const nomeDigitado = elementos.inputNome.value.trim();

  if (!validarNome(nomeDigitado)) {
    elementos.erroNome.textContent = 'Digite um nome válido para continuar.';
    return;
  }

  elementos.erroNome.textContent = '';
  window.GameState.nomeJogador = nomeDigitado;
  inicializacaoEmAndamento = true;

  try {
    await carregarConfiguracaoPersonagem();
    await carregarLocale(window.GameState.locale || 'pt-BR');

    const progresso = carregarProgressoSalvo();
    const capitulo = progresso?.capitulo || window.GameState.capituloAtual || 1;
    await carregarCapitulo(capitulo);
    if (progresso?.cena && window.GameState.cenas[progresso.cena]) {
      renderCena(progresso.cena);
      registrarHistorico('Progresso restaurado automaticamente.');
    }

    salvarProgresso();
  } finally {
    inicializacaoEmAndamento = false;
  }
});

elementos.inputNome.addEventListener('keydown', (evento) => {
  if (evento.key === 'Enter') {
    elementos.btnConfirmar.click();
  }
});

elementos.textoDialogo.addEventListener('click', () => {
  if (digitando) {
    limparDigitacao();
    elementos.textoDialogo.textContent = textoCompletoAtual;

    const cena = window.GameState.cenas[window.GameState.cenaAtual];
    if (cena) {
      elementos.escolhasContainer.innerHTML = '';
      renderEscolhas(cena);
    }
  }
});

elementos.btnHistorico.addEventListener('click', () => {
  const aberto = elementos.painelHistorico.classList.toggle('aberto');
  elementos.painelHistorico.setAttribute('aria-hidden', aberto ? 'false' : 'true');
});

elementos.btnFecharHistorico.addEventListener('click', () => {
  elementos.painelHistorico.classList.remove('aberto');
  elementos.painelHistorico.setAttribute('aria-hidden', 'true');
});

alternarTela(elementos.telaAbertura);
atualizarStatus();
