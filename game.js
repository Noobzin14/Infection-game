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
  tracos: []
});

let configuracaoPersonagem = {};

let intervaloDigitacao = null;
let digitando = false;
let textoCompletoAtual = '';

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
  elementos.statusVida.textContent = `Vida: ${window.GameState.statusVida}`;
  elementos.statusSanidade.textContent = `Sanidade: ${window.GameState.statusSanidade}`;
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
    const textoEscolha = typeof escolha.texto === 'string' ? escolha.texto : escolha.text;

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
  let indice = 0;
  digitando = true;

  intervaloDigitacao = setInterval(() => {
    if (indice >= texto.length) {
      limparDigitacao();
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

  const textoCena = typeof cenaRenderizavel.texto === 'string' ? cenaRenderizavel.texto : cenaRenderizavel.text;
  const escolhasCena = Array.isArray(cenaRenderizavel.escolhas) ? cenaRenderizavel.escolhas : cenaRenderizavel.choices;

  mostrarTextoGradual(textoCena || '', () => {
    Logger.info('CENA', 'Cena renderizada com sucesso.', {
      idCena: id,
      personagem: nomeExibicao,
      totalEscolhas: (escolhasCena || []).length
    });

    renderEscolhas(cenaRenderizavel);
  });
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
  } catch (erro) {
    configuracaoPersonagem = {};
    registrarHistorico(`Aviso: character.json indisponível (${erro.message}).`);
  } finally {
    recalcularStatusMaximos();
    atualizarStatus();
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
  await carregarCapitulo(window.GameState.capituloAtual || 1);
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
