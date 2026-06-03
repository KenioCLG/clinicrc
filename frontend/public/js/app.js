import ClinicrcApiClient from './api-client.js';

// Scripts dinâmicos
let scriptCache = {};
let isEditingScript = false;

async function fetchScript(attempt) {
  if (scriptCache[attempt]) return scriptCache[attempt];
  try {
    const token = localStorage.getItem('clinicrc_token');
    const res = await fetch(`/api/scripts/${attempt}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    scriptCache[attempt] = data.content || '';
    return scriptCache[attempt];
  } catch (err) {
    return 'Erro ao carregar roteiro.';
  }
}

async function saveScript(attempt, content) {
  try {
    const token = localStorage.getItem('clinicrc_token');
    const res = await fetch(`/api/scripts/${attempt}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    if(res.ok) {
      scriptCache[attempt] = content;
      showToast('Roteiro salvo!', 'ok');
    }
  } catch(err) {
    showToast('Erro ao salvar roteiro', 'er');
  }
}

function parseMathDiscount(text, valorNum) {
  return text.replace(/#promo\((\d+)%\)/gi, (match, percStr) => {
    const perc = parseInt(percStr, 10);
    const desconto = valorNum * (1 - (perc / 100));
    const vAntigo = valorNum.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    const vNovo = desconto.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
    return `<span class="dyn-promo">de ${vAntigo} por ${vNovo}</span>`;
  });
}

