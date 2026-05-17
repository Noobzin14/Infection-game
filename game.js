window.GameState = window.GameState || {};

Object.assign(window.GameState, {
  nomeJogador: '',
  cenas: {},
  cenaAtual: null,
  statusVida: 100,
  statusSanidade: 100,
  inventario: [],
  historicoSessao: [],
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


const CHAVE_SALVAMENTO = 'infection_game_save_v1';
const VERSAO_SAVE_ATUAL = '1';

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

  if (efeito.inventario) {
    if (Array.isArray(efeito.inventario)) {
      for (const item of efeito.inventario) {
        if (!adicionarItemInventario(item)) {
          return 'INVENTARIO_CHEIO';
        }
      }
    } else if (!adicionarItemInventario(efeito.inventario)) {
      return 'INVENTARIO_CHEIO';
    }
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
  window.GameState.cenaAtual = id;
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

  const cenaRenderizavel = resolverCenaCriacaoDinamica(cena);

  if (cenaRenderizavel.tipo === 'criacao') {
    elementos.telaJogo.classList.add('modo-criacao');
  } else {
    elementos.telaJogo.classList.remove('modo-criacao');
  }

  const nomeExibicao = cenaRenderizavel.personagem || window.GameState.nomeJogador;
  elementos.nomePersonagem.textContent = nomeExibicao;

  aplicarClasseBackground(cenaRenderizavel.background);

  const textoCena = resolverTextoLocalizado(cenaRenderizavel.texto) || resolverTextoLocalizado(cenaRenderizavel.text);
  const escolhasCena = resolverEscolhasLocalizadas(cenaRenderizavel);

  if (cenaRenderizavel.combate && !window.GameState.emCombate) {
    iniciarCombate(cenaRenderizavel.combate.inimigo);
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



const BESTIARIO_COMBATE = {
  'Barata Americana': {
    nome: 'Barata Americana',
    hp: 30,
    dano: 8,
    agilidade: 5,
    velocidade: 7,
    fraquezas: ['Fogo', 'Esmagamento']
  },
  "Barata d'Água": {
    nome: "Barata d'Água",
    hp: 80,
    dano: 22,
    agilidade: 5,
    velocidade: 7,
    fraquezas: ['Eletricidade', 'Esmagamento']
  }
};

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

function renderCombate() {
  const inimigo = window.GameState.inimigoAtual;
  if (!inimigo) {
    return;
  }

  elementos.nomePersonagem.textContent = `COMBATE — ${inimigo.nome}`;
  const textoFraquezas = Array.isArray(inimigo.fraquezas) ? inimigo.fraquezas.join(', ') : 'Desconhecidas';
  elementos.textoDialogo.textContent = `Turno ${window.GameState.turnoCombate}: ${inimigo.nome} HP ${inimigo.hp}. Fraquezas conhecidas: ${textoFraquezas}.`;

  elementos.escolhasContainer.innerHTML = '';
  window.GameState.acoesDisponiveis.forEach((acao) => {
    const botao = document.createElement('button');
    botao.className = 'botao-principal botao-escolha';
    botao.textContent = acao;
    botao.addEventListener('click', () => {
      const resultado = resolverAcaoCombatente(acao);
      registrarHistorico(`Combate: ${resultado.resultado}`);
      if (window.GameState.emCombate) {
        renderCombate();
      } else {
        renderCena(window.GameState.cenaAtual);
      }
    });
    elementos.escolhasContainer.appendChild(botao);
  });
}

function iniciarCombate(inimigo) {
  const baseInimigo = BESTIARIO_COMBATE[inimigo] || BESTIARIO_COMBATE['Barata Americana'];
  window.GameState.emCombate = true;
  window.GameState.turnoCombate = 1;
  window.GameState.acoesDisponiveis = ['atacar', 'usar_item', 'fugir', 'examinar'];
  window.GameState.inimigoAtual = {
    ...baseInimigo,
    hpMaximo: baseInimigo.hp
  };
  registrarHistorico(`Combate iniciado contra ${window.GameState.inimigoAtual.nome}.`);
  renderCombate();
}

function resolverAcaoCombatente(tipoAcao, alvo = null) {
  const inimigo = window.GameState.inimigoAtual;
  const formulas = configuracaoPersonagem?.formulas_combate || {};

  switch (tipoAcao) {
    case 'atacar': {
      const arma = obterPrimeiraArma();
      const danoArma = arma && arma.dano ? Math.round((arma.dano.min + arma.dano.max) / 2) : 2;
      const bonusCombativo = window.GameState.tracos.includes('combativo') ? 1 : 0;
      const multiplicadorForca = typeof formulas.dano_melee === 'string' ? 1.5 : 1.5;
      const dano = Math.max(1, Math.round((window.GameState.atributos.forca * multiplicadorForca) + danoArma + bonusCombativo));
      inimigo.hp = Math.max(0, inimigo.hp - dano);
      if (inimigo.hp === 0) {
        window.GameState.emCombate = false;
        window.GameState.inimigoAtual = null;
        window.GameState.turnoCombate = 0;
        salvarProgresso();
        return { resultado: `Você derrotou ${inimigo.nome}.`, dados: { dano, alvo } };
      }
      window.GameState.turnoCombate += 1;
      return { resultado: `Ataque causou ${dano} de dano.`, dados: { dano, hpInimigo: inimigo.hp, alvo } };
    }
    case 'usar_item': {
      const idItem = window.GameState.inventario[0];
      if (!idItem) {
        return { resultado: 'Sem itens no inventário para usar.', dados: {} };
      }
      window.GameState.inventario.shift();
      atualizarStatus();
      salvarProgresso();
      window.GameState.turnoCombate += 1;
      return { resultado: `Item ${idItem} consumido em combate.`, dados: { item: idItem } };
    }
    case 'fugir': {
      const velocidadeInimigo = inimigo?.velocidade || 5;
      const chanceFuga = (window.GameState.atributos.agilidade * 0.08) + (velocidadeInimigo < window.GameState.atributos.agilidade ? 0.2 : -0.2);
      if (Math.random() < Math.max(0.05, Math.min(0.95, chanceFuga))) {
        window.GameState.emCombate = false;
        window.GameState.inimigoAtual = null;
        window.GameState.turnoCombate = 0;
        salvarProgresso();
        return { resultado: 'Fuga bem-sucedida.', dados: { chanceFuga } };
      }
      window.GameState.turnoCombate += 1;
      return { resultado: 'Falha ao fugir.', dados: { chanceFuga } };
    }
    case 'examinar': {
      const fraquezas = Array.isArray(inimigo?.fraquezas) ? inimigo.fraquezas : [];
      window.GameState.turnoCombate += 1;
      return { resultado: `Fraquezas identificadas: ${fraquezas.join(', ') || 'nenhuma'}.`, dados: { fraquezas } };
    }
    default:
      return { resultado: 'Ação inválida.', dados: { tipoAcao, alvo } };
  }
}

async function carregarCapitulo(numero = 1) {
  try {
    const resposta = await fetch(`story/chapter${numero}.json`);
    if (!resposta.ok) {
      throw new Error(`Falha HTTP ${resposta.status}`);
    }

    const dados = await resposta.json();
    window.GameState.capituloAtual = numero;
    window.GameState.cenas = {};
    for (const cena of dados.cenas || []) {
      window.GameState.cenas[cena.id] = cena;
    }

    const primeiraCena = window.GameState.cenas.criacao_01 ? 'criacao_01' : (dados.cenas && dados.cenas[0] && dados.cenas[0].id) || null;
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
  } catch (erro) {
    configuracaoPersonagem = {};
    registrarHistorico(`Aviso: character.json indisponível (${erro.message}).`);
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
  const nomeDigitado = elementos.inputNome.value.trim();

  if (!validarNome(nomeDigitado)) {
    elementos.erroNome.textContent = 'Digite um nome válido para continuar.';
    return;
  }

  elementos.erroNome.textContent = '';
  window.GameState.nomeJogador = nomeDigitado;
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
