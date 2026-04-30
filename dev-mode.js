(() => {
  const SECRET = 'devmode';
  const BUFFER_SIZE = SECRET.length;
  let keyBuffer = '';
  let panel = null;
  let activeTab = 'cena';
  let sceneIdBadge = null;
  let statePoll = null;
  let styleTag = null;
  let devModePatched = false;
  let loggerOriginal = null;
  let loggerProxy = null;
  let originalFns = {};
  let devLogs = [];
  let logsPaused = false;
  let logsLevelFilter = 'ALL';
  let logsCategoryFilter = 'Todos';
  let logsBody = null;
  let logsCounter = null;
  let lupaAtiva = false;
  let lupaTooltip = null;
  let lupaMouseMoveHandler = null;
  let lupaClickHandler = null;
  let lupaHighlightEl = null;
  let lupaFixadoEl = null;

  window.DEV_MODE = false;

  const getVar = (name) => {
    try {
      return Function(`return ${name};`)();
    } catch (e) {
      return undefined;
    }
  };

  const setVar = (name, value) => {
    try {
      window.__devTempValue = value;
      Function(`${name} = window.__devTempValue;`)();
      delete window.__devTempValue;
      return true;
    } catch (e) {
      delete window.__devTempValue;
      return false;
    }
  };

  const callFn = (name, ...args) => {
    try {
      const fn = Function(`return ${name};`)();
      if (typeof fn === 'function') return fn(...args);
    } catch (e) {}
    return null;
  };

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const showToast = (text) => {
    const toast = document.createElement('div');
    toast.textContent = text;
    Object.assign(toast.style, {
      position: 'fixed', top: '20px', right: '20px', zIndex: '10000',
      background: 'rgba(10,10,10,0.95)', border: '1px solid #8b0000', color: '#fff',
      fontFamily: 'monospace', padding: '8px 12px', borderRadius: '6px'
    });
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  const buildPanel = () => {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'dev-panel';
    panel.innerHTML = `<div class="dev-header"><span>⚙️ DEV MODE</span><button id="dev-hide">X</button></div>
      <div class="dev-tabs"></div><div class="dev-content"></div>`;
    document.body.appendChild(panel);

    const tabs = [
      ['cena', 'CENA'], ['status', 'STATUS'], ['inventario', 'INVENTÁRIO'], ['design', 'DESIGN'], ['repo', 'REPO'], ['logs', 'LOGS'], ['lupa', 'LUPA ⚫']
    ];
    const tabContainer = panel.querySelector('.dev-tabs');
    tabs.forEach(([id, label]) => {
      const b = document.createElement('button'); b.textContent = label; b.dataset.tab = id; b.className = 'dev-tab';
      b.onclick = () => renderTab(id);
      tabContainer.appendChild(b);
    });

    panel.querySelector('#dev-hide').onclick = () => panel.remove();
    makeDraggable(panel);
    makeResizable(panel);
    renderTab(activeTab);
    startPolling();
    return panel;
  };

  const renderTab = (tab) => {
    activeTab = tab;
    if (!panel || !document.body.contains(panel)) return;
    panel.querySelectorAll('.dev-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    const c = panel.querySelector('.dev-content');
    if (tab === 'cena') c.innerHTML = renderCenaTab();
    if (tab === 'status') c.innerHTML = renderStatusTab();
    if (tab === 'inventario') c.innerHTML = renderInventarioTab();
    if (tab === 'design') c.innerHTML = renderDesignTab();
    if (tab === 'repo') c.innerHTML = renderRepoTab();
    if (tab === 'logs') c.innerHTML = renderLogsTab();
    if (tab === 'lupa') c.innerHTML = renderLupaTab();
    bindTabEvents();
    updateLiveBits();
  };

  const renderCenaTab = () => {
    const cenas = getVar('cenas') || {}; const cenaAtual = getVar('cenaAtual'); const cena = cenas[cenaAtual] || {};
    const options = Object.keys(cenas).map((id) => `<option value="${id}">${id}</option>`).join('');
    const escolhas = (cena.escolhas || cena.choices || []).map((e, i) => `<div>${i + 1}. ${e.texto || e.text} → ${e.proxima || e.next_scene || '-'} <button data-go="${e.proxima || e.next_scene || ''}">IR</button></div>`).join('');
    return `<label>ID da cena:</label><div><input id="dev-scene-id"/><button id="dev-scene-go">IR</button></div>
      <select id="dev-scene-select"><option value="">Selecione...</option>${options}</select>
      <div id="dev-scene-info">Cena atual: ${cenaAtual || '-'} | Personagem: ${cena.personagem || '-'} | Escolhas: ${(cena.escolhas || cena.choices || []).length} | Background: ${cena.background || '-'}</div>
      <textarea id="dev-scene-text" rows="6">${(cena.texto || cena.text || '').replace(/</g, '&lt;')}</textarea><button id="dev-apply-text">APLICAR</button>
      <div>${escolhas || 'Sem escolhas.'}</div>`;
  };

  const renderStatusTab = () => {
    const a = getVar('atributos') || {}; const v = getVar('statusVida') || 0; const s = getVar('statusSanidade') || 0;
    const row = (id, label, min, max, val) => `<div><label>${label}</label><input type="range" id="${id}" min="${min}" max="${max}" value="${val}"><span id="${id}-n">${val}</span></div>`;
    return [row('vida','Vida',0,100,v), row('san','Sanidade',0,100,s), row('forca','Força',1,10,a.forca||5), row('agilidade','Agilidade',1,10,a.agilidade||5), row('resistencia','Resistência',1,10,a.resistencia||5), row('percepcao','Percepção',1,10,a.percepcao||5), row('mente','Mente',1,10,a.mente||5), '<button id="dev-recalc">RECALCULAR</button><button id="dev-reset-all">RESETAR TUDO</button>'].join('');
  };

  const renderInventarioTab = () => {
    const inv = getVar('inventario') || []; const tr = getVar('tracos') || [];
    return `<div id="dev-inv-count">${inv.length}/5 itens</div><div>${inv.map((it,i)=>`<div>${it} <button data-rm-item="${i}">❌</button></div>`).join('') || 'Vazio'}</div>
    <input id="dev-add-item"><button id="dev-add-item-btn">ADICIONAR</button><button id="dev-clear-items">LIMPAR TUDO</button>
    <hr><div>${tr.map((t,i)=>`<div>${t} <button data-rm-traco="${i}">❌</button></div>`).join('') || 'Sem traços'}</div>
    <input id="dev-add-traco"><button id="dev-add-traco-btn">ADICIONAR TRAÇO</button>`;
  };

  const renderDesignTab = () => `<div><label>--verde-militar</label><input type="color" id="dev-cor-verde"></div><div><label>--vermelho-sangue</label><input type="color" id="dev-cor-vermelho"></div><div><label>--preto-detalhe</label><input type="color" id="dev-cor-preto"></div>
  <div><label>Velocidade texto</label><input type="range" min="1" max="200" id="dev-speed"></div><div><label><input type="checkbox" id="dev-show-id"> Mostrar IDs</label></div><div><label><input type="checkbox" id="dev-hc"> Alto contraste</label></div><button id="dev-reset-design">RESETAR DESIGN</button>`;

  const renderRepoTab = () => `<a href="https://github.com/Noobzin14/Infection-game" target="_blank">GitHub</a><br><a href="#netlify-url" target="_blank">Netlify</a>
  <div id="dev-project-state"></div><button id="dev-export">EXPORTAR ESTADO</button><input type="file" id="dev-import-file" hidden><button id="dev-import">IMPORTAR ESTADO</button>`;


  const getLupaInfo = (el) => {
    const rect = el.getBoundingClientRect();
    const cs = window.getComputedStyle(el);
    const cssProps = ['background-color','color','font-size','font-family','border','padding','margin','width','height','display','position','z-index','opacity','transform'];
    const css = cssProps.map((k)=>`${k}: ${cs.getPropertyValue(k)}`).join('\n');
    return {
      tag: el.tagName.toLowerCase(), id: el.id || '-', classes: el.className || '-',
      x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height), css
    };
  };

  const formatDados = (d) => { try { return JSON.stringify(d, null, 2); } catch (e) { return String(d); } };
  const isDevElement = (el) => !!(el && (el.closest('#dev-panel') || el.classList?.contains('dev-tooltip')));

  const addLogToPanel = (entry) => {
    devLogs.unshift({...entry, id: Date.now() + Math.random()});
    if (devLogs.length > 500) devLogs = devLogs.slice(0, 500);
    updateLogsTabUI();
  };

  const addEventToPanel = (msg) => addLogToPanel({timestamp: new Date().toISOString(), nivel: 'EVENTO', categoria: 'JOGO', mensagem: msg, dados: null, isEvent: true});

  const updateLogsCounterLabel = () => {
    const logsTab = panel?.querySelector('[data-tab="logs"]');
    if (!logsTab) return;
    logsTab.textContent = `LOGS (${devLogs.length})`;
  };

  const renderLogsTab = () => `
    <div class="dev-logs-toolbar">
      <div id="dev-logs-levels">
        ${['ALL','DEBUG','INFO','WARN','ERROR','FATAL'].map((l)=>`<button class="dev-log-level" data-level="${l}">${l}</button>`).join('')}
      </div>
      <select id="dev-logs-cat">${['Todos','JS','JOGO','PIPELINE','CENA','INVENTARIO','JSON','REDE'].map((c)=>`<option>${c}</option>`).join('')}</select>
      <button id="dev-logs-clear">🗑️ LIMPAR</button>
      <button id="dev-logs-export">⬇️ EXPORTAR</button>
      <button id="dev-logs-pause">⏸️ PAUSAR</button>
    </div>
    <div class="dev-logs-list" id="dev-logs-list"></div>`;

  const updateLogsTabUI = () => {
    updateLogsCounterLabel();
    if (!panel || activeTab !== 'logs') return;
    logsBody = panel.querySelector('#dev-logs-list');
    if (!logsBody || logsPaused) return;
    const mapColor = {DEBUG:'#888', INFO:'#4fc3f7', WARN:'#ffb74d', ERROR:'#e57373', FATAL:'#ff1744', EVENTO:'#9ccc65'};
    const filtered = devLogs.filter((l)=> (logsLevelFilter==='ALL' || l.nivel===logsLevelFilter) && (logsCategoryFilter==='Todos' || l.categoria===logsCategoryFilter));
    logsBody.innerHTML = filtered.map((l)=>`<div class="dev-log-item ${l.nivel==='FATAL'?'fatal':''}" data-log-id="${l.id}" style="color:${mapColor[l.nivel]||'#fff'}">[${l.timestamp}] [${l.nivel}] [${l.categoria}] ${l.mensagem}<pre style="display:none">${l.dados?formatDados(l.dados):''}</pre></div>`).join('');
    logsBody.querySelectorAll('.dev-log-item').forEach((el)=>el.onclick=()=>{const pre=el.querySelector('pre'); if(pre)pre.style.display=pre.style.display==='none'?'block':'none';});
  };

  const renderLupaTab = () => `
    <div><button id="dev-lupa-toggle">🔍 ${lupaAtiva ? 'Desativar Lupa' : 'Ativar Lupa'}</button></div>
    <div id="dev-lupa-fixed" style="margin-top:8px">Nenhum elemento fixado.</div>`;

  const updateLupaTabLabel = () => {
    const t=panel?.querySelector('[data-tab="lupa"]'); if(t) t.textContent = `LUPA ${lupaAtiva?'🟢':'⚫'}`;
  };

  const stopLupa = () => {
    lupaAtiva = false; document.body.style.cursor='';
    if (lupaMouseMoveHandler) document.removeEventListener('mousemove', lupaMouseMoveHandler);
    if (lupaClickHandler) document.removeEventListener('click', lupaClickHandler, true);
    if (lupaTooltip) {lupaTooltip.remove(); lupaTooltip=null;}
    if (lupaHighlightEl) {lupaHighlightEl.style.outline=''; lupaHighlightEl=null;}
    updateLupaTabLabel();
  };

  const startLupa = () => {
    lupaAtiva = true; document.body.style.cursor='crosshair';
    lupaTooltip = document.createElement('div'); lupaTooltip.className='dev-tooltip'; document.body.appendChild(lupaTooltip);
    lupaMouseMoveHandler = (e) => {
      if (!lupaAtiva) return;
      lupaTooltip.style.left = `${e.clientX+16}px`; lupaTooltip.style.top = `${e.clientY+16}px`;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || isDevElement(el)) return;
      if (lupaHighlightEl && lupaHighlightEl !== el) lupaHighlightEl.style.outline='';
      lupaHighlightEl = el; el.style.outline='1px dashed rgba(139,0,0,0.7)';
      const i = getLupaInfo(el);
      lupaTooltip.textContent = `─── ELEMENTO ───────────────────\nTAG      ${i.tag}\nID       ${i.id}\nCLASSES  ${i.classes}\n─── POSIÇÃO ────────────────────\nX        ${i.x}px   Y    ${i.y}px\nW        ${i.w}px  H    ${i.h}px\n─── CSS APLICADO ───────────────\n${i.css}\n─── JOGO ───────────────────────\nCena atual        ${getVar('cenaAtual')||'-'}\nPersonagem        ${getVar('nomeJogador')||'-'}\nStatus            Vida:${getVar('statusVida')||0} San:${getVar('statusSanidade')||0}\nDEV_MODE          ${window.DEV_MODE}`;
    };
    lupaClickHandler = (e) => {
      if (!lupaAtiva) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (!el || isDevElement(el)) return;
      e.preventDefault(); e.stopPropagation();
      lupaFixadoEl = el;
      const box = panel?.querySelector('#dev-lupa-fixed'); if (!box) return;
      const i = getLupaInfo(el);
      box.innerHTML = `<div>📌 FIXADO: ${i.tag}${i.id!=='-'?`#${i.id}`:''}</div><textarea readonly rows="8" style="width:100%">${el.outerHTML.replace(/</g,'&lt;')}</textarea><button id="dev-lupa-copy">COPIAR HTML</button><button id="dev-lupa-outline">DESTACAR</button><button id="dev-lupa-release">SOLTAR</button>`;
      box.querySelector('#dev-lupa-copy').onclick = async ()=>{ try{ await navigator.clipboard.writeText(el.outerHTML); showToast('HTML copiado'); } catch(_){} };
      box.querySelector('#dev-lupa-outline').onclick = ()=>{ const prev = el.style.outline; el.style.outline = '2px solid #ff1744'; setTimeout(()=>{el.style.outline = prev;},2000); };
      box.querySelector('#dev-lupa-release').onclick = ()=>{ lupaFixadoEl=null; box.innerHTML='Nenhum elemento fixado.'; };
    };
    document.addEventListener('mousemove', lupaMouseMoveHandler);
    document.addEventListener('click', lupaClickHandler, true);
    updateLupaTabLabel();
  };

  const applyDevPatches = () => {
    if (devModePatched) return;
    devModePatched = true;
    loggerOriginal = window.Logger;
    if (loggerOriginal) {
      loggerProxy = new Proxy(loggerOriginal, { get(target, prop) {
        if (['debug','info','warn','error','fatal'].includes(prop)) {
          return (categoria, mensagem, dados) => { target[prop](categoria, mensagem, dados); addLogToPanel({timestamp:new Date().toISOString(), nivel:String(prop).toUpperCase(), categoria, mensagem, dados}); };
        }
        return target[prop];
      }});
      window.Logger = loggerProxy;
    }
    originalFns.renderCena = window.renderCena;
    originalFns.aplicarEfeitos = window.aplicarEfeitos;
    originalFns.avancarCena = window.avancarCena;
    originalFns.atualizarStatus = window.atualizarStatus;
    if (typeof originalFns.renderCena === 'function') window.renderCena = function(id){ addEventToPanel(`renderCena("${id}")`); return originalFns.renderCena.apply(this, arguments); };
    if (typeof originalFns.aplicarEfeitos === 'function') window.aplicarEfeitos = function(efeito){ addEventToPanel(`aplicarEfeitos(${formatDados(efeito)})`); return originalFns.aplicarEfeitos.apply(this, arguments); };
    if (typeof originalFns.avancarCena === 'function') window.avancarCena = function(escolha){ addEventToPanel(`avancarCena → proxima: "${escolha?.proxima || escolha?.next_scene || '-'}"`); return originalFns.avancarCena.apply(this, arguments); };
    if (typeof originalFns.atualizarStatus === 'function') window.atualizarStatus = function(){ addEventToPanel(`status atualizado (vida: ${getVar('statusVida')||0}, san: ${getVar('statusSanidade')||0})`); return originalFns.atualizarStatus.apply(this, arguments); };
  };

  const revertDevPatches = () => {
    if (!devModePatched) return;
    devModePatched = false;
    if (loggerOriginal) window.Logger = loggerOriginal;
    ['renderCena','aplicarEfeitos','avancarCena','atualizarStatus'].forEach((k)=>{ if (originalFns[k]) window[k] = originalFns[k]; });
    stopLupa();
  };
  function bindTabEvents() { /* omitted brevity in analysis */
    const q=(s)=>panel.querySelector(s); const qa=(s)=>panel.querySelectorAll(s);
    q('#dev-scene-select')?.addEventListener('change',e=>{q('#dev-scene-id').value=e.target.value;});
    q('#dev-scene-go')?.addEventListener('click',()=>{const id=q('#dev-scene-id').value.trim(); const cenas=getVar('cenas')||{}; if(cenas[id]) callFn('renderCena',id); else alert('Cena não existe.');});
    q('#dev-apply-text')?.addEventListener('click',()=>{const cenas=getVar('cenas')||{}; const id=getVar('cenaAtual'); if(cenas[id]){cenas[id].texto=q('#dev-scene-text').value; callFn('renderCena',id);}});
    qa('[data-go]').forEach(b=>b.onclick=()=>b.dataset.go&&callFn('renderCena',b.dataset.go));

    ['vida','san','forca','agilidade','resistencia','percepcao','mente'].forEach((id)=>{q(`#${id}`)?.addEventListener('input',(e)=>{q(`#${id}-n`).textContent=e.target.value; applyStatus(id,Number(e.target.value));});});
    q('#dev-recalc')?.addEventListener('click',()=>{const a=getVar('atributos')||{}; setVar('statusVida',clamp(50+((a.resistencia||5)*10),0,100)); setVar('statusSanidade',clamp(50+((a.mente||5)*10),0,100)); callFn('atualizarStatus');});
    q('#dev-reset-all')?.addEventListener('click',()=>{setVar('statusVida',100);setVar('statusSanidade',100);setVar('atributos',{forca:5,agilidade:5,resistencia:5,percepcao:5,mente:5}); callFn('atualizarStatus'); renderTab('status');});

    qa('[data-rm-item]').forEach(b=>b.onclick=()=>{const inv=getVar('inventario')||[]; inv.splice(Number(b.dataset.rmItem),1); callFn('atualizarStatus'); renderTab('inventario');});
    q('#dev-add-item-btn')?.addEventListener('click',()=>{const v=q('#dev-add-item').value.trim(); const inv=getVar('inventario')||[]; if(v&&inv.length<5){inv.push(v); callFn('atualizarStatus'); renderTab('inventario');}});
    q('#dev-clear-items')?.addEventListener('click',()=>{const inv=getVar('inventario')||[]; inv.splice(0,inv.length); callFn('atualizarStatus'); renderTab('inventario');});
    qa('[data-rm-traco]').forEach(b=>b.onclick=()=>{const t=getVar('tracos')||[]; t.splice(Number(b.dataset.rmTraco),1); renderTab('inventario');});
    q('#dev-add-traco-btn')?.addEventListener('click',()=>{const v=q('#dev-add-traco').value.trim(); const t=getVar('tracos')||[]; if(v&&!t.includes(v))t.push(v); renderTab('inventario');});

    const root = document.documentElement.style;
    q('#dev-cor-verde')?.addEventListener('input',e=>root.setProperty('--verde-militar',e.target.value));
    q('#dev-cor-vermelho')?.addEventListener('input',e=>root.setProperty('--vermelho-sangue',e.target.value));
    q('#dev-cor-preto')?.addEventListener('input',e=>root.setProperty('--preto-detalhe',e.target.value));
    q('#dev-speed')?.addEventListener('input',e=>setVar('velocidadeTexto',Number(e.target.value)));
    q('#dev-show-id')?.addEventListener('change',e=>toggleSceneId(e.target.checked));
    q('#dev-hc')?.addEventListener('change',e=>document.body.classList.toggle('alto-contraste',e.target.checked));
    q('#dev-reset-design')?.addEventListener('click',()=>{root.setProperty('--verde-militar','#2d4a1e');root.setProperty('--vermelho-sangue','#8b0000');root.setProperty('--preto-detalhe','#0a0a0a');document.body.classList.remove('alto-contraste');});

    q('#dev-export')?.addEventListener('click',exportState);
    q('#dev-import')?.addEventListener('click',()=>q('#dev-import-file').click());
    q('#dev-import-file')?.addEventListener('change',importState);

    q('#dev-logs-cat')?.addEventListener('change',(e)=>{logsCategoryFilter=e.target.value; updateLogsTabUI();});
    q('#dev-logs-clear')?.addEventListener('click',()=>{devLogs=[]; updateLogsTabUI();});
    q('#dev-logs-export')?.addEventListener('click',()=>window.Logger?.exportar?.());
    q('#dev-logs-pause')?.addEventListener('click',(e)=>{logsPaused=!logsPaused; e.target.textContent=logsPaused?'▶️ RETOMAR':'⏸️ PAUSAR'; if(!logsPaused) updateLogsTabUI();});
    qa('.dev-log-level').forEach((b)=>{b.onclick=()=>{logsLevelFilter=b.dataset.level; qa('.dev-log-level').forEach((x)=>x.classList.toggle('active',x===b)); updateLogsTabUI();}; if (b.dataset.level===logsLevelFilter) b.classList.add('active');});

    q('#dev-lupa-toggle')?.addEventListener('click',()=>{ if(lupaAtiva) stopLupa(); else startLupa(); renderTab('lupa'); });
  }

  const applyStatus=(id,val)=>{const a=getVar('atributos')||{}; if(id==='vida')setVar('statusVida',val); else if(id==='san')setVar('statusSanidade',val); else {a[id]=val;} callFn('atualizarStatus');};
  const toggleSceneId=(on)=>{const box=document.getElementById('texto-dialogo'); if(!box)return; if(on){if(!sceneIdBadge){sceneIdBadge=document.createElement('div'); sceneIdBadge.style.cssText='position:absolute;right:10px;top:10px;font:12px monospace;color:#fff;'; box.parentElement.style.position='relative'; box.parentElement.appendChild(sceneIdBadge);} sceneIdBadge.textContent=`ID: ${getVar('cenaAtual')||'-'}`;} else if(sceneIdBadge){sceneIdBadge.remove(); sceneIdBadge=null;}};
  const exportState=()=>{const obj={nomeJogador:getVar('nomeJogador'),atributos:getVar('atributos'),tracos:getVar('tracos'),statusVida:getVar('statusVida'),statusSanidade:getVar('statusSanidade'),inventario:getVar('inventario'),cenaAtual:getVar('cenaAtual'),historicoSessao:getVar('historicoSessao')}; const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='infection-state.json'; a.click(); URL.revokeObjectURL(a.href);};
  const importState=(e)=>{const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{try{const d=JSON.parse(r.result); setVar('nomeJogador',d.nomeJogador||''); setVar('atributos',d.atributos||getVar('atributos')); setVar('tracos',d.tracos||[]); setVar('statusVida',d.statusVida||100); setVar('statusSanidade',d.statusSanidade||100); const inv=getVar('inventario')||[]; inv.splice(0,inv.length,...(d.inventario||[])); const hist=getVar('historicoSessao')||[]; hist.splice(0,hist.length,...(d.historicoSessao||[])); callFn('atualizarStatus'); if(d.cenaAtual)callFn('renderCena',d.cenaAtual);}catch(err){alert('JSON inválido');}}; r.readAsText(f);};

  const startPolling=()=>{if(statePoll)clearInterval(statePoll); statePoll=setInterval(updateLiveBits,300);};
  const updateLiveBits=()=>{if(!panel||!document.body.contains(panel))return; if(sceneIdBadge)sceneIdBadge.textContent=`ID: ${getVar('cenaAtual')||'-'}`; const el=panel.querySelector('#dev-project-state'); if(el){const v=(window.__MEMORY_VERSION||'0.1.0-dev'); el.innerHTML=`Cenas: ${Object.keys(getVar('cenas')||{}).length}<br>Cena atual: ${getVar('cenaAtual')||'-'}<br>Inventário: ${(getVar('inventario')||[]).length}<br>Traços: ${(getVar('tracos')||[]).join(', ')||'-'}<br>DEV_MODE: ${window.DEV_MODE}<br>Versão: ${v}`;}};

  const makeDraggable=(el)=>{const h=el.querySelector('.dev-header'); let d=false,ox=0,oy=0; h.onmousedown=(e)=>{d=true;ox=e.clientX-el.offsetLeft;oy=e.clientY-el.offsetTop;}; document.addEventListener('mousemove',(e)=>{if(!d)return; let x=e.clientX-ox,y=e.clientY-oy; x=clamp(x,0,window.innerWidth-el.offsetWidth); y=clamp(y,0,window.innerHeight-el.offsetHeight); el.style.left=`${x}px`; el.style.top=`${y}px`;}); document.addEventListener('mouseup',()=>d=false);};
  const makeResizable=(el)=>{el.style.resize='both'; el.style.overflow='auto';};

  const ensureStyles=()=>{if(styleTag)return; styleTag=document.createElement('style'); styleTag.textContent=`#dev-panel{position:fixed;left:20px;top:20px;width:380px;height:520px;z-index:9999;background:rgba(10,10,10,.95);border:1px solid #8b0000;color:#fff;font-family:monospace} .dev-header{display:flex;justify-content:space-between;padding:8px;background:#111;cursor:move;color:#8b0000;font-weight:700}.dev-tabs{display:flex;gap:4px;padding:6px}.dev-tab{font-family:monospace}.dev-tab.active{background:#8b0000;color:#fff}.dev-content{padding:8px}.alto-contraste{filter:contrast(1.4) brightness(1.1)} .dev-logs-list{max-height:360px;overflow:auto;border-top:1px solid #333;margin-top:6px;padding-top:6px}.dev-log-item{font-size:11px;border-bottom:1px solid #222;padding:4px;cursor:pointer}.dev-log-item.fatal{background:rgba(255,23,68,.1)} .dev-log-level{border:1px solid #666;background:transparent;color:#fff} .dev-log-level.active[data-level='DEBUG']{background:#888}.dev-log-level.active[data-level='INFO']{background:#4fc3f7;color:#000}.dev-log-level.active[data-level='WARN']{background:#ffb74d;color:#000}.dev-log-level.active[data-level='ERROR']{background:#e57373}.dev-log-level.active[data-level='FATAL']{background:#8b0000}.dev-log-level.active[data-level='ALL']{background:#666}.dev-tooltip{position:fixed;max-width:320px;z-index:99999;background:rgba(10,10,10,0.97);border:1px solid #8b0000;color:#fff;font:11px monospace;padding:8px;white-space:pre-wrap;pointer-events:none}`; document.head.appendChild(styleTag);};

  fetch('MEMORY.json').then(r=>r.json()).then(j=>{window.__MEMORY_VERSION = j.versao || j.version || '0.1.0-dev';}).catch(()=>{});

  document.addEventListener('keydown', (e) => {
    keyBuffer = (keyBuffer + String(e.key || '').toLowerCase()).slice(-BUFFER_SIZE);
    if (keyBuffer !== SECRET) return;
    keyBuffer = '';
    window.DEV_MODE = !window.DEV_MODE;
    if (window.DEV_MODE) {
      ensureStyles();
      buildPanel();
      applyDevPatches();
      Logger.info('PIPELINE', 'Modo dev ativado/desativado');
      showToast('⚙️ Modo Dev ativado');
    } else {
      panel?.remove();
      revertDevPatches();
      Logger.info('PIPELINE', 'Modo dev ativado/desativado');
    }
  });
})();
