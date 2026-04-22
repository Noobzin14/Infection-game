let nomeJogador = '';
let cenas = {};
let cenaAtual = null;
let statusVida = 100;
let statusSanidade = 100;
let inventario = [];
const historicoSessao = [];
const velocidadeTexto = 30;

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
  elementos.statusVida.textContent = `Vida: ${statusVida}`;
  elementos.statusSanidade.textContent = `Sanidade: ${statusSanidade}`;
  elementos.statusInventario.textContent = `Inventário: ${inventario.length}/5`;
}

function registrarHistorico(mensagem) {
  const registro = `[${new Date().toLocaleTimeString('pt-BR')}] ${mensagem}`;
  historicoSessao.push(registro);

  const item = document.createElement('li');
  item.textContent = registro;
  elementos.listaHistorico.prepend(item);
}

function aplicarEfeitos(efeito = {}) {
  if (typeof efeito.vida === 'number') {
    statusVida = Math.max(0, Math.min(100, statusVida + efeito.vida));
  }

  if (typeof efeito.sanidade === 'number') {
    statusSanidade = Math.max(0, Math.min(100, statusSanidade + efeito.sanidade));
  }

  if (efeito.inventario) {
    if (Array.isArray(efeito.inventario)) {
      for (const item of efeito.inventario) {
        if (!adicionarItemInventario(item)) {
          return false;
        }
      }
    } else if (!adicionarItemInventario(efeito.inventario)) {
      return false;
    }
  }

  atualizarStatus();
  return true;
}

function adicionarItemInventario(item) {
  if (inventario.length >= 5) {
    elementos.textoDialogo.textContent = 'Inventário cheio. Libere espaço antes de avançar.';
    return false;
  }

  inventario.push(item);
  registrarHistorico(`Item obtido: ${item}`);
  return true;
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
  }, velocidadeTexto);
}

function criarBotaoRecomecar() {
  elementos.escolhasContainer.innerHTML = '';
  const botao = document.createElement('button');
  botao.className = 'botao-principal botao-escolha';
  botao.textContent = 'Recomeçar';
  botao.addEventListener('click', () => window.location.reload());
  elementos.escolhasContainer.appendChild(botao);
}

function renderCena(id) {
  const cena = cenas[id];
  cenaAtual = id;
  elementos.escolhasContainer.innerHTML = '';

  if (!cena) {
    elementos.nomePersonagem.textContent = nomeJogador || 'SISTEMA';
    elementos.areaBackground.style.backgroundImage = '';
    elementos.textoDialogo.textContent = 'FIM DO CAPÍTULO';
    criarBotaoRecomecar();
    registrarHistorico('Capítulo encerrado.');
    return;
  }

  const nomeExibicao = cena.personagem || nomeJogador;
  elementos.nomePersonagem.textContent = nomeExibicao;

  if (cena.background) {
    const normalizado = cena.background.startsWith('assets/') ? cena.background : `assets/${cena.background}`;
    elementos.areaBackground.style.backgroundImage = `url("${normalizado}")`;
  } else {
    elementos.areaBackground.style.backgroundImage = '';
  }

  const textoCena = typeof cena.texto === 'string' ? cena.texto : cena.text;

  mostrarTextoGradual(textoCena || '', () => {
    (cena.choices || []).forEach((escolha) => {
      const botao = document.createElement('button');
      botao.className = 'botao-principal botao-escolha';
      botao.textContent = escolha.text;

      botao.addEventListener('click', () => {
        const podeAvancar = aplicarEfeitos(escolha.efeito);
        if (!podeAvancar) {
          registrarHistorico(`Escolha bloqueada por inventário cheio: ${escolha.text}`);
          return;
        }

        registrarHistorico(`Escolha: ${escolha.text}`);
        elementos.telaJogo.style.opacity = '0';
        elementos.telaJogo.style.transition = 'opacity 0.3s ease';

        setTimeout(() => {
          elementos.telaJogo.style.opacity = '1';
          renderCena(escolha.next_scene);
        }, 300);
      });

      elementos.escolhasContainer.appendChild(botao);
    });

    if (!cena.choices || cena.choices.length === 0) {
      criarBotaoRecomecar();
    }
  });
}

async function carregarCapitulo() {
  try {
    const resposta = await fetch('story/chapter1.json');
    if (!resposta.ok) {
      throw new Error(`Falha HTTP ${resposta.status}`);
    }

    const dados = await resposta.json();
    cenas = {};
    for (const cena of dados.cenas || []) {
      cenas[cena.id] = cena;
    }

    const primeiraCena = (dados.cenas && dados.cenas[0] && dados.cenas[0].id) || null;
    if (!primeiraCena) {
      throw new Error('Nenhuma cena encontrada no capítulo.');
    }

    atualizarStatus();
    registrarHistorico(`Capítulo carregado: ${dados.title || 'Sem título'}`);
    alternarTela(elementos.telaJogo);
    renderCena(primeiraCena);
  } catch (erro) {
    elementos.erroNome.textContent = `Erro ao carregar capítulo: ${erro.message}`;
    elementos.erroNome.style.color = '#ff2e2e';
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
  nomeJogador = nomeDigitado;
  await carregarCapitulo();
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

    const cena = cenas[cenaAtual];
    if (cena && cena.choices) {
      elementos.escolhasContainer.innerHTML = '';
      cena.choices.forEach((escolha) => {
        const botao = document.createElement('button');
        botao.className = 'botao-principal botao-escolha';
        botao.textContent = escolha.text;
        botao.addEventListener('click', () => {
          const podeAvancar = aplicarEfeitos(escolha.efeito);
          if (!podeAvancar) {
            registrarHistorico(`Escolha bloqueada por inventário cheio: ${escolha.text}`);
            return;
          }

          registrarHistorico(`Escolha: ${escolha.text}`);
          elementos.telaJogo.style.opacity = '0';
          elementos.telaJogo.style.transition = 'opacity 0.3s ease';
          setTimeout(() => {
            elementos.telaJogo.style.opacity = '1';
            renderCena(escolha.next_scene);
          }, 300);
        });
        elementos.escolhasContainer.appendChild(botao);
      });
    }
  }
});

elementos.btnHistorico.addEventListener('click', () => {
  elementos.painelHistorico.classList.add('aberto');
  elementos.painelHistorico.setAttribute('aria-hidden', 'false');
});

elementos.btnFecharHistorico.addEventListener('click', () => {
  elementos.painelHistorico.classList.remove('aberto');
  elementos.painelHistorico.setAttribute('aria-hidden', 'true');
});

alternarTela(elementos.telaAbertura);
atualizarStatus();
