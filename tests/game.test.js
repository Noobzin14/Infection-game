// ADIÇÃO
'use strict';

// ADIÇÃO
function test(nome, fn) {
  testes.push({ nome, fn });
}

// ADIÇÃO
function assert(condicao, mensagem) {
  if (!condicao) {
    throw new Error(mensagem);
  }
}

// ADIÇÃO
const testes = [];

// ADIÇÃO
function criarEstadoBase() {
  return {
    statusVida: 50,
    statusSanidade: 50,
    inventario: [],
    atributos: {
      forca: 5,
      resistencia: 5,
      agilidade: 5,
      percepcao: 5,
      mente: 5
    },
    tracos: []
  };
}

// ADIÇÃO
function limitarAtributo(valor) {
  return Math.max(1, Math.min(10, valor));
}

// ADIÇÃO
function adicionarItemInventario(estado, item) {
  if (estado.inventario.length >= 5) {
    return false;
  }
  estado.inventario.push(item);
  return 'OK';
}

// ADIÇÃO
function aplicarEfeitos(estado, efeito = {}) {
  if (efeito.atributos && typeof efeito.atributos === 'object') {
    Object.entries(efeito.atributos).forEach(([atributo, valor]) => {
      if (typeof valor === 'number' && Object.hasOwn(estado.atributos, atributo)) {
        estado.atributos[atributo] = limitarAtributo(valor);
      }
    });
  }

  if (efeito.modificadores && typeof efeito.modificadores === 'object') {
    Object.entries(efeito.modificadores).forEach(([atributo, valor]) => {
      if (typeof valor === 'number' && Object.hasOwn(estado.atributos, atributo)) {
        estado.atributos[atributo] = limitarAtributo(estado.atributos[atributo] + valor);
      }
    });
  }

  if (typeof efeito.traco === 'string' && efeito.traco.trim()) {
    if (!estado.tracos.includes(efeito.traco)) {
      estado.tracos.push(efeito.traco);
    }
  }

  if (typeof efeito.vida === 'number') {
    estado.statusVida = Math.max(0, Math.min(100, estado.statusVida + efeito.vida));
  }

  if (typeof efeito.sanidade === 'number') {
    estado.statusSanidade = Math.max(0, Math.min(100, estado.statusSanidade + efeito.sanidade));
  }

  if (efeito.inventario) {
    if (Array.isArray(efeito.inventario)) {
      for (const item of efeito.inventario) {
        if (!adicionarItemInventario(estado, item)) {
          return 'INVENTARIO_CHEIO';
        }
      }
    } else if (!adicionarItemInventario(estado, efeito.inventario)) {
      return 'INVENTARIO_CHEIO';
    }
  }

  return 'OK';
}