function parseScriptTags(text) {
  const nm = pA ? pA.nome.split(' ')[0] : '[NOME]';
  const pr = pA ? pA.proc : '[PROCEDIMENTO]';
  const vlRaw = pA ? pA.valor : 'R$ 0,00';
  
  let vlNum = 0;
  try {
    vlNum = parseFloat(vlRaw.replace('R$','').replace(/\./g,'').replace(',','.').trim()) || 0;
  } catch(e){}

  let parsed = text;
  parsed = parseMathDiscount(parsed, vlNum);
  
  parsed = parsed.replace(/#nome/gi, `<span class="dyn-var">${nm}</span>`);
  parsed = parsed.replace(/#procedimento/gi, `<span class="dyn-var">${pr}</span>`);
  parsed = parsed.replace(/#valor/gi, `<span class="dyn-var">${vlRaw}</span>`);
  return parsed;
}

window.toggleScriptEdit = async () => {
  const btn = document.getElementById('btnEditScript');
  const btnDel = document.getElementById('btnDeleteScript');
  const icon = document.getElementById('iconEditScript');
  const txt = document.getElementById('txtEditScript');
  const sbody = document.getElementById('sbody');
  const sbodyEdit = document.getElementById('sbody-edit');
  const textarea = document.getElementById('scriptTextarea');

  isEditingScript = !isEditingScript;

  if (isEditingScript) {
    btn.classList.add('editing');
    icon.textContent = 'save';
    txt.textContent = 'Salvar';
    sbody.style.display = 'none';
    sbodyEdit.style.display = 'flex';
    if(btnDel) btnDel.style.display = 'none';
    
    const content = scriptCache[tN] || '';
    if (easyMDE) {
      easyMDE.value(content);
      setTimeout(() => easyMDE.codemirror.refresh(), 100);
    } else {
      textarea.value = content;
    }
  } else {
    btn.classList.remove('editing');
    icon.textContent = 'edit_note';
    txt.textContent = 'Editar';
    sbody.style.display = 'block';
    sbodyEdit.style.display = 'none';
    if(btnDel) btnDel.style.display = 'flex';
    
    const newContent = easyMDE ? easyMDE.value() : textarea.value;
    await saveScript(tN, newContent);
    await updS();
  }
};

// Instanciar o cliente de API (comporta-se como portão)
const api = new ClinicrcApiClient();

let E = []; // Pacientes locais em memória
window._E = E; // Expõe para o api-client achar o tel pelo ID
let tN = 1, pA = null, fId = null;
let obsDebounce = {};

// Mostra nome da clínica logada no header
const clinicName = localStorage.getItem('clinicrc_clinic');
const clinicEl = document.getElementById('clinicNameDisplay');
if (clinicEl && clinicName) clinicEl.textContent = clinicName;

// Função de logout global
window.doLogout = () => {
  localStorage.clear();
  window.location.href = 'index.html';
};

let maxAttempts = 1;
let easyMDE = null;

async function fetchConfig() {
  try {
    const token = localStorage.getItem('clinicrc_token');
    const res = await fetch('/api/scripts/config', { headers: { 'Authorization': `Bearer ${token}` } });
    if(res.ok) {
      const data = await res.json();
      maxAttempts = data.max_attempts || 1;
    }
  } catch(err) {}
}

window.addAttempt = async () => {
  try {
    const token = localStorage.getItem('clinicrc_token');
    const res = await fetch('/api/scripts/config/add-attempt', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    if(res.ok) {
      const data = await res.json();
      maxAttempts = data.max_attempts;
      renderTbar();
      render(); // Atualiza Kanban dots
      showToast('Nova tentativa adicionada!', 'ok');
    } else {
      const errText = await res.text();
      throw new Error(`Erro ${res.status}: ${errText}`);
    }
  } catch(err) {
    console.error('addAttempt err:', err);
    showToast('Erro ao adicionar tentativa', 'er');
  }
};

window.deleteAttempt = async () => {
  if (maxAttempts <= 1) {
    showToast('Você deve manter pelo menos 1 tentativa!', 'er');
    return;
  }
  if (!confirm(`Tem certeza que deseja apagar a ${tN}ª tentativa?\nIsso vai remover este roteiro e voltar todos os roteiros seguintes uma posição.`)) {
    return;
  }
  try {
    const token = localStorage.getItem('clinicrc_token');
    const res = await fetch(`/api/scripts/${tN}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      maxAttempts = data.max_attempts;
      // Limpa cache para forçar recarregamento
      scriptCache = {}; 
      
      // Volta uma aba se apagamos a última
      if (tN > maxAttempts) {
        tN = maxAttempts;
      }
      
      renderTbar();
      await updS(); // Atualiza o roteiro mostrado na tela
      render(); // Atualiza Kanban (dots)
      showToast('Tentativa removida!', 'ok');
    } else {
      const err = await res.json().catch(()=>({}));
      throw new Error(err.error || `Erro ${res.status}`);
    }
  } catch(err) {
    console.error('deleteAttempt err:', err);
    showToast(err.message || 'Erro ao apagar', 'er');
  }
};

function renderTbar() {
  const tbar = document.getElementById('tbar');
  if(!tbar) return;
  let h = `<span class="tlbl">Tentativa:</span>`;
  for(let i=1; i<=maxAttempts; i++) {
    h += `<button class="tbtn ${i===tN ? 'on':''}" onclick="window.selT(${i})">${i}ª</button>`;
  }
  h += `<button class="tbtn" onclick="window.addAttempt()" title="Adicionar tentativa" style="padding: 0 10px; margin-left: 5px;"><span class="mi" style="font-size:18px; margin-top:2px;">add_call</span></button>`;
  tbar.innerHTML = h;
}

function initEditor() {
  const textarea = document.getElementById('scriptTextarea');
  if (!textarea || typeof EasyMDE === 'undefined') return;
  
  easyMDE = new EasyMDE({
    element: textarea,
    spellChecker: false,
    placeholder: "Escreva seu roteiro estratégico aqui...",
    status: false,
    toolbar: [
      "bold", "italic", "heading", "|",
      "quote", "unordered-list", "ordered-list", "|",
      {
        name: "insert-name",
        action: (editor) => { const cm = editor.codemirror; cm.replaceSelection('#nome '); },
        className: "fa fa-user",
        title: "Inserir Nome",
        text: "Nome"
      },
      {
        name: "insert-proc",
        action: (editor) => { const cm = editor.codemirror; cm.replaceSelection('#procedimento '); },
        className: "fa fa-stethoscope",
        title: "Inserir Procedimento",
        text: "Proc"
      },
      {
        name: "insert-val",
        action: (editor) => { const cm = editor.codemirror; cm.replaceSelection('#valor '); },
        className: "fa fa-money",
        title: "Inserir Valor",
        text: "Valor"
      },
      {
        name: "insert-promo",
        action: (editor) => { const cm = editor.codemirror; cm.replaceSelection('#promo(30%) '); },
        className: "fa fa-percent",
        title: "Inserir Promoção Automática",
        text: "Promo"
      },
      "|",
      {
        name: "insert-tip",
        action: (editor) => {
          const cm = editor.codemirror;
          cm.replaceSelection('\n> [!TIP]\n> **DICA DE OURO:** \n');
        },
        className: "fa fa-lightbulb-o",
        title: "Caixa de Dica (PNL)",
        text: "Dica"
      }
    ]
  });
}

/**
 * Inicializar a aplicação
 */
async function init() {
  // Título dinâmico baseado na clínica logada
  const clinicName = localStorage.getItem('clinicrc_clinic') || 'ClinicRC';
  document.title = `Retorno de Pacientes — ${clinicName}`;

  try {
    setSyncStatus('ok', 'Carregando dados...');
    await fetchConfig();
    renderTbar();
    initEditor();
    
    // Inicializa o Odontograma (Flyweight Pattern)
    if (window.Odontogram) {
      window.odontogramaInstance = new window.Odontogram('odontograma-container');
    }
    
    E = await api.getPatients();
    window._E = E; // Sincroniza referência global
    setSyncStatus('ok', `Conectado · ${E.length} pacientes`);
  } catch (err) {
    console.warn('Erro ao conectar na API. Utilizando localStorage como fallback...', err);
    fallbackMode();
  } finally {
    document.getElementById('loadingOverlay').classList.add('hide');
    render();
    selT(1); // Load default attempt 1 script
  }
}

/**
 * Fallback local offline (caso o Worker backend esteja fora do ar)
 */
function fallbackMode() {
  setSyncStatus('err', 'Modo Offline (Local)');
  try {
    const s = localStorage.getItem(`clv_${localStorage.getItem('clinicrc_user')}`);
    if (s) {
      E = JSON.parse(s);
    } else {
      // Mock local sem rede
      E = [];
    }
  } catch(e) {
    E = [];
  }
}

function saveLocal() {
  try { localStorage.setItem(`clv_${localStorage.getItem('clinicrc_user')}`, JSON.stringify(E)); } catch(e) {}
}

function setSyncStatus(type, txt) {
  const el = document.getElementById('syncBadge');
  el.className = 'sync-badge ' + type;
  document.getElementById('syncTxt').textContent = txt;
}

let toastTimer;
function showToast(msg, type='ok') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast ' + type + ' on';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.className = 'toast', 2200);
}

/**
 * Atualizar paciente localmente e na nuvem
 */
async function updatePaciente(id, updates) {
  const p = E.find(x => x.id === id);
  if (!p) return;
  Object.assign(p, updates);
  render();
  saveLocal();

  try {
    setSyncStatus('ok', 'Salvando...');
    await api.updatePatient(id, updates);
    setSyncStatus('ok', `Conectado · ${E.length} pacientes`);
    showToast('Salvo ✓', 'ok');
  } catch (err) {
    setSyncStatus('err', 'Erro ao salvar');
    showToast('Salvo localmente (offline)', 'ok');
    console.error('Erro na API:', err);
  }
}

/**
 * Renderizar Kanban
 */
function render() {
  const q = (document.querySelector('.ksrch')?.value || '').toLowerCase();
  const C = { ligar: [], contato: [], agendado: [], final: [] };
  E.forEach(p => { if (!q || p.nome.toLowerCase().includes(q)) C[p.col]?.push(p); });
  const ids = { ligar: 'c1', contato: 'c2', agendado: 'c3', final: 'c4' };
  
  ['ligar','contato','agendado','final'].forEach(c => {
    document.getElementById(ids[c]).textContent = E.filter(p => p.col === c).length;
    const el = document.getElementById('col-' + c);
    el.innerHTML = C[c].length ? C[c].map(p => mkC(p)).join('') : `<div class="empty-c">Nenhum paciente aqui</div>`;
  });
  
  document.getElementById('ki1').textContent = E.filter(p => p.col === 'contato').length;
  document.getElementById('ki2').textContent = E.filter(p => p.col === 'agendado').length;
  document.getElementById('ki3').textContent = E.filter(p => p.col === 'final').length;
}

function mkC(p) {
  const sel = pA?.id === p.id ? 'sel' : '';
  let d = `<div class="trow"><span class="tlb">Tent.:</span>`;
  for (let i = 1; i <= maxAttempts; i++) {
    let c = '';
    const t = p.tent || 0;
    if (i <= t) {
      c = 'dn';
    } else if (i === t + 1) {
      // S aplica 'nx' se j tiver feito alguma tentativa ou se no estiver na coluna 'ligar' inicial
      if (t > 0 || p.col !== 'ligar') c = 'nx';
    }
    d += `<div class="dot ${c}" onclick="window._mT('${p.id}',${i},event)">${i}</div>`;
  }
  d += `</div>`;
  let chip = '';
  if (p.res) {
    const m = { agendou: ['bag','Agendou'], procedimento: ['bpr','Já Realizou'], 'sem-interesse': ['bsi','Sem Interesse'], 'sem-resposta': ['bsr','Sem Resposta'] };
    const [cl, lb] = m[p.res] || ['', ''];
    chip = `<span class="bdg ${cl}">${lb}</span><br>`;
  }
  let b = '';
  if (p.col === 'ligar') b = `<button class="cb cbo" onclick="window._mv('${p.id}','contato',event)">Em Contato</button><button class="cb cbg" onclick="window._mv('${p.id}','agendado',event)">Agendar</button><button class="cb cbgr" onclick="window._oM('${p.id}',event)">Finalizar</button>`;
  else if (p.col === 'contato') b = `<button class="cb cbg" onclick="window._mv('${p.id}','agendado',event)">Agendar</button><button class="cb cbgr" onclick="window._oM('${p.id}',event)">Finalizar</button><button class="cb cbb" onclick="window._mv('${p.id}','ligar',event)">↩ Voltar</button>`;
  else if (p.col === 'agendado') b = `<button class="cb cbgr" onclick="window._oM('${p.id}',event)">Finalizar</button><button class="cb cbo" onclick="window._mv('${p.id}','contato',event)">↩ Em Contato</button>`;
  else b = `<button class="cb cbb" onclick="window._mv('${p.id}','ligar',event)">↩ Reabrir</button>`;
  
  return `<div class="card ${sel}" onclick="window._sP('${p.id}')">
    <div class="cn">${p.nome}</div>
    <div class="ctxt">📱 ${p.tel}</div>
    <span class="cp2">${p.proc}</span>
    <div class="cv">${p.valor}</div>
    ${d}${chip}
    <textarea class="cobs" placeholder="Anotações..." onclick="event.stopPropagation()" oninput="window._sO('${p.id}',this.value)">${p.obs || ''}</textarea>
    <div class="cbtns">${b}</div>
  </div>`;
}

// ─── AÇÕES EXPOSTAS AO WINDOW PARA HANDLERS INLINE ─────────────────────────
window._mv = (id, col, e) => {
  e?.stopPropagation();
  const updates = { col };
  // Limpa o status (res) se estiver voltando pro funil para uma nova tentativa
  if (col === 'ligar' || col === 'contato') {
    updates.res = null;
  }
  updatePaciente(id, updates);
};

window._mT = (id, n, e) => {
  e?.stopPropagation();
  const p = E.find(x => x.id === id);
  if (!p) return;
  let newTent = p.tent, newCol = p.col;
  if (n === p.tent) {
    if (!confirm('Desfazer última tentativa?')) return;
    newTent = p.tent - 1;
  }
  else if (n === p.tent + 1) { newTent = n; if (p.col === 'ligar') newCol = 'contato'; }
  tN = Math.max(1, newTent + 1);
  document.querySelectorAll('.tbtn').forEach((b, i) => b.classList.toggle('on', i + 1 === tN));
  updatePaciente(id, { tent: newTent, col: newCol });
  if (pA?.id === id) { pA = E.find(x => x.id === id); updS(); }
};

window._sO = (id, v) => {
  clearTimeout(obsDebounce[id]);
  obsDebounce[id] = setTimeout(() => updatePaciente(id, { obs: v }), 800);
};

window._sP = (id) => {
  pA = E.find(x => x.id === id);
  tN = Math.max(1, (pA.tent || 0) + 1);
  document.querySelectorAll('.tbtn').forEach((b, i) => b.classList.toggle('on', i + 1 === tN));
  render(); updP();
};

window._oM = (id, e) => {
  e?.stopPropagation();
  fId = id;
  const p = E.find(x => x.id === id);
  document.getElementById('mp').textContent = `Paciente: ${p.nome}`;
  document.getElementById('modal').classList.add('on');
};

async function selT(n) {
  tN = n;
  document.querySelectorAll('.tbtn').forEach((b, i) => b.classList.toggle('on', i + 1 === n));
  await updS();
}
window.selT = selT;

function updP() {
  const el = document.getElementById('pbar');
  if (!pA) {
    el.innerHTML = '';
    el.classList.add('empty');
    return;
  }
  el.classList.remove('empty');
  
  let chip = '';
  if (pA.res) {
    const m = { agendou: ['bag','Agendou'], procedimento: ['bpr','Já Realizou'], 'sem-interesse': ['bsi','Sem Interesse'], 'sem-resposta': ['bsr','Sem Resposta'] };
    const [cl, lb] = m[pA.res] || ['', ''];
    chip = `<span class="bdg ${cl}" style="margin:0; font-size:11px; padding:4px 8px;">${lb}</span>`;
  } else {
    const colNames = { ligar: 'Para Ligar', contato: 'Em Contato', agendado: 'Agendado', concluido: 'Concluído' };
    chip = `<span class="bdg" style="background:#E2E8F0; color:#475569; margin:0; font-size:11px; padding:4px 8px;">${colNames[pA.col] || 'Ativo'}</span>`;
  }

  el.innerHTML = `
    <span class="mi" style="color:var(--cp); font-size:24px;">person</span>
    <div style="flex:1;">
      <strong>${pA.nome}</strong>
      <span>${pA.proc} · ${pA.valor} · ${pA.tent || 0} tentativa(s)</span>
    </div>
    <div>${chip}</div>
  `;
  updS();
}

async function updS() {
  const btnEdit = document.getElementById('btnEditScript');
  const btnDel = document.getElementById('btnDeleteScript');
  if (btnEdit) btnEdit.style.display = 'flex';
  if (btnDel && !isEditingScript) btnDel.style.display = 'flex';

  const el = document.getElementById('sbody');
  const textarea = document.getElementById('scriptTextarea');
  
  if (!isEditingScript) {
    el.innerHTML = '<p style="color:#888;font-size:12px;padding:10px;">Carregando roteiro...</p>';
  }
  
  const content = await fetchScript(tN);
  
  if (isEditingScript) {
    textarea.value = content;
  } else {
    const parsedMarkdown = parseScriptTags(content);
    let html = parsedMarkdown;
    if (typeof marked !== 'undefined') {
      html = marked.parse(parsedMarkdown);
    }
    // Converter alertas do GitHub (ex: [!TIP]) em classes CSS
    html = html.replace(/<blockquote>\s*<p>\[!(\w+)\](?:<br>|\n|\s*)/gi, '<blockquote class="gh-alert gh-alert-$1"><p>');
    
    el.innerHTML = html;
    el.scrollTop = 0;
  }
}

function fModal() { document.getElementById('modal').classList.remove('on'); fId = null; }
window.fModal = fModal;

async function conf(res) {
  const p = E.find(x => x.id === fId);
  if (p) {
    await updatePaciente(fId, { col: 'final', res, dt: new Date().toLocaleDateString('pt-BR') });
    if (pA?.id === p.id) {
      pA = null;
      const el = document.getElementById('pbar');
      el.classList.add('empty');
      el.innerHTML = '<span class="mi" style="color:var(--cp)">touch_app</span><div><strong>Nenhum paciente selecionado</strong><span>Clique em um cartão ao lado</span></div>';
    }
  }
  fModal();
}
window.conf = conf;

function trocarAba(i, b) {
  document.querySelectorAll('.tab-btn').forEach((x, j) => x.classList.toggle('on', j === i));
  document.querySelectorAll('.pg').forEach((x, j) => x.classList.toggle('on', j === i));
  if (i === 1) rel();
}
window.trocarAba = trocarAba;

/**
 * Exibir Relatório
 */
function rel() {
  const tot = E.length;
  const fin = E.filter(p => p.col === 'final');
  const ag = fin.filter(p => p.res === 'agendou').length;
  const si = fin.filter(p => p.res === 'sem-interesse').length;
  const sr = fin.filter(p => p.res === 'sem-resposta').length;
  const pr = fin.filter(p => p.res === 'procedimento').length;
  const andamento = E.filter(p => ['ligar','contato','agendado'].includes(p.col)).length;
  const lig = E.reduce((a, p) => a + (p.tent || 0), 0);
  const tx = fin.length ? Math.round((ag / fin.length) * 100) : 0;
  const pct = n => tot ? Math.round((n / tot) * 100) : 0;
  const br = (lb, n, cor) => `<div class="brow"><span>${lb}</span><div class="btrack"><div class="bfill" style="width:${pct(n)}%;background:${cor}"></div></div><span class="bnum">${n}</span></div>`;
  
  const rows = [...E].sort((a, b) => {
    const o = { final: 0, agendado: 1, contato: 2, ligar: 3 };
    return (o[a.col] ?? 9) - (o[b.col] ?? 9);
  }).map(p => {
    const cm = { final: { agendou: 'bag', 'sem-interesse': 'bsi', 'sem-resposta': 'bsr', procedimento: 'bpr' }, agendado: 'bag', contato: '', ligar: '' };
    const lm = { final: { agendou: 'Agendou', 'sem-interesse': 'Sem Interesse', 'sem-resposta': 'Sem Resposta', procedimento: 'Já Realizou' }, agendado: 'Agendado', contato: 'Em Contato', ligar: 'Para Ligar' };
    const cc = p.col === 'final' ? (cm.final[p.res] || '') : cm[p.col] || '';
    const cl = p.col === 'final' ? (lm.final[p.res] || 'Finalizado') : lm[p.col];
    return `<tr><td style="font-weight:500">${p.nome}</td><td>${p.proc}</td><td style="font-weight:700;color:var(--csu)">${p.valor}</td><td style="text-align:center">${p.tent || 0}</td><td><span class="bdg ${cc}">${cl}</span></td><td style="color:var(--cts)">${p.dt || '—'}</td></tr>`;
  }).join('');

  document.getElementById('rbody').innerHTML = `
    <div class="rh"><span class="mi" style="color:var(--cp)">bar_chart</span> Relatório da Diva — Retorno de Pacientes</div>
    <div class="kgrid">
      <div class="kcard kcdb"><span class="kl">Total</span><span class="kv">${tot}</span><span class="ks">Pacientes</span></div>
      <div class="kcard kcye"><span class="kl">Em Andamento</span><span class="kv">${andamento}</span><span class="ks">Pacientes</span></div>
      <div class="kcard kcgr"><span class="kl">Agendaram</span><span class="kv">${ag}</span><span class="ks">Pacientes</span></div>
      <div class="kcard kcy"><span class="kl">Finalizados</span><span class="kv">${fin.length}</span><span class="ks">Contatos</span></div>
      <div class="kcard kcgr"><span class="kl">Conversão</span><span class="kv">${tx}%</span><span class="ks">dos finalizados</span></div>
      <div class="kcard kcbl"><span class="kl">Ligações</span><span class="kv">${lig}</span><span class="ks">Total feitas</span></div>
    </div>
    <div class="ccard">
      <div class="ccard-hd"><h3>Distribuição dos Pacientes</h3><span style="font-size:11px;color:var(--cts)">Atualizado em tempo real</span></div>
      ${br('Para Ligar', E.filter(p => p.col === 'ligar').length, '#7E57C2')}
      ${br('Em Contato', E.filter(p => p.col === 'contato').length, 'var(--cfu)')}
      ${br('Agendados', E.filter(p => p.col === 'agendado').length, 'var(--cag)')}
      ${br('Agendou', ag, 'var(--cag)')}
      ${br('Já Realizou', pr, 'var(--cop)')}
      ${br('Sem Interesse', si, 'var(--cre)')}
      ${br('Sem Resposta', sr, '#9E9E9E')}
    </div>
    <div class="twrap">
      <table><thead><tr><th>Paciente</th><th>Procedimento</th><th>Valor</th><th>Tentativas</th><th>Status</th><th>Data</th></tr></thead>
      <tbody>${rows}</tbody></table>
    </div>`;
}

// ─── INÍCIO ────────────────────────────────────────────────────────────────
updS();
init();
window.render = render;

// ─── RESIZER (AJUSTE DE LARGURA) ───────────────────────────────────────────
const resizer = document.getElementById('resizer');
const sp = document.querySelector('.sp');
let isResizing = false;

if (resizer && sp) {
  resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.body.style.cursor = 'col-resize';
    resizer.classList.add('active');
    document.body.style.userSelect = 'none'; // Evita selecionar texto ao arrastar
  });

  window.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const minWidth = 280; // Mínimo para o roteiro
    const maxWidth = window.innerWidth - 400; // Mínimo para o Kanban
    let newWidth = e.clientX;
    if (newWidth < minWidth) newWidth = minWidth;
    if (newWidth > maxWidth) newWidth = maxWidth;
    sp.style.width = newWidth + 'px';
  });

  window.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      resizer.classList.remove('active');
      document.body.style.userSelect = '';
    }
  });
}

// ─── RELÓGIO (HORÁRIO DE BRASÍLIA) ───────────────────────────────────────
const clockEl = document.getElementById('liveClock');
if (clockEl) {
  const updateClock = () => {
    const d = new Date();
    clockEl.textContent = d.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  updateClock(); // Chama imediatamente
  setInterval(updateClock, 1000);
}
