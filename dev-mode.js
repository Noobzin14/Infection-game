(() => {
  const SECRET = 'devmode';
  const BUFFER_SIZE = SECRET.length;
  let keyBuffer = '';
  let panel = null;
  let activeTab = 'cena';
  let styleTag = null;
  let devModePatched = false;
  let loggerOriginal = null;
  let originalFns = {};
  let devLogs = [];
  let logsPaused = false;
  let logsLevelFilter = 'ALL';
  let logsCategoryFilter = 'Todos';
  let logsSearchText = '';
  let lupaAtiva = false;
  let lupaTooltip = null;
  let lupaHighlight = null;
  let lupaFixado = null;
  let _lupaMouseMove = null;
  let _lupaClick = null;
  let lupaColorState = { h: 95, s: 42, l: 20, target: 'var', prop: 'background-color', varName: '--verde-militar' };
  let _lupaColorDrag = null;
  let _historicoNavDev = [];
  let devGraphVisible = false;
  let devKeyHandler = null;

  const invCache = { loadedItems: false, loadedTraits: false, items: [], createdItems: [], traits: [], createdTraits: [], itemSort: { key: 'id', dir: 'asc' }, traitSort: { key: 'id', dir: 'asc' }, itemFilter: 'Todos', itemSearch: '', itemEditorOpen: false, traitEditorOpen: false, itemCategoryEditor: 'armas/brancas', traitTypeEditor: 'positivo', itemEditorError: '', traitEditorError: '' };
  let sortKey = null;
  let sortAsc = true;

  window.DEV_MODE = false;
  const getVar = (name) => { try { return Function(`return ${name};`)(); } catch { return undefined; } };
  const setVar = (name, value) => { try { window.__devTempValue = value; Function(`${name} = window.__devTempValue;`)(); delete window.__devTempValue; return true; } catch { delete window.__devTempValue; return false; } };
  const callFn = (name, ...args) => { try { const fn = Function(`return ${name};`)(); if (typeof fn === 'function') return fn(...args); } catch {} return null; };
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const escapeHtml = (s) => String(s || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
  const showToast = (text) => { const t = document.createElement('div'); t.textContent = text; t.className = 'dev-toast'; document.body.appendChild(t); setTimeout(() => t.remove(), 1500); };
  const formatDados = (d) => { try { return JSON.stringify(d, null, 2); } catch { return String(d); } };

  const getAllItemsFlat = () => {
    const arr = [];
    const src = invCache.items || {};
    const pushCat = (list, macro, cat) => (list || []).forEach((it) => arr.push({ ...it, __macro: macro, __cat: cat }));
    Object.entries(src.armas || {}).forEach(([k, v]) => pushCat(v, 'Armas', k));
    Object.entries(src.armaduras || {}).forEach(([k, v]) => pushCat(v, 'Armaduras', k));
    Object.entries(src.consumiveis || {}).forEach(([k, v]) => pushCat(v, 'Consumíveis', k));
    pushCat(src.materiais || [], 'Materiais', 'materiais');
    return arr.concat(invCache.createdItems.map((x) => ({ ...x, __macro: x.__macro || 'Custom', __cat: x.__cat || 'custom' })));
  };

  const getAllTraitsFlat = () => (invCache.traits || []).concat(invCache.createdTraits || []);
  const renderCenaTab = () => {
    const cenas = getVar('window.GameState.cenas') || {}; const cenaAtual = getVar('window.GameState.cenaAtual'); const cena = cenas[cenaAtual] || {};
    const options = Object.keys(cenas).map((id) => `<option value="${id}">${id}</option>`).join('');
    const escolhas = (cena.escolhas || cena.choices || []).map((e, i) => `<div>${i + 1}. ${escapeHtml(e.texto || e.text)} → ${escapeHtml(e.proxima || e.next_scene || '-')} <button data-go="${escapeHtml(e.proxima || e.next_scene || '')}">IR</button></div>`).join('');
    return `<div><button id="dev-scene-back" ${_historicoNavDev.length ? '' : 'disabled'}>⬅️ VOLTAR (${_historicoNavDev.length})</button> <button id="dev-scene-back-clear">🔄 LIMPAR HISTÓRICO</button></div>
      <label>ID da cena:</label><div><input id="dev-scene-id"/><button id="dev-scene-go">IR</button></div>
      <select id="dev-scene-select"><option value="">Selecione...</option>${options}</select>
      <div id="dev-scene-info">Cena atual: ${cenaAtual || '-'} | Personagem: ${cena.personagem || '-'} | Escolhas: ${(cena.escolhas || cena.choices || []).length}</div>
      <textarea id="dev-scene-text" rows="5">${escapeHtml(cena.texto || cena.text || '')}</textarea><button id="dev-apply-text">APLICAR</button>
      <div>${escolhas || 'Sem escolhas.'}</div><hr>
      <div><button id="dev-toggle-graph">📊 Mostrar Grafo: ${devGraphVisible ? 'ON' : 'OFF'}</button></div>
      <div id="dev-scene-graph-wrap">${devGraphVisible ? renderSceneGraph() : ''}</div>`;
  };

  const renderSceneGraph = () => {
    const cenas = getVar('window.GameState.cenas') || {}; const ids = Object.keys(cenas); if (!ids.length) return 'Sem cenas carregadas.';
    const inDeg = {}; ids.forEach((id) => (inDeg[id] = 0)); const edges = []; const missing = new Set();
    ids.forEach((id) => ((cenas[id].escolhas || cenas[id].choices || []).forEach((e) => { const t = e.proxima || e.next_scene; if (!t) return; edges.push([id, t]); if (inDeg[t] !== undefined) inDeg[t]++; else missing.add(t); })));    
    const roots = ids.filter((id) => inDeg[id] === 0); const level = {}; const q = roots.length ? [...roots] : [ids[0]]; q.forEach((r) => (level[r] = 0));
    while (q.length) { const cur = q.shift(); edges.filter(([s]) => s === cur).forEach(([, t]) => { if (level[t] === undefined && cenas[t]) { level[t] = level[cur] + 1; q.push(t); } }); }
    ids.forEach((id) => { if (level[id] === undefined) level[id] = 0; });
    const buckets = {}; [...ids, ...missing].forEach((id) => { const lv = level[id] ?? 1; (buckets[lv] ||= []).push(id); });
    const pos = {}; let maxRows = 0; Object.entries(buckets).forEach(([lv, list]) => { maxRows = Math.max(maxRows, list.length); list.forEach((id, i) => { pos[id] = { x: Number(lv) * 160 + 20, y: i * 60 + 20 }; }); });
    const width = (Math.max(...Object.keys(buckets).map(Number)) + 2) * 180; const height = Math.max(260, maxRows * 70 + 60); const atual = getVar('window.GameState.cenaAtual');
    const nodes = Object.keys(pos).map((id) => { const ex = !!cenas[id]; const cur = atual === id; const p = pos[id]; const fill = ex ? '#1a1a1a' : '#4a0000'; const stroke = cur ? '#8b0000' : '#444';
      return `<g class="dev-node" data-node-id="${escapeHtml(id)}" style="cursor:${ex ? 'pointer' : 'not-allowed'}"><rect x="${p.x}" y="${p.y}" width="120" height="40" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="${cur ? 3 : 1.2}"/><text x="${p.x + 8}" y="${p.y + 24}" fill="#fff" font-size="12">${escapeHtml(ex ? id : '⚠️ ' + id)}</text></g>`; }).join('');
    const lines = edges.map(([s, t]) => { if (!pos[s] || !pos[t]) return ''; const a = pos[s], b = pos[t]; return `<line x1="${a.x + 120}" y1="${a.y + 20}" x2="${b.x}" y2="${b.y + 20}" stroke="#8b0000" stroke-width="1.5" marker-end="url(#arrow-red)"/>`; }).join('');
    return `<div class="dev-graph-scroll"><svg width="${width}" height="${height}"><defs><marker id="arrow-red" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto"><polygon points="0 0, 8 3.5, 0 7" fill="#8b0000"/></marker></defs>${lines}${nodes}</svg></div><div style="margin-top:6px">🟩 Cena existente | 🟥 Cena referenciada mas não escrita | 🔴 Cena atual</div>`;
  };

  const renderInventarioTab = () => {
    const inv = getVar('window.GameState.inventario') || []; const tr = getVar('window.GameState.tracos') || [];
    const items = getAllItemsFlat().filter((x) => (invCache.itemFilter === 'Todos' || x.__macro === invCache.itemFilter) && (!invCache.itemSearch || (x.nome || '').toLowerCase().includes(invCache.itemSearch.toLowerCase())));
    items.sort((a, b) => { const k = sortKey || invCache.itemSort.key; const aa = String(a[k] ?? ''), bb = String(b[k] ?? ''); return (sortKey ? sortAsc : invCache.itemSort.dir === 'asc') ? aa.localeCompare(bb) : bb.localeCompare(aa); });
    const rows = items.map((it, idx) => { const inInv = inv.includes(it.id) || inv.includes(it.nome); return `<tr class="${idx % 2 ? 'odd' : 'even'} ${inInv ? 'in-inv' : ''}"><td><button data-add-item-grid="${escapeHtml(it.id)}">➕</button></td><td>${escapeHtml(it.id)}</td><td>${escapeHtml(it.nome)}</td><td>${escapeHtml(it.__macro)}</td><td>${escapeHtml(it.dano ? `${it.dano.min}-${it.dano.max}` : (it.defesa ?? '-'))}</td><td>${escapeHtml(it.peso ?? '-')}</td><td>${escapeHtml(it.raridade ?? '-')}</td></tr>`; }).join('');
    const traits = getAllTraitsFlat().sort((a,b)=> String(a.id).localeCompare(String(b.id)));
    const trows = traits.map((t, idx) => `<tr class="${idx % 2 ? 'odd' : 'even'} ${(tr || []).includes(t.id) ? 'in-inv' : ''}"><td><button data-add-trait-grid="${escapeHtml(t.id)}">➕</button></td><td>${escapeHtml(t.id)}</td><td>${escapeHtml(t.nome)}</td><td style="color:${t.tipo==='Positivo'?'#66bb6a':'#e57373'}">${t.tipo}</td><td>${escapeHtml(formatDados(t.efeito))}</td><td>${escapeHtml(t.como_revelar || '-')}</td></tr>`).join('');
    return `<div id="dev-inv-count">${inv.length}/5 itens</div><div>${inv.map((it,i)=>`<div>${escapeHtml(it)} <button data-rm-item="${i}">❌</button></div>`).join('') || 'Vazio'}</div><button id="dev-clear-items">LIMPAR TUDO</button><hr>
    <h4>ITENS DISPONÍVEIS</h4><div><select id="dev-item-filter"><option>Todos</option><option>Armas</option><option>Armaduras</option><option>Consumíveis</option><option>Materiais</option></select> <input id="dev-item-search" placeholder="Buscar por nome" value="${escapeHtml(invCache.itemSearch)}"></div>
    <div class="dev-grid"><table><thead><tr><th>Adicionar</th><th data-sort="id">ID</th><th data-sort="nome">Nome</th><th>Categoria</th><th>Dano/Defesa</th><th data-sort="peso">Peso</th><th data-sort="raridade">Raridade</th></tr></thead><tbody>${rows}</tbody></table></div>
    <button id="dev-item-create-toggle">➕ CRIAR ITEM</button> <button id="dev-export-items">⬇️ EXPORTAR ITENS</button>
    ${invCache.itemEditorOpen ? `<div><select id="dev-item-cat-editor">${['armas/brancas','armas/impacto','armas/fogo','armas/arremesso','armas/armadilhas','armaduras/cabeca','armaduras/tronco','armaduras/bracos','armaduras/pernas','consumiveis/cura','consumiveis/sanidade','consumiveis/buffs','materiais'].map((x)=>`<option ${invCache.itemCategoryEditor===x?'selected':''}>${x}</option>`).join('')}</select><textarea id="dev-item-json" rows="10">${escapeHtml(getItemTemplate(invCache.itemCategoryEditor))}</textarea><button id="dev-item-validate">✅ VALIDAR E ADICIONAR À LISTA</button><div class="dev-error">${escapeHtml(invCache.itemEditorError)}</div></div>` : ''}
    <hr><h4>TRAÇOS DISPONÍVEIS</h4><div class="dev-grid"><table><thead><tr><th>Adicionar</th><th>ID</th><th>Nome</th><th>Tipo</th><th>Efeito</th><th>Como revelar</th></tr></thead><tbody>${trows}</tbody></table></div>
    <button id="dev-trait-create-toggle">➕ CRIAR TRAÇO</button> <button id="dev-export-traits">⬇️ EXPORTAR TRAÇOS</button>
    ${invCache.traitEditorOpen ? `<div><select id="dev-trait-type-editor"><option value="positivo">Positivo</option><option value="negativo">Negativo</option></select><textarea id="dev-trait-json" rows="8">${escapeHtml(getTraitTemplate())}</textarea><button id="dev-trait-validate">✅ VALIDAR E ADICIONAR À LISTA</button><div class="dev-error">${escapeHtml(invCache.traitEditorError)}</div></div>` : ''}`;
  };

  const getItemTemplate = (cat) => cat.startsWith('armas/') ? JSON.stringify({ id: '', nome: '', descricao: '', dano: { min: 0, max: 0 }, durabilidade: 0, peso: 0, raridade: 'comum' }, null, 2) : cat.startsWith('armaduras/') ? JSON.stringify({ id: '', nome: '', descricao: '', defesa: 0, durabilidade: 0, peso: 0, raridade: 'comum' }, null, 2) : cat.startsWith('consumiveis/') ? JSON.stringify({ id: '', nome: '', descricao: '', efeito: { vida: 0 }, peso: 0, raridade: 'comum' }, null, 2) : JSON.stringify({ id: '', nome: '', descricao: '', peso: 0, raridade: 'comum' }, null, 2);
  const getTraitTemplate = () => JSON.stringify({ id: '', nome: '', descricao: '', como_revelar: '', efeito: {} }, null, 2);

  const renderLogsTab = () => `<div class="dev-logs-toolbar"><div id="dev-logs-levels">${['ALL','DEBUG','INFO','WARN','ERROR','FATAL'].map((l)=>`<button class="dev-log-level" data-level="${l}">${l}</button>`).join('')}</div><select id="dev-logs-cat">${['Todos','JS','JOGO','PIPELINE','CENA','INVENTARIO','JSON','REDE'].map((c)=>`<option>${c}</option>`).join('')}</select><button id="dev-logs-clear">🗑️ LIMPAR</button><button id="dev-logs-export">⬇️ EXPORTAR</button><button id="dev-logs-pause">⏸️ PAUSAR</button></div><div><input id="dev-logs-search" placeholder="🔍 Buscar nos logs..." value="${escapeHtml(logsSearchText)}"><button id="dev-logs-search-clear">✕</button></div><div class="dev-logs-list" id="dev-logs-list"></div>`;
  const renderStatusTab = () => {
    const gs = window.GameState ||= {};
    const attrs = gs.atributos ||= { forca: 5, agilidade: 5, resistencia: 5, percepcao: 5, mente: 5 };
    const mk = (id, label, v, min, max) => `<div><label>${label}: <strong id="${id}-v">${v}</strong></label><input type="range" id="${id}" min="${min}" max="${max}" value="${v}"><input type="number" id="${id}-n" min="${min}" max="${max}" value="${v}"></div>`;
    return `<h4>STATUS DO JOGADOR</h4>
      ${mk('dev-vida', 'Vida', gs.statusVida ?? 100, 0, 100)}
      ${mk('dev-sanidade', 'Sanidade', gs.statusSanidade ?? 100, 0, 100)}
      <h4>ATRIBUTOS (1-10)</h4>
      ${mk('dev-atr-forca', 'Força', attrs.forca ?? 5, 1, 10)}
      ${mk('dev-atr-agilidade', 'Agilidade', attrs.agilidade ?? 5, 1, 10)}
      ${mk('dev-atr-resistencia', 'Resistência', attrs.resistencia ?? 5, 1, 10)}
      ${mk('dev-atr-percepcao', 'Percepção', attrs.percepcao ?? 5, 1, 10)}
      ${mk('dev-atr-mente', 'Mente', attrs.mente ?? 5, 1, 10)}
      <div style="margin-top:8px"><button id="dev-status-recalc">RECALCULAR</button> <button id="dev-status-reset">RESETAR TUDO</button></div>`;
  };

  const hexToRgb = (hex) => {
    const clean = String(hex || '').trim().replace('#', '');
    if (!/^[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(clean)) return null;
    const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
    const num = parseInt(full, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  };
  const rgbToHex = (r, g, b) => '#' + [r,g,b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  const rgbToHsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0; const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  };
  const hslToRgb = (h, s, l) => {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s; const x = c * (1 - Math.abs((h / 60) % 2 - 1)); const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) [r,g,b]=[c,x,0]; else if (h < 120) [r,g,b]=[x,c,0]; else if (h < 180) [r,g,b]=[0,c,x]; else if (h < 240) [r,g,b]=[0,x,c]; else if (h < 300) [r,g,b]=[x,0,c]; else [r,g,b]=[c,0,x];
    return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
  };
  const renderGlobalVarsControls = () => `<h4>🎨 VARIÁVEIS GLOBAIS</h4>
    ${['verde','vermelho','preto'].map((n,idx)=>`<div><label>${['--verde-militar','--vermelho-sangue','--preto-detalhe'][idx]} <input type="color" id="dev-color-${n}"></label> <button data-open-picker="${['--verde-militar','--vermelho-sangue','--preto-detalhe'][idx]}">🎨 Abrir no Picker</button></div>`).join('')}
    <div><label>Velocidade de texto: <strong id="dev-text-speed-v">40</strong>ms</label><input type="range" id="dev-text-speed" min="5" max="150" value="40"></div>
    <div><label><input type="checkbox" id="dev-toggle-scene-ids"> Exibir IDs de cena</label></div>
    <div><label><input type="checkbox" id="dev-toggle-contrast"> Alto contraste</label></div>
    <div style="margin-top:8px"><button id="dev-design-reset">RESETAR DESIGN</button></div>`;

  const renderLupaTab = () => {
    const fx = lupaFixado;
    const attrs = fx ? Array.from(fx.attributes || []).map((a, i) => `<div class="dev-lupa-attr-row"><code>${escapeHtml(a.name)}</code> <input data-attr-name="${escapeHtml(a.name)}" value="${escapeHtml(a.value)}"> <button data-attr-rm="${escapeHtml(a.name)}">✕</button></div>`).join('') : '<em>Clique num elemento com a lupa ativa para editar</em>';
    const styles = fx ? Array.from(fx.style || []).map((p) => `<div class="dev-lupa-attr-row"><code>${escapeHtml(p)}</code> <input data-style-name="${escapeHtml(p)}" value="${escapeHtml(fx.style.getPropertyValue(p))}"> <button data-style-rm="${escapeHtml(p)}">✕</button></div>`).join('') : '<em>Clique num elemento com a lupa ativa para editar</em>';;
    const rgb = hslToRgb(lupaColorState.h, lupaColorState.s, lupaColorState.l);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    return `<div class="dev-lupa-section"><button id="dev-lupa-toggle">${lupaAtiva ? '🔍 Desativar Lupa' : '🔍 Ativar Lupa'}</button> <strong>LUPA ${lupaAtiva ? '🟢' : '⚫'}</strong></div>
    <div class="dev-lupa-section"><h4>SUB-SEÇÃO 1: ELEMENTO FIXADO</h4><div id="dev-lupa-fixado">${fx ? `<strong>📌 FIXADO: ${fx.tagName.toLowerCase()}${fx.id ? '#' + fx.id : ''}</strong><br><small>${escapeHtml(fx.className || '(sem classes)')}</small><br><textarea readonly style="width:100%;height:80px;background:#111;color:#fff;font-size:10px;border:1px solid #333">${escapeHtml(fx.outerHTML.substring(0,500))}</textarea><br><button id="dev-lupa-copy">COPIAR HTML</button><button id="dev-lupa-destacar">DESTACAR</button><button id="dev-lupa-soltar">SOLTAR</button>` : '<em>Nenhum elemento fixado.</em>'}</div></div>
    <div class="dev-lupa-section"><h4>✏️ EDITAR CONTEÚDO</h4><div><label>Texto visível:</label><textarea id="dev-fix-text" ${fx?'':'disabled placeholder="Clique num elemento com a lupa ativa para editar"'}>${escapeHtml(fx?.innerText||'')}</textarea><button id="dev-fix-apply-text" ${fx?'':'disabled'}>APLICAR TEXTO</button></div>
    <div><label>Atributos HTML:</label>${attrs}<div class="dev-lupa-attr-row"><input id="dev-attr-new-name" placeholder="nome" ${fx?'':'disabled'}><input id="dev-attr-new-val" placeholder="valor" ${fx?'':'disabled'}><button id="dev-attr-add" ${fx?'':'disabled'}>+ ADICIONAR ATRIBUTO</button></div></div>
    <div><label>CSS inline (style):</label>${styles}<div class="dev-lupa-attr-row"><input id="dev-style-new-name" placeholder="propriedade CSS" ${fx?'':'disabled'}><input id="dev-style-new-val" placeholder="valor" ${fx?'':'disabled'}><button id="dev-style-add" ${fx?'':'disabled'}>APLICAR</button> <button id="dev-style-clear" ${fx?'':'disabled'}>LIMPAR STYLE</button></div></div><small>Alterações temporárias — recarregar perde as mudanças</small></div>
    <div class="dev-lupa-section"><h4 id="dev-color-picker">🎨 COLOR PICKER</h4><canvas id="dev-color-canvas" class="dev-color-canvas" width="220" height="220" style="border:1px solid #333"></canvas><div id="dev-color-preview" style="margin-top:6px">Preview <span style="display:inline-block;width:40px;height:16px;background:${hex}"></span> <code>${hex}</code> <button id="dev-color-copy">📋 COPIAR</button></div>
    <div class="dev-color-field"><label>R</label><input type="range" id="dev-r" min="0" max="255" value="${rgb.r}"> <input id="dev-r-n" value="${rgb.r}"></div><div class="dev-color-field"><label>G</label><input type="range" id="dev-g" min="0" max="255" value="${rgb.g}"> <input id="dev-g-n" value="${rgb.g}"></div><div class="dev-color-field"><label>B</label><input type="range" id="dev-b" min="0" max="255" value="${rgb.b}"> <input id="dev-b-n" value="${rgb.b}"></div>
    <div class="dev-color-field"><label>H</label><input id="dev-h-n" value="${lupaColorState.h}"><span>°</span> <label>S</label><input id="dev-s-n" value="${lupaColorState.s}"><span>%</span> <label>L</label><input id="dev-l-n" value="${lupaColorState.l}"><span>%</span></div>
    <div><label><input type="radio" name="dev-color-target" value="element" ${lupaColorState.target==='element'?'checked':''}> Elemento fixado</label> Propriedade: <select id="dev-color-prop"><option>color</option><option>background-color</option><option>border-color</option><option>outline-color</option></select></div>
    <div><label><input type="radio" name="dev-color-target" value="var" ${lupaColorState.target==='var'?'checked':''}> Variável CSS global</label> Variável: <select id="dev-color-var">${['--verde-militar','--vermelho-sangue','--preto-detalhe','--vermelho-hover','--preto-transparente'].map((v)=>`<option ${v===lupaColorState.varName?'selected':''}>${v}</option>`).join('')}</select></div><button id="dev-color-apply">✅ APLICAR COR</button></div>
    <div class="dev-lupa-section"><div id="dev-lupa-globals">${renderGlobalVarsControls()}</div></div>`;
  };

  const renderRepoTab = () => {
    const gs = window.GameState || {};
    const cenas = Object.keys(gs.cenas || {}).length;
    const version = getVar('window.VERSION') || 'desconhecida';
    return `<h4>REPOSITÓRIO</h4><div><a href="https://github.com/Noobzin14/Infection-game" target="_blank" rel="noreferrer">github.com/Noobzin14/Infection-game</a></div>
      <h4>ESTADO EM TEMPO REAL</h4>
      <div>Total de cenas: ${cenas}</div><div>Cena atual: ${escapeHtml(gs.cenaAtual || '-')}</div><div>Itens: ${(gs.inventario || []).length}</div><div>Traços: ${(gs.tracos || []).length}</div><div>DEV_MODE: ${window.DEV_MODE}</div><div>Versão: ${escapeHtml(version)}</div>
      <div style="margin-top:8px"><button id="dev-export-state">EXPORTAR ESTADO</button> <button id="dev-import-state">IMPORTAR ESTADO</button><input id="dev-import-state-file" type="file" accept=".json,application/json" style="display:none"></div>`;
  };

  const updateLogsCounterLabel = (filtered = null) => { const tab = panel?.querySelector('[data-tab="logs"]'); if (tab) tab.textContent = `LOGS (${filtered ?? devLogs.length}/${devLogs.length})`; };
  const updateLogsTabUI = () => {
    if (!panel || activeTab !== 'logs' || logsPaused) return;
    const body = panel.querySelector('#dev-logs-list'); if (!body) return;
    const filtered = devLogs.filter((l) => (logsLevelFilter === 'ALL' || l.nivel === logsLevelFilter) && (logsCategoryFilter === 'Todos' || l.categoria === logsCategoryFilter) && (!logsSearchText || `${l.nivel} ${l.categoria} ${l.mensagem} ${JSON.stringify(l.dados || '')}`.toLowerCase().includes(logsSearchText.toLowerCase())));
    updateLogsCounterLabel(filtered.length);
    body.innerHTML = filtered.map((l) => `<div class="dev-log-item">[${l.timestamp}] [${l.nivel}] [${l.categoria}] ${escapeHtml(l.mensagem)}<pre style="display:none">${escapeHtml(l.dados ? formatDados(l.dados) : '')}</pre></div>`).join('');
    body.querySelectorAll('.dev-log-item').forEach((el) => el.onclick = () => { const pre = el.querySelector('pre'); pre.style.display = pre.style.display === 'none' ? 'block' : 'none'; });
  };

  const addLogToPanel = (entry) => { if (logsPaused) return; devLogs.unshift({ ...entry, id: Date.now() + Math.random() }); devLogs = devLogs.slice(0, 500); if (activeTab === 'logs') updateLogsTabUI(); else updateLogsCounterLabel(); };
  const addEventToPanel = (msg) => addLogToPanel({ timestamp: new Date().toISOString(), nivel: 'EVENTO', categoria: 'JOGO', mensagem: msg, dados: null });

  const applyDevPatches = () => {
    if (devModePatched) return; devModePatched = true; loggerOriginal = window.Logger;
    if (loggerOriginal) window.Logger = new Proxy(loggerOriginal, { get(target, prop) { if (['debug','info','warn','error','fatal'].includes(prop)) return (c,m,d) => { target[prop](c,m,d); addLogToPanel({ timestamp: new Date().toISOString(), nivel: String(prop).toUpperCase(), categoria: c, mensagem: m, dados: d }); }; return target[prop]; } });
    originalFns.renderCena = window.renderCena;
    if (typeof originalFns.renderCena === 'function') window.renderCena = function(id){ const prev = getVar('window.GameState.cenaAtual'); if (window.DEV_MODE && prev && prev !== id) { _historicoNavDev.push(prev); if (_historicoNavDev.length > 20) _historicoNavDev.shift(); } addEventToPanel(`renderCena("${id}")`); return originalFns.renderCena.apply(this, arguments); };
  };
  const revertDevPatches = () => { if (!devModePatched) return; devModePatched = false; if (loggerOriginal) window.Logger = loggerOriginal; if (originalFns.renderCena) window.renderCena = originalFns.renderCena; removeDevShortcuts(); };

  const setupDevShortcuts = () => {
    if (devKeyHandler) return;
    devKeyHandler = (e) => {
      if (!window.DEV_MODE || !e.ctrlKey || !e.shiftKey) return;
      const k = String(e.key).toLowerCase();
      const tabMap = { '1': 'cena', '2': 'status', '3': 'inventario', '4': 'repo', '5': 'logs', '6': 'lupa' };
      if (tabMap[k]) { e.preventDefault(); renderTab(tabMap[k]); showToast(`⌨️ Ctrl+Shift+${e.key} → Aba ${tabMap[k].toUpperCase()}`); return; }
      if (k === 'l') { e.preventDefault(); devLogs = []; updateLogsTabUI(); showToast('⌨️ Ctrl+Shift+L → Logs limpos'); }
      if (k === 'e') { e.preventDefault(); exportState(); showToast('⌨️ Ctrl+Shift+E → Estado exportado'); }
      if (k === 'z') { e.preventDefault(); goBackScene(); }
      if (k === 'g') { e.preventDefault(); devGraphVisible = !devGraphVisible; if (activeTab === 'cena') renderTab('cena'); showToast(`⌨️ Ctrl+Shift+G → Grafo ${devGraphVisible ? 'ativado' : 'desativado'}`); }
      if (k === 'i') { e.preventDefault(); lupaAtiva ? stopLupa() : startLupa(); if (activeTab === 'lupa') renderTab('lupa'); showToast(`⌨️ Ctrl+Shift+I → Lupa ${lupaAtiva ? 'ativada' : 'desativada'}`); }
      if (k === 'h') { e.preventDefault(); if (panel && document.body.contains(panel)) panel.style.display = panel.style.display === 'none' ? '' : 'none'; showToast('⌨️ Ctrl+Shift+H → Painel ocultado/mostrado'); }
    };
    document.addEventListener('keydown', devKeyHandler);
  };
  const removeDevShortcuts = () => { if (devKeyHandler) document.removeEventListener('keydown', devKeyHandler); devKeyHandler = null; };

  const goBackScene = () => {
    if (!_historicoNavDev.length) return;
    const prev = _historicoNavDev.pop();
    callFn('renderCena', prev);
    showToast(`⌨️ Ctrl+Shift+Z → Voltou para ${prev}`);
    if (activeTab === 'cena') renderTab('cena');
  };

  const fetchCaches = async () => {
    if (!invCache.loadedItems) { invCache.items = await fetch('data/items.json').then((r) => r.json()); invCache.loadedItems = true; }
    if (!invCache.loadedTraits) { const ch = await fetch('data/character.json').then((r) => r.json()); invCache.traits = [...Object.entries(ch.tracos?.positivos || {}).map(([id, v]) => ({ id, ...v, tipo: 'Positivo' })), ...Object.entries(ch.tracos?.negativos || {}).map(([id, v]) => ({ id, ...v, tipo: 'Negativo' }))]; invCache.loadedTraits = true; }
  };

  const renderTab = async (tab) => {
    activeTab = tab; if (!panel || !document.body.contains(panel)) return;
    panel.querySelectorAll('.dev-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    const c = panel.querySelector('.dev-content');
    if (tab === 'inventario') { await fetchCaches(); c.innerHTML = renderInventarioTab(); }
    else if (tab === 'cena') c.innerHTML = renderCenaTab();
    else if (tab === 'status') c.innerHTML = renderStatusTab();
    else if (tab === 'repo') c.innerHTML = renderRepoTab();
    else if (tab === 'logs') c.innerHTML = renderLogsTab();
    else if (tab === 'lupa') c.innerHTML = renderLupaTab();
    else c.innerHTML = '<div>Conteúdo mantido.</div>';
    bindTabEvents(); if (tab === 'logs') updateLogsTabUI();
  };

  function bindTabEvents() {
    const q = (s) => panel.querySelector(s); const qa = (s) => panel.querySelectorAll(s);
    q('#dev-scene-select')?.addEventListener('change', (e) => q('#dev-scene-id').value = e.target.value);
    q('#dev-scene-go')?.addEventListener('click', () => callFn('renderCena', q('#dev-scene-id').value.trim()));
    q('#dev-scene-back')?.addEventListener('click', goBackScene);
    q('#dev-scene-back-clear')?.addEventListener('click', () => { _historicoNavDev = []; renderTab('cena'); });
    q('#dev-toggle-graph')?.addEventListener('click', () => { devGraphVisible = !devGraphVisible; renderTab('cena'); });
    const btnAplicar = q('#dev-apply-text'); const textareaCena = q('#dev-scene-text');
    if (btnAplicar && textareaCena) btnAplicar.addEventListener('click', () => { const cenaAtual = getVar('window.GameState.cenaAtual'); const cenas = getVar('window.GameState.cenas'); if (!cenaAtual || !cenas || !cenas[cenaAtual]) return; cenas[cenaAtual].texto = textareaCena.value; if (typeof renderCena === 'function') renderCena(cenaAtual); });
    qa('[data-go]').forEach((b) => b.addEventListener('click', () => { const target = (b.dataset.go || '').trim(); if (!target) return showToast('Escolha sem próxima cena.'); callFn('renderCena', target); renderTab('cena'); }));
    qa('.dev-node').forEach((n) => n.onclick = () => { const id = n.dataset.nodeId; if ((getVar('window.GameState.cenas') || {})[id]) callFn('renderCena', id); });
    const bindPair = (id, min, max, cb) => {
      const r = q(`#${id}`); const n = q(`#${id}-n`); const v = q(`#${id}-v`); if (!r || !n || !v) return;
      const sync = (val) => { const nv = clamp(Number(val) || 0, min, max); r.value = nv; n.value = nv; v.textContent = nv; cb?.(nv); };
      r.addEventListener('input', () => sync(r.value)); n.addEventListener('input', () => sync(n.value));
    };
    bindPair('dev-vida', 0, 100, (v) => window.GameState.statusVida = v);
    bindPair('dev-sanidade', 0, 100, (v) => window.GameState.statusSanidade = v);
    bindPair('dev-atr-forca', 1, 10, (v) => (window.GameState.atributos ||= {}).forca = v);
    bindPair('dev-atr-agilidade', 1, 10, (v) => (window.GameState.atributos ||= {}).agilidade = v);
    bindPair('dev-atr-resistencia', 1, 10, (v) => (window.GameState.atributos ||= {}).resistencia = v);
    bindPair('dev-atr-percepcao', 1, 10, (v) => (window.GameState.atributos ||= {}).percepcao = v);
    bindPair('dev-atr-mente', 1, 10, (v) => (window.GameState.atributos ||= {}).mente = v);
    q('#dev-status-recalc')?.addEventListener('click', () => { callFn('atualizarStatus'); showToast('Status recalculado.'); });
    q('#dev-status-reset')?.addEventListener('click', () => { window.GameState.statusVida = 100; window.GameState.statusSanidade = 100; window.GameState.atributos = { forca: 5, agilidade: 5, resistencia: 5, percepcao: 5, mente: 5 }; renderTab('status'); callFn('atualizarStatus'); });
    const root = document.documentElement;
    const getCssVar = (name, fallback) => (getComputedStyle(root).getPropertyValue(name).trim() || fallback);
    const setupColor = (id, varName, fallback) => { const el = q(`#${id}`); if (!el) return; el.value = getCssVar(varName, fallback); el.addEventListener('input', () => root.style.setProperty(varName, el.value)); };
    setupColor('dev-color-verde', '--verde-militar', '#355e3b');
    setupColor('dev-color-vermelho', '--vermelho-sangue', '#8b0000');
    setupColor('dev-color-preto', '--preto-detalhe', '#111111');
    q('#dev-text-speed')?.addEventListener('input', (e) => { const val = Number(e.target.value); q('#dev-text-speed-v').textContent = val; window.GameState.textSpeed = val; });
    q('#dev-toggle-scene-ids')?.addEventListener('change', (e) => { window.GameState.showSceneIds = !!e.target.checked; document.body.classList.toggle('dev-show-scene-ids', !!e.target.checked); });
    q('#dev-toggle-contrast')?.addEventListener('change', (e) => document.body.classList.toggle('dev-high-contrast', !!e.target.checked));
    q('#dev-design-reset')?.addEventListener('click', () => { root.style.removeProperty('--verde-militar'); root.style.removeProperty('--vermelho-sangue'); root.style.removeProperty('--preto-detalhe'); window.GameState.textSpeed = 40; document.body.classList.remove('dev-show-scene-ids', 'dev-high-contrast'); renderTab('design'); });
    q('#dev-export-state')?.addEventListener('click', exportState);
    q('#dev-import-state')?.addEventListener('click', () => q('#dev-import-state-file')?.click());
    q('#dev-import-state-file')?.addEventListener('change', async (e) => { const file = e.target.files?.[0]; if (!file) return; try { const data = JSON.parse(await file.text()); window.GameState = { ...(window.GameState || {}), ...data }; callFn('atualizarStatus'); showToast('Estado importado.'); renderTab('repo'); } catch { showToast('JSON inválido.'); } });

    q('#dev-logs-cat')?.addEventListener('change', (e) => { logsCategoryFilter = e.target.value; updateLogsTabUI(); });
    q('#dev-logs-search')?.addEventListener('input', (e) => { logsSearchText = e.target.value; updateLogsTabUI(); });
    q('#dev-logs-search-clear')?.addEventListener('click', () => { logsSearchText = ''; q('#dev-logs-search').value = ''; updateLogsTabUI(); });
    q('#dev-logs-clear')?.addEventListener('click', () => { devLogs = []; updateLogsTabUI(); });
    qa('.dev-log-level').forEach((b) => { b.onclick = () => { logsLevelFilter = b.dataset.level; updateLogsTabUI(); }; });
    const btnPausar = q('#dev-logs-pause');
    if (btnPausar) btnPausar.addEventListener('click', () => { logsPaused = !logsPaused; btnPausar.textContent = logsPaused ? '▶️ RETOMAR' : '⏸️ PAUSAR'; btnPausar.style.opacity = logsPaused ? '0.5' : '1'; });
    const btnExportar = q('#dev-logs-export');
    if (btnExportar) btnExportar.addEventListener('click', () => { if (typeof Logger !== 'undefined' && Logger.exportar) Logger.exportar(); });

    q('#dev-item-filter')?.addEventListener('change', (e) => { invCache.itemFilter = e.target.value; renderTab('inventario'); });
    q('#dev-item-search')?.addEventListener('input', (e) => { invCache.itemSearch = e.target.value; renderTab('inventario'); });
    q('#dev-item-create-toggle')?.addEventListener('click', () => { invCache.itemEditorOpen = !invCache.itemEditorOpen; invCache.itemEditorError = ''; renderTab('inventario'); });
    q('#dev-export-items')?.addEventListener('click', () => downloadJson(getAllItemsFlat(), 'items-export.json'));
    qa('[data-add-item-grid]').forEach((b) => b.onclick = () => { const id = b.dataset.addItemGrid; const inv = getVar('window.GameState.inventario') || []; if (inv.length < 5) { inv.push(id); callFn('atualizarStatus'); renderTab('inventario'); } });
    qa('[data-rm-item]').forEach((btn) => btn.addEventListener('click', () => { const idx = parseInt(btn.dataset.rmItem); if (window.GameState?.inventario) { window.GameState.inventario.splice(idx, 1); if (typeof atualizarStatus === 'function') atualizarStatus(); renderTab('inventario'); } }));
    const btnLimpar = q('#dev-clear-items');
    if (btnLimpar) btnLimpar.addEventListener('click', () => { if (window.GameState?.inventario) { window.GameState.inventario.length = 0; if (typeof atualizarStatus === 'function') atualizarStatus(); renderTab('inventario'); } });
    qa('[data-rm-traco]').forEach((btn) => btn.addEventListener('click', () => { const id = btn.dataset.rmTraco; if (window.GameState?.tracos) { const idx = window.GameState.tracos.indexOf(id); if (idx > -1) window.GameState.tracos.splice(idx, 1); renderTab('inventario'); } }));
    qa('[data-sort]').forEach((th) => { th.style.cursor = 'pointer'; th.addEventListener('click', () => { const key = th.dataset.sort; if (sortKey === key) sortAsc = !sortAsc; else { sortKey = key; sortAsc = true; } renderTab('inventario'); }); });
    q('#dev-item-validate')?.addEventListener('click', () => { const text = q('#dev-item-json').value; const cat = q('#dev-item-cat-editor').value; const valid = validateItem(text, cat); if (valid.ok) { invCache.createdItems.push(valid.item); invCache.itemEditorError = ''; showToast('✅ Item criado'); renderTab('inventario'); } else { invCache.itemEditorError = `❌ ${valid.error}`; q('#dev-item-json').style.border = '1px solid #8b0000'; } });

    q('#dev-trait-create-toggle')?.addEventListener('click', () => { invCache.traitEditorOpen = !invCache.traitEditorOpen; invCache.traitEditorError = ''; renderTab('inventario'); });
    q('#dev-export-traits')?.addEventListener('click', () => downloadJson(getAllTraitsFlat(), 'tracos-export.json'));
    qa('[data-add-trait-grid]').forEach((b) => b.onclick = () => { const id = b.dataset.addTraitGrid; const t = getVar('window.GameState.tracos') || []; if (!t.includes(id)) t.push(id); renderTab('inventario'); });
    q('#dev-trait-validate')?.addEventListener('click', () => { const valid = validateTrait(q('#dev-trait-json').value, q('#dev-trait-type-editor').value); if (valid.ok) { invCache.createdTraits.push(valid.trait); invCache.traitEditorError = ''; showToast('✅ Traço criado'); renderTab('inventario'); } else { invCache.traitEditorError = `❌ ${valid.error}`; } });
    if (activeTab === 'lupa') {
      const refreshFromHsl = () => { const rgb = hslToRgb(lupaColorState.h, lupaColorState.s, lupaColorState.l); const hex = rgbToHex(rgb.r, rgb.g, rgb.b); ['r','g','b'].forEach((k)=>{ q(`#dev-${k}`) && (q(`#dev-${k}`).value = rgb[k]); q(`#dev-${k}-n`) && (q(`#dev-${k}-n`).value = rgb[k]); }); q('#dev-h-n') && (q('#dev-h-n').value=lupaColorState.h); q('#dev-s-n') && (q('#dev-s-n').value=lupaColorState.s); q('#dev-l-n') && (q('#dev-l-n').value=lupaColorState.l); const pv=q('#dev-color-preview'); if (pv) pv.innerHTML = `Preview <span style="display:inline-block;width:40px;height:16px;background:${hex}"></span> <code>${hex}</code> <button id="dev-color-copy">📋 COPIAR</button>`; q('#dev-color-copy')?.addEventListener('click', ()=>navigator.clipboard.writeText(hex)); drawPicker(); };
      const drawPicker = () => { const c = q('#dev-color-canvas'); if (!c) return; const ctx = c.getContext('2d'); const cx=110, cy=110, r=90, ri=70; ctx.clearRect(0,0,220,220); for(let a=0;a<360;a+=1){ ctx.beginPath(); ctx.strokeStyle=`hsl(${a} 100% 50%)`; ctx.lineWidth=20; ctx.arc(cx,cy,80,(a-1)*Math.PI/180,a*Math.PI/180); ctx.stroke(); } const sq=100,x0=cx-sq/2,y0=cy-sq/2; for(let x=0;x<sq;x++){ for(let y=0;y<sq;y++){ const s=x/sq*100,l=100-y/sq*100; const rgb=hslToRgb(lupaColorState.h,s,l); ctx.fillStyle=rgbToHex(rgb.r,rgb.g,rgb.b); ctx.fillRect(x0+x,y0+y,1,1);} }
        const ang=lupaColorState.h*Math.PI/180; ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(cx+Math.cos(ang)*80,cy+Math.sin(ang)*80,5,0,Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.arc(x0 + lupaColorState.s/100*sq, y0 + (100-lupaColorState.l)/100*sq,4,0,Math.PI*2); ctx.stroke();
      };
      const canvas = q('#dev-color-canvas');
      if (canvas) { const pick=(e)=>{ const rect=canvas.getBoundingClientRect(); const x=e.clientX-rect.left,y=e.clientY-rect.top; const dx=x-110,dy=y-110,d=Math.hypot(dx,dy); const sq=100,x0=60,y0=60; if(_lupaColorDrag==='hue' || (d<=90&&d>=70)){ lupaColorState.h = Math.round((Math.atan2(dy,dx)*180/Math.PI+360)%360); _lupaColorDrag='hue'; } else if(_lupaColorDrag==='sl' || (x>=x0&&x<=x0+sq&&y>=y0&&y<=y0+sq)){ lupaColorState.s = clamp(Math.round((x-x0)/sq*100),0,100); lupaColorState.l = clamp(100-Math.round((y-y0)/sq*100),0,100); _lupaColorDrag='sl'; } refreshFromHsl(); };
        canvas.addEventListener('mousedown',(e)=>{pick(e); const mm=(ev)=>pick(ev); const mu=()=>{_lupaColorDrag=null; document.removeEventListener('mousemove',mm); document.removeEventListener('mouseup',mu);}; document.addEventListener('mousemove',mm); document.addEventListener('mouseup',mu);});
      }
      ['r','g','b'].forEach((k)=>{ q(`#dev-${k}`)?.addEventListener('input',()=>{ const rgb={r:+q('#dev-r').value,g:+q('#dev-g').value,b:+q('#dev-b').value}; Object.assign(lupaColorState,rgbToHsl(rgb.r,rgb.g,rgb.b)); refreshFromHsl(); }); q(`#dev-${k}-n`)?.addEventListener('input',()=>{ q(`#dev-${k}`).value=q(`#dev-${k}-n`).value; q(`#dev-${k}`).dispatchEvent(new Event('input')); });});
      [['h',360],['s',100],['l',100]].forEach(([k,max])=> q(`#dev-${k}-n`)?.addEventListener('input',()=>{ lupaColorState[k]=clamp(+q(`#dev-${k}-n`).value||0,0,max); refreshFromHsl(); }));
      q('#dev-color-prop') && (q('#dev-color-prop').value = lupaColorState.prop);
      q('#dev-color-prop')?.addEventListener('change',(e)=>lupaColorState.prop=e.target.value);
      q('#dev-color-var')?.addEventListener('change',(e)=>lupaColorState.varName=e.target.value);
      qa('input[name="dev-color-target"]').forEach((r)=>r.addEventListener('change',(e)=>lupaColorState.target=e.target.value));
      q('#dev-color-apply')?.addEventListener('click',()=>{ const rgb=hslToRgb(lupaColorState.h,lupaColorState.s,lupaColorState.l); const hex=rgbToHex(rgb.r,rgb.g,rgb.b); if(lupaColorState.target==='element'){ if(!lupaFixado) return showToast('Fixe um elemento primeiro.'); lupaFixado.style.setProperty(lupaColorState.prop,hex);} else { document.documentElement.style.setProperty(lupaColorState.varName,hex);} showToast(`Cor aplicada: ${hex}`); renderTab('lupa'); });
      q('#dev-fix-apply-text')?.addEventListener('click',()=>{ if(lupaFixado) lupaFixado.innerText=q('#dev-fix-text').value; });
      qa('[data-attr-name]').forEach((i)=>i.addEventListener('input',()=>lupaFixado?.setAttribute(i.dataset.attrName,i.value)));
      qa('[data-attr-rm]').forEach((b)=>b.addEventListener('click',()=>{lupaFixado?.removeAttribute(b.dataset.attrRm); renderTab('lupa');}));
      q('#dev-attr-add')?.addEventListener('click',()=>{ const n=q('#dev-attr-new-name').value.trim(); if(!n||!lupaFixado) return; lupaFixado.setAttribute(n,q('#dev-attr-new-val').value); renderTab('lupa'); });
      qa('[data-style-name]').forEach((i)=>i.addEventListener('input',()=>lupaFixado?.style.setProperty(i.dataset.styleName,i.value)));
      qa('[data-style-rm]').forEach((b)=>b.addEventListener('click',()=>{lupaFixado?.style.removeProperty(b.dataset.styleRm); renderTab('lupa');}));
      q('#dev-style-add')?.addEventListener('click',()=>{ const p=q('#dev-style-new-name').value.trim(); if(!p||!lupaFixado) return; lupaFixado.style.setProperty(p,q('#dev-style-new-val').value); renderTab('lupa'); });
      q('#dev-style-clear')?.addEventListener('click',()=>{ if(lupaFixado){lupaFixado.style.cssText=''; renderTab('lupa');} });
      q('#dev-lupa-copy')?.addEventListener('click',()=>lupaFixado&&navigator.clipboard.writeText(lupaFixado.outerHTML));
      q('#dev-lupa-destacar')?.addEventListener('click',()=>{ if(!lupaFixado) return; lupaFixado.style.outline='2px solid #ff1744'; setTimeout(()=>{ if(lupaFixado) lupaFixado.style.outline='';},2000);});
      q('#dev-lupa-soltar')?.addEventListener('click',()=>{lupaFixado=null; renderTab('lupa');});
      qa('[data-open-picker]').forEach((b)=>b.addEventListener('click',()=>{ const v=b.dataset.openPicker; const c=getComputedStyle(document.documentElement).getPropertyValue(v).trim(); const rgb=hexToRgb(c); if(rgb) Object.assign(lupaColorState,rgbToHsl(rgb.r,rgb.g,rgb.b)); lupaColorState.target='var'; lupaColorState.varName=v; renderTab('lupa'); q('#dev-color-picker')?.scrollIntoView({behavior:'smooth',block:'start'}); }));
      refreshFromHsl();
    }
    const toggleLupa = q('#dev-lupa-toggle');
    if (toggleLupa) toggleLupa.addEventListener('click', () => { if (lupaAtiva) stopLupa(); else startLupa(); toggleLupa.textContent = lupaAtiva ? '🔍 Desativar Lupa' : '🔍 Ativar Lupa'; const abaLupa = document.querySelector('[data-tab="lupa"]'); if (abaLupa) abaLupa.textContent = lupaAtiva ? 'LUPA 🟢' : 'LUPA ⚫'; });
  }


  function startLupa() { lupaAtiva = true; document.body.style.cursor = 'crosshair'; lupaTooltip = document.createElement('div'); lupaTooltip.id = 'dev-lupa-tooltip'; lupaTooltip.style.cssText = 'position: fixed; z-index: 99999; pointer-events: none; background: rgba(10,10,10,0.97); border: 1px solid #8b0000; color: #fff; font-family: monospace; font-size: 11px; padding: 8px; max-width: 320px; white-space: pre; display: none;'; document.body.appendChild(lupaTooltip);
    _lupaMouseMove = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); if (!el || el.closest('#dev-panel') || el.id === 'dev-lupa-tooltip') { lupaTooltip.style.display = 'none'; return; } if (lupaHighlight && lupaHighlight !== el) lupaHighlight.style.outline = ''; lupaHighlight = el; el.style.outline = '1px dashed rgba(139,0,0,0.7)'; const rect = el.getBoundingClientRect(); const cs = window.getComputedStyle(el); const props = ['background-color','color','font-size','font-family','border','padding','margin','width','height','display','position','z-index','opacity']; const cssRelevante = props.map((p) => `${p}: ${cs.getPropertyValue(p)}`).join('\n'); const gs = window.GameState || {}; lupaTooltip.textContent = ['─── ELEMENTO ───────────────────',`TAG      ${el.tagName.toLowerCase()}`,`ID       ${el.id || '(sem id)'}`,`CLASSES  ${el.className || '(sem classes)'}`,'─── POSIÇÃO ────────────────────',`X ${Math.round(rect.left)}px   Y ${Math.round(rect.top)}px`,`W ${Math.round(rect.width)}px  H ${Math.round(rect.height)}px`,'─── CSS APLICADO ───────────────',cssRelevante,'─── JOGO ───────────────────────',`Cena atual   ${gs.cenaAtual || '-'}`,`Personagem   ${gs.nomeJogador || '-'}`,`Status       Vida:${gs.statusVida ?? '-'} San:${gs.statusSanidade ?? '-'}`,`DEV_MODE     ${window.DEV_MODE}`].join('\n'); let tx = e.clientX + 16; let ty = e.clientY + 16; if (tx + 320 > window.innerWidth) tx = e.clientX - 330; if (ty + 300 > window.innerHeight) ty = e.clientY - 310; lupaTooltip.style.left = tx + 'px'; lupaTooltip.style.top = ty + 'px'; lupaTooltip.style.display = 'block'; };
    _lupaClick = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); if (!el || el.closest('#dev-panel')) return; lupaFixado = el; if (activeTab === 'lupa') renderTab('lupa'); };
    document.addEventListener('mousemove', _lupaMouseMove); document.addEventListener('click', _lupaClick); }
  function stopLupa() { lupaAtiva = false; document.body.style.cursor = ''; if (lupaTooltip) { lupaTooltip.remove(); lupaTooltip = null; } if (lupaHighlight) { lupaHighlight.style.outline = ''; lupaHighlight = null; } if (_lupaMouseMove) document.removeEventListener('mousemove', _lupaMouseMove); if (_lupaClick) document.removeEventListener('click', _lupaClick); _lupaMouseMove = null; _lupaClick = null; }

  const validateItem = (txt, cat) => {
    let it; try { it = JSON.parse(txt); } catch { return { ok: false, error: 'JSON inválido' }; }
    if (!it.id || typeof it.id !== 'string') return { ok: false, error: "Campo 'id' obrigatório" };
    if (!it.nome || typeof it.nome !== 'string') return { ok: false, error: "Campo 'nome' obrigatório" };
    if (typeof it.peso !== 'number' || it.peso < 0) return { ok: false, error: "Campo 'peso' deve ser number >= 0" };
    if (cat.startsWith('armas/')) { if (typeof it.dano?.min !== 'number' || it.dano.min < 0) return { ok:false, error:"Campo 'dano.min' inválido" }; if (typeof it.dano?.max !== 'number' || it.dano.max < it.dano.min) return { ok:false, error:`Campo 'dano.max' deve ser >= dano.min (${it.dano.min})` }; if (typeof it.durabilidade !== 'number' || it.durabilidade < 0) return { ok:false, error:"Campo 'durabilidade' inválido" }; }
    if (cat.startsWith('armaduras/')) { if (typeof it.defesa !== 'number' || it.defesa < 0) return { ok:false, error:"Campo 'defesa' inválido" }; if (typeof it.durabilidade !== 'number' || it.durabilidade < 0) return { ok:false, error:"Campo 'durabilidade' inválido" }; }
    if (cat.startsWith('consumiveis/')) { const vals = Object.values(it.efeito || {}); if (!vals.length || !vals.some((v) => typeof v === 'number')) return { ok:false, error:"Campo 'efeito' precisa ter ao menos um número" }; }
    const [macro, sub] = cat.split('/'); it.__macro = macro === 'armas' ? 'Armas' : macro === 'armaduras' ? 'Armaduras' : macro === 'consumiveis' ? 'Consumíveis' : 'Materiais'; it.__cat = sub || macro;
    return { ok: true, item: it };
  };

  const validateTrait = (txt, tp) => { let t; try { t = JSON.parse(txt); } catch { return { ok:false, error:'JSON inválido' }; } if (!t.id || typeof t.id !== 'string') return { ok:false, error:"Campo 'id' obrigatório" }; if (!t.nome || typeof t.nome !== 'string') return { ok:false, error:"Campo 'nome' obrigatório" }; if (!t.efeito || typeof t.efeito !== 'object' || !Object.keys(t.efeito).length) return { ok:false, error:"Campo 'efeito' deve ter ao menos uma chave" }; t.tipo = tp === 'positivo' ? 'Positivo' : 'Negativo'; return { ok:true, trait:t }; };
  const downloadJson = (obj, name) => { const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href); };
  const exportState = () => downloadJson({ nomeJogador: getVar('window.GameState.nomeJogador'), atributos: getVar('window.GameState.atributos'), tracos: getVar('window.GameState.tracos'), statusVida: getVar('window.GameState.statusVida'), statusSanidade: getVar('window.GameState.statusSanidade'), inventario: getVar('window.GameState.inventario'), cenaAtual: getVar('window.GameState.cenaAtual'), historicoSessao: getVar('window.GameState.historicoSessao') }, 'infection-state.json');

  const ensureStyles = () => { if (styleTag) return; styleTag = document.createElement('style'); styleTag.textContent = `#dev-panel{position:fixed;left:20px;top:20px;width:860px;height:620px;z-index:9999;background:rgba(10,10,10,.95);border:1px solid #8b0000;color:#fff;font-family:monospace}.dev-header{display:flex;justify-content:space-between;padding:8px;background:#111;cursor:move}.dev-tabs{display:flex;gap:4px;padding:6px;flex-wrap:wrap}.dev-tab.active{background:#8b0000;color:#fff}.dev-content{padding:8px}.dev-logs-list{max-height:360px;overflow:auto}.dev-log-item{font-size:11px;border-bottom:1px solid #222;padding:4px;cursor:pointer}.dev-graph-scroll{max-height:340px;max-width:100%;overflow:auto;border:1px solid #333;margin-top:6px}.dev-grid{max-height:300px;overflow:auto;border:1px solid #333}.dev-grid table{width:100%;border-collapse:collapse;table-layout:fixed}.dev-grid th:nth-child(1),.dev-grid td:nth-child(1){width:60px}.dev-grid th:nth-child(2),.dev-grid td:nth-child(2){width:160px}.dev-grid th:nth-child(3),.dev-grid td:nth-child(3){width:160px}.dev-grid th:nth-child(4),.dev-grid td:nth-child(4){width:90px}.dev-grid th:nth-child(5),.dev-grid td:nth-child(5){width:80px}.dev-grid th:nth-child(6),.dev-grid td:nth-child(6){width:50px}.dev-grid th:nth-child(7),.dev-grid td:nth-child(7){width:70px}th,td{border:1px solid #333;padding:4px;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}thead th{position:sticky;top:0;background:#111}.odd{background:#151515}.in-inv{background:rgba(46,125,50,.25)}.dev-error{color:#e57373;margin-top:6px}.dev-toast{position:fixed;top:20px;right:20px;z-index:10000;background:rgba(10,10,10,.95);border:1px solid #8b0000;color:#fff;padding:8px 12px;border-radius:6px}.dev-high-contrast{filter:contrast(1.3) brightness(1.05)}.dev-lupa-section{padding:8px}.dev-lupa-section+.dev-lupa-section{border-top:1px solid #2a2a2a}.dev-lupa-section label{display:block;margin-bottom:4px}.dev-lupa-section input,.dev-lupa-section textarea{width:100%;box-sizing:border-box}.dev-lupa-section [data-attr-name],.dev-lupa-section [data-style-name],.dev-lupa-section [data-attr-rm],.dev-lupa-section [data-style-rm]{width:auto}.dev-lupa-section button{width:auto}.dev-lupa-section [id^="dev-attr-new-"],.dev-lupa-section [id^="dev-style-new-"]{width:auto}.dev-lupa-attr-row{display:flex;gap:6px;align-items:center;margin-bottom:4px}.dev-color-canvas{margin:8px auto;display:block}.dev-color-field{display:flex;align-items:center;gap:8px;margin-bottom:6px}.dev-color-field label{width:24px;margin-bottom:0}.dev-color-field input[type="range"]{flex:1}.dev-color-field input:not([type="range"]){width:50px}`; document.head.appendChild(styleTag); };

  const buildPanel = () => { if (panel && document.body.contains(panel)) return panel; panel = document.createElement('div'); panel.id = 'dev-panel'; panel.innerHTML = `<div id="dev-header" class="dev-header"><span>⚙️ DEV MODE</span><button id="dev-hide">X</button></div><div class="dev-tabs"></div><div class="dev-content"></div>`; document.body.appendChild(panel); [['cena','CENA'],['status','STATUS'],['inventario','INVENTÁRIO'],['repo','REPO'],['logs','LOGS'],['lupa','LUPA ⚫']].forEach(([id, label]) => { const b = document.createElement('button'); b.className='dev-tab'; b.dataset.tab=id; b.textContent=label; b.onclick = () => renderTab(id); panel.querySelector('.dev-tabs').appendChild(b); }); panel.querySelector('#dev-hide').onclick = () => panel.style.display = 'none';
    const header = document.getElementById('dev-header'); let isDragging = false; let dragOffsetX = 0; let dragOffsetY = 0;
    header.addEventListener('mousedown', (e) => { isDragging = true; dragOffsetX = e.clientX - panel.offsetLeft; dragOffsetY = e.clientY - panel.offsetTop; e.preventDefault(); });
    const onMouseMove = (e) => { if (!isDragging) return; const x = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, e.clientX - dragOffsetX)); const y = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, e.clientY - dragOffsetY)); panel.style.left = x + 'px'; panel.style.top = y + 'px'; };
    const onMouseUp = () => { isDragging = false; };
    document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp);
    header.addEventListener('touchstart', (e) => { const touch = e.touches[0]; isDragging = true; dragOffsetX = touch.clientX - panel.offsetLeft; dragOffsetY = touch.clientY - panel.offsetTop; });
    const onTouchMove = (e) => { if (!isDragging) return; const touch = e.touches[0]; const x = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, touch.clientX - dragOffsetX)); const y = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, touch.clientY - dragOffsetY)); panel.style.left = x + 'px'; panel.style.top = y + 'px'; e.preventDefault(); };
    const onTouchEnd = () => { isDragging = false; };
    document.addEventListener('touchmove', onTouchMove, { passive: false }); document.addEventListener('touchend', onTouchEnd);
    panel._cleanupDrag = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); document.removeEventListener('touchmove', onTouchMove); document.removeEventListener('touchend', onTouchEnd); };
    renderTab(activeTab); return panel; };

  document.addEventListener('keydown', (e) => {
    keyBuffer = (keyBuffer + String(e.key || '').toLowerCase()).slice(-BUFFER_SIZE);
    if (keyBuffer !== SECRET) return;
    keyBuffer = '';
    window.DEV_MODE = !window.DEV_MODE;
    if (window.DEV_MODE) { ensureStyles(); buildPanel(); applyDevPatches(); setupDevShortcuts(); showToast('⚙️ Modo Dev ativado'); }
    else { stopLupa(); panel?._cleanupDrag?.(); panel?.remove(); revertDevPatches(); showToast('⚙️ Modo Dev desativado'); }
  });
})();