// ADIÇÃO
function t(locales, localeAtivo, chave, fallback = '', locale = localeAtivo, contexto = {}) {
  const dicionario = locales?.[locale] || {};
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

// 4.4.2 aplicarEfeitos
// ADIÇÃO
test('aplicarEfeitos: vida positivo/negativo e limites 0-100', () => {
  const estado = criarEstadoBase();
  let r = aplicarEfeitos(estado, { vida: 40 });
  assert(r === 'OK', 'retorno deve ser OK');
  assert(estado.statusVida === 90, 'vida deve subir para 90');

  r = aplicarEfeitos(estado, { vida: 30 });
  assert(estado.statusVida === 100, 'vida deve limitar em 100');

  r = aplicarEfeitos(estado, { vida: -250 });
  assert(estado.statusVida === 0, 'vida deve limitar em 0');

  return { pass: true, message: 'vida validada' };
});

// ADIÇÃO
test('aplicarEfeitos: sanidade positivo/negativo e limites 0-100', () => {
  const estado = criarEstadoBase();
  aplicarEfeitos(estado, { sanidade: 60 });
  assert(estado.statusSanidade === 100, 'sanidade deve limitar em 100');
  aplicarEfeitos(estado, { sanidade: -999 });
  assert(estado.statusSanidade === 0, 'sanidade deve limitar em 0');
  return { pass: true, message: 'sanidade validada' };
});

// ADIÇÃO
test('aplicarEfeitos: inventario item único, array e inventário cheio', () => {
  const estado = criarEstadoBase();
  let r = aplicarEfeitos(estado, { inventario: 'Faca' });
  assert(r === 'OK', 'item único deve ser adicionado');
  assert(estado.inventario.length === 1, 'inventário deve ter 1 item');

  r = aplicarEfeitos(estado, { inventario: ['Água', 'Pano', 'Isqueiro'] });
  assert(r === 'OK', 'array de itens deve ser adicionado');
  assert(estado.inventario.length === 4, 'inventário deve ter 4 itens');

  r = aplicarEfeitos(estado, { inventario: ['A', 'B'] });
  assert(r === 'INVENTARIO_CHEIO', 'deve bloquear quando ultrapassa limite');
  assert(estado.inventario.length === 5, 'inventário deve permanecer no limite 5');
  return { pass: true, message: 'inventário em aplicarEfeitos validado' };
});

// ADIÇÃO
test('aplicarEfeitos: atributos e modificadores respeitam faixa 1-10', () => {
  const estado = criarEstadoBase();
  aplicarEfeitos(estado, { atributos: { forca: 12, mente: 0 } });
  assert(estado.atributos.forca === 10, 'força deve limitar em 10');
  assert(estado.atributos.mente === 1, 'mente deve limitar em 1');

  aplicarEfeitos(estado, { modificadores: { forca: -50, mente: 50 } });
  assert(estado.atributos.forca === 1, 'força deve limitar inferior após modificador');
  assert(estado.atributos.mente === 10, 'mente deve limitar superior após modificador');
  return { pass: true, message: 'atributos validados' };
});

// ADIÇÃO
test('aplicarEfeitos: traço não duplica', () => {
  const estado = criarEstadoBase();
  aplicarEfeitos(estado, { traco: 'combativo' });
  aplicarEfeitos(estado, { traco: 'combativo' });
  assert(estado.tracos.length === 1, 'traço não pode duplicar');
  return { pass: true, message: 'traço sem duplicação validado' };
});

// 4.4.3 adicionarItemInventario
// ADIÇÃO
test('adicionarItemInventario: inventário vazio -> length 1', () => {
  const estado = criarEstadoBase();
  const r = adicionarItemInventario(estado, 'Item1');
  assert(r === 'OK', 'retorno deve ser OK');
  assert(estado.inventario.length === 1, 'length deve ser 1');
  return { pass: true, message: 'adição em inventário vazio validada' };
});

// ADIÇÃO
test('adicionarItemInventario: com 4 itens -> length 5', () => {
  const estado = criarEstadoBase();
  estado.inventario = ['a', 'b', 'c', 'd'];
  const r = adicionarItemInventario(estado, 'e');
  assert(r === 'OK', 'retorno deve ser OK');
  assert(estado.inventario.length === 5, 'length deve ser 5');
  return { pass: true, message: 'limite superior validado' };
});

// ADIÇÃO
test('adicionarItemInventario: com 5 itens -> bloqueia', () => {
  const estado = criarEstadoBase();
  estado.inventario = ['a', 'b', 'c', 'd', 'e'];
  const r = adicionarItemInventario(estado, 'f');
  assert(r === false, 'retorno deve ser false');
  assert(estado.inventario.length === 5, 'length deve continuar 5');
  return { pass: true, message: 'bloqueio com inventário cheio validado' };
});

// ADIÇÃO
test('adicionarItemInventario: item duplicado é permitido (comportamento atual)', () => {
  const estado = criarEstadoBase();
  adicionarItemInventario(estado, 'Água');
  const r = adicionarItemInventario(estado, 'Água');
  assert(r === 'OK', 'duplicado permitido deve retornar OK');
  assert(estado.inventario.length === 2, 'duplicado permitido aumenta length');
  return { pass: true, message: 'duplicidade permitida validada' };
});

// 4.4.4 t()
// ADIÇÃO
test('t: chave existente retorna tradução', () => {
  const locales = { 'pt-BR': { ui: { vida: 'Vida' } } };
  const r = t(locales, 'pt-BR', 'ui.vida', 'fallback');
  assert(r === 'Vida', 'deve retornar tradução');
  return { pass: true, message: 'tradução existente validada' };
});

// ADIÇÃO
test('t: chave ausente retorna fallback', () => {
  const locales = { 'pt-BR': { ui: {} } };
  const r = t(locales, 'pt-BR', 'ui.inexistente', 'Padrão');
  assert(r === 'Padrão', 'deve retornar fallback');
  return { pass: true, message: 'fallback por chave ausente validado' };
});

// ADIÇÃO
test('t: interpolação com contexto substitui {nome}', () => {
  const locales = { 'pt-BR': { ui: { boasVindas: 'Olá, {nome}!' } } };
  const r = t(locales, 'pt-BR', 'ui.boasVindas', 'Olá!', 'pt-BR', { nome: 'Ana' });
  assert(r === 'Olá, Ana!', 'interpolação deve substituir placeholder');
  return { pass: true, message: 'interpolação validada' };
});

// ADIÇÃO
test('t: locale não carregado retorna fallback', () => {
  const locales = { 'pt-BR': { ui: { vida: 'Vida' } } };
  const r = t(locales, 'pt-BR', 'ui.vida', 'Health', 'en-US');
  assert(r === 'Health', 'locale ausente deve retornar fallback');
  return { pass: true, message: 'fallback por locale ausente validado' };
});

// ADIÇÃO
(function executar() {
  let ok = 0;
  let falhas = 0;

  for (const caso of testes) {
    try {
      const resultado = caso.fn();
      const mensagem = resultado && resultado.message ? resultado.message : 'OK';
      console.log(`✅ ${caso.nome} — ${mensagem}`);
      ok += 1;
    } catch (erro) {
      console.error(`❌ ${caso.nome} — ${erro.message}`);
      falhas += 1;
    }
  }

  console.log(`\nResumo: ${ok} passou, ${falhas} falhou.`);
  if (falhas > 0) {
    process.exitCode = 1;
  }
})();
