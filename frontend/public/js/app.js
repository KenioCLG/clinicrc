import ClinicrcApiClient from './api-client.js';

// XSS protection — escapa HTML em dados do usuário
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

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
let activeProc = null; // filtro de procedimento ativo

// Mostra nome da clínica logada no header
const clinicName = localStorage.getItem('clinicrc_clinic');
const clinicEl = document.getElementById('clinicNameDisplay');
if (clinicEl && clinicName) clinicEl.textContent = clinicName;

// Função de logout global
window.doLogout = () => {
  localStorage.clear();
  window.location.href = 'index.html';
};

// Função oculta para resetar tentativas
window._devReset = async () => {
  const pwd = prompt("Senha de desenvolvedor para resetar testes:");
  if (pwd !== "kenio123") {
    if (pwd) showToast("Senha incorreta", "er");
    return;
  }
  if (!confirm("Isso vai zerar as tentativas de todos os pacientes DESTA CLÍNICA e voltar para 'ligar'. Continuar?")) return;
  
  try {
    const token = localStorage.getItem('clinicrc_token');
    const res = await fetch('/api/patients/dev/reset', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password: pwd })
    });
    
    if (!res.ok) {
      const err = await res.json().catch(()=>({}));
      throw new Error(err.error || 'Erro ao resetar');
    }
    
    const data = await res.json();
    showToast(`Base resetada! (${data.changes} pacientes)`, 'ok');
    
    // Atualiza base local e re-renderiza
    setTimeout(() => {
      window.location.reload();
    }, 1500);
    
  } catch (err) {
    showToast("Erro: " + err.message, "er");
  }
};

let maxAttempts = 1;
let easyMDE = null;

// ── VERSÃO DO SISTEMA ─────────────────────────────────────────────────────────
const APP_VERSION = 'v1.2';
const VER_KEY = 'clinicrc_ver';

// Toggle Menu Mobile
window.toggleMobileMenu = function() {
  const nav = document.getElementById('hdrNav');
  const overlay = document.getElementById('mobileOverlay');
  if(nav) nav.classList.toggle('open');
  if(overlay) overlay.classList.toggle('open');
};

(function initVersion() {
  const verEl = document.getElementById('verNum');
  const dotEl = document.getElementById('verDot');
  if (verEl) verEl.textContent = APP_VERSION;
  const stored = localStorage.getItem(VER_KEY);
  if (stored && stored !== APP_VERSION) {
    // Nova versão detectada — indica update pendente
    if (dotEl) dotEl.classList.add('update');
    const btn = document.getElementById('menuVersion');
    if (btn) btn.title = `🔄 Nova versão disponível! Clique para atualizar.`;
    btn?.addEventListener('click', () => {
      localStorage.setItem(VER_KEY, APP_VERSION);
      dotEl?.classList.remove('update');
      window.location.reload(true);
    });
  } else {
    localStorage.setItem(VER_KEY, APP_VERSION);
  }
})();

// ── SINO DE NOTIFICAÇÕES / RETORNOS AGENDADOS ─────────────────────────────────
const RETORNOS_KEY = 'clinicrc_retornos';
let retornos = JSON.parse(localStorage.getItem(RETORNOS_KEY) || '[]');
let retornoTargetId = null;

function saveRetornos() {
  localStorage.setItem(RETORNOS_KEY, JSON.stringify(retornos));
}

function renderBell() {
  const list = document.getElementById('bellList');
  const count = document.getElementById('bellCount');
  if (!list) return;
  const agora = Date.now();
  const ativos = retornos.filter(r => r.dt > agora);
  const vencidos = retornos.filter(r => r.dt <= agora);
  if (!count) return;
  count.style.display = retornos.length ? 'flex' : 'none';
  count.textContent = retornos.length;
  if (!retornos.length) {
    list.innerHTML = '<div class="bell-empty">Nenhum retorno agendado</div>';
    return;
  }
  const fmt = (ts) => new Date(ts).toLocaleString('pt-BR', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  list.innerHTML = [...vencidos.map(r =>
    `<div class="bell-item bell-item-alerta" style="background:#FEF2F2;">
      <span class="bell-item-nome">⏰ ${esc(r.nome)}</span>
      <span class="bell-item-time" style="color:#EF4444;">Agora! — ${fmt(r.dt)}</span>
      ${r.obs ? `<span class="bell-item-obs">${esc(r.obs)}</span>` : ''}
      <button onclick="window.removerRetorno('${esc(r.id)}')" style="align-self:flex-end;font-size:10px;border:none;background:none;color:#EF4444;cursor:pointer;margin-top:4px;">Ja liguei</button>
    </div>`
  ), ...ativos.map(r =>
    `<div class="bell-item">
      <span class="bell-item-nome">${esc(r.nome)}</span>
      <span class="bell-item-time">${fmt(r.dt)}</span>
      ${r.obs ? `<span class="bell-item-obs">${esc(r.obs)}</span>` : ''}
      <button onclick="window.removerRetorno('${esc(r.id)}')" style="align-self:flex-end;font-size:10px;border:none;background:none;color:var(--cts);cursor:pointer;margin-top:4px;">Remover</button>
    </div>`
  )].join('');
}

// Verifica retornos vencidos a cada 30s
setInterval(() => { renderBell(); }, 30000);

window.toggleBell = () => {
  const panel = document.getElementById('bellPanel');
  if (!panel) return;
  panel.classList.toggle('on');
  renderBell();
};

window.abrirModalRetorno = (id) => {
  retornoTargetId = id;
  const p = E.find(x => x.id === id);
  if (!p) return;
  document.getElementById('retornoNomePac').innerHTML = `<span class="mi" style="font-size:16px;color:var(--cp);vertical-align:middle;margin-right:6px;">phone</span>${esc(p.nome)}`;
  document.getElementById('retornoDatetime').value = '';
  document.getElementById('retornoObs').value = '';
  
  const preview = document.getElementById('retornoPreview');
  if (preview) {
    preview.textContent = 'Selecione um horário acima...';
    preview.classList.remove('active');
  }
  
  document.getElementById('modalRetorno').classList.add('on');
};

window._onRetDateChange = () => {
  const val = document.getElementById('retornoDatetime').value;
  const preview = document.getElementById('retornoPreview');
  if (!preview) return;
  
  if (!val) {
    preview.textContent = 'Selecione um horário acima...';
    preview.classList.remove('active');
    return;
  }
  
  const date = new Date(val);
  if (isNaN(date.getTime())) {
    preview.textContent = 'Data inválida';
    preview.classList.remove('active');
    return;
  }
  
  const wDays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  const day = date.getDate().toString().padStart(2, '0');
  const wDay = wDays[date.getDay()];
  const month = months[date.getMonth()];
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  // Checa se a data é hoje ou amanhã
  const hoje = new Date();
  const amanha = new Date();
  amanha.setDate(hoje.getDate() + 1);
  
  let refDay = `${wDay}, ${day} de ${month}`;
  if (date.toDateString() === hoje.toDateString()) {
    refDay = 'Hoje';
  } else if (date.toDateString() === amanha.toDateString()) {
    refDay = 'Amanhã';
  }
  
  preview.innerHTML = `<span class="mi" style="font-size:14px;color:var(--cp);">event_available</span> Agendando para: <strong>${refDay} às ${hours}:${minutes}</strong>`;
  preview.classList.add('active');
};

window._setRetPreset = (type) => {
  const now = new Date();
  let target = new Date();
  
  if (type === '1h') {
    target.setHours(now.getHours() + 1);
  } else if (type === '2h') {
    target.setHours(now.getHours() + 2);
  } else if (type === 'amanha-m') {
    target.setDate(now.getDate() + 1);
    target.setHours(9, 0, 0, 0);
  } else if (type === 'amanha-t') {
    target.setDate(now.getDate() + 1);
    target.setHours(14, 0, 0, 0);
  } else if (type === 'segunda-m') {
    const currentDay = now.getDay();
    const daysToAdd = (currentDay === 0 ? 1 : 8 - currentDay);
    target.setDate(now.getDate() + daysToAdd);
    target.setHours(9, 0, 0, 0);
  }
  
  const year = target.getFullYear();
  const month = (target.getMonth() + 1).toString().padStart(2, '0');
  const day = target.getDate().toString().padStart(2, '0');
  const hours = target.getHours().toString().padStart(2, '0');
  const minutes = target.getMinutes().toString().padStart(2, '0');
  
  const formatted = `${year}-${month}-${day}T${hours}:${minutes}`;
  const input = document.getElementById('retornoDatetime');
  if (input) {
    input.value = formatted;
    window._onRetDateChange();
  }
};

window.salvarRetorno = () => {
  const dt = document.getElementById('retornoDatetime').value;
  const obs = document.getElementById('retornoObs').value.trim();
  if (!dt) { showToast('Selecione data e hora!', 'er'); return; }
  const p = E.find(x => x.id === retornoTargetId);
  if (!p) return;
  retornos.push({ id: Date.now().toString(), nome: p.nome, pacId: p.id, dt: new Date(dt).getTime(), obs });
  saveRetornos();
  renderBell();
  document.getElementById('modalRetorno').classList.remove('on');
  showToast(`Retorno agendado para ${p.nome}!`, 'ok');
};

window.removerRetorno = (rid) => {
  retornos = retornos.filter(r => r.id !== rid);
  saveRetornos();
  renderBell();
};

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
  tbar.classList.remove('tbar-active');
  // Script único (Master): a tentativa não muda o roteiro, só o contador no card
  tbar.innerHTML = `
    <div class="tbar-master">
      <span class="mi" style="font-size:16px;color:var(--cp)">record_voice_over</span>
      <span class="tlbl" style="color:var(--ct);font-weight:600;">Roteiro Master</span>
      <span class="tbar-hint">· use os indicadores no cartão do paciente para registrar cada tentativa</span>
    </div>`;
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
  if (!t) return;
  
  // Ícones do Material Icons para dar contexto visual à notificação
  let iconName = 'check_circle';
  if (type === 'er') iconName = 'error';
  else if (type === 'info') iconName = 'info';
  
  t.innerHTML = `<span class="mi" style="font-size:16px;">${iconName}</span><span>${msg}</span>`;
  t.className = 'toast ' + type + ' on';
  
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove('on');
  }, 2500);
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
  E.forEach(p => {
    const matchSearch = !q || p.nome.toLowerCase().includes(q);
    const matchProc   = !activeProc || getProcCategories(p.proc).includes(activeProc);
    if (matchSearch && matchProc) C[p.col]?.push(p);
  });
  const ids = { ligar: 'c1', contato: 'c2', agendado: 'c3', final: 'c4' };
  
  ['ligar','contato','agendado','final'].forEach(c => {
    document.getElementById(ids[c]).textContent = E.filter(p => p.col === c).length;
    const el = document.getElementById('col-' + c);
    el.innerHTML = C[c].length ? C[c].map(p => mkC(p)).join('') : `<div class="empty-c">Nenhum paciente aqui</div>`;
  });
  
  document.getElementById('ki1').textContent = E.filter(p => p.col === 'contato').length;
  document.getElementById('ki2').textContent = E.filter(p => p.col === 'agendado').length;
  document.getElementById('ki3').textContent = E.filter(p => p.col === 'final').length;
  
  renderProcFilter();
}

// Remove códigos numéricos de procedimentos (ex: "2020 - Tratamento" → "Tratamento")
function cleanProc(raw) {
  if (!raw) return '';
  return raw
    .split(',')
    .map(s => s.trim().replace(/^\d{4}\s*[-–]\s*/, '').trim())
    .filter(Boolean)
    .join(', ');
}

// Agrupa e categoriza os procedimentos para simplificar os filtros
function getProcCategories(raw) {
  if (!raw) return [];
  return raw
    .split(',')
    .map(s => {
      const clean = s.trim().replace(/^\d{4}\s*[-–]\s*/, '').trim();
      if (!clean) return '';
      const lower = clean.toLowerCase();
      
      // Regras de agrupamento (leitura inteligente do texto)
      if (lower.includes('orto')) return 'Ortodontia';
      if (lower.includes('implan')) return 'Implante';
      if (lower.includes('prot') || lower.includes('prót')) return 'Prótese';
      if (lower.includes('canal') || lower.includes('endo')) return 'Canal';
      if (lower.includes('limpez') || lower.includes('profila') || lower.includes('tartara') || lower.includes('raspag')) return 'Limpeza';
      if (lower.includes('restaur') || lower.includes('resina') || lower.includes('obtura')) return 'Restauração';
      if (lower.includes('claream')) return 'Clareamento';
      if (lower.includes('cirurg') || lower.includes('extra') || lower.includes('siso')) return 'Cirurgia/Extração';
      if (lower.includes('avalia') || lower.includes('consul') || lower.includes('diagnos')) return 'Avaliação';
      
      // Encurta outros textos longos: pega no máximo 2 palavras
      const words = clean.split(/\s+/).filter(Boolean);
      if (words.length > 2) {
        return words.slice(0, 2).join(' ');
      }
      return words.join(' ');
    })
    .filter((v, i, self) => v && self.indexOf(v) === i);
}

// ── FILTRO DE PROCEDIMENTOS ─────────────────────────────────────────────────
// Paleta de cores para os chips — rotativa
const PF_COLORS = [
  '#7C3AED', '#0284C7', '#0F766E', '#B45309', '#BE185D',
  '#1D4ED8', '#047857', '#9333EA', '#C2410C', '#0369A1',
];

function renderProcFilter() {
  const chips = document.getElementById('pfChips');
  if (!chips) return;

  // Agrupa procedimentos categorizados e conta pacientes
  const map = new Map(); // category → count
  E.forEach(p => {
    const cats = getProcCategories(p.proc);
    cats.forEach(cat => {
      if (cat) map.set(cat, (map.get(cat) || 0) + 1);
    });
  });

  // Ordena por volume (maior primeiro)
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);

  // Exibe a barra de filtro apenas se o toggle estiver ativo e houver procedimentos
  const bar = document.getElementById('procFilter');
  if (bar) bar.style.display = (window.isFilterPanelOpen && sorted.length > 0) ? 'flex' : 'none';

  // Atualiza o estado visual do botão fixo de limpar filtros
  const clearBtn = document.getElementById('pfClearBtn');
  if (clearBtn) {
    clearBtn.classList.toggle('active', !!activeProc);
  }

  // Gera os chips das categorias de procedimentos
  chips.innerHTML = sorted.map(([proc, count], i) => {
    const color = PF_COLORS[i % PF_COLORS.length];
    const isOn = activeProc === proc;
    return `<button class="pf-chip${isOn ? ' on' : ''}" style="background:${color}" onclick="window._toggleProc('${proc.replace(/'/g, "\\'")}')"
      title="Filtrar por: ${proc}">
      <span class="mi" style="font-size:13px">local_hospital</span>
      ${proc}
      <span class="pf-count">${count}</span>
    </button>`;
  }).join('');
}

window.isFilterPanelOpen = false;

window._toggleFilterPanel = () => {
  window.isFilterPanelOpen = !window.isFilterPanelOpen;
  const btn = document.getElementById('toggleFilterBtn');
  if (btn) {
    if (window.isFilterPanelOpen) {
      btn.style.color = 'var(--cp)';
      btn.style.borderColor = 'var(--cp)';
      btn.style.background = 'rgba(236,103,38,0.1)';
    } else {
      btn.style.color = '';
      btn.style.borderColor = '';
      btn.style.background = '';
    }
  }
  renderProcFilter();
};

window._toggleProc = (proc) => {
  activeProc = activeProc === proc ? null : proc;
  render();
};

window._clearProcFilter = () => {
  activeProc = null;
  render();
};

function mkC(p) {
  const sel = pA?.id === p.id ? 'sel' : '';
  const t = p.tent || 0;

  // Indicador de tentativas com progresso visual
  const tentLabel = t === 0 ? 'Nenhuma tentativa' : `${t}ª tentativa realizada`;
  const tentColor = t === 0 ? '#9CA3AF' : t >= maxAttempts ? '#EF4444' : '#EC6726';
  let d = `<div class="trow"><span class="tlb">Tent.:</span>`;
  for (let i = 1; i <= maxAttempts; i++) {
    let c = '';
    if (i <= t) {
      c = 'dn';
    } else if (i === t + 1 && (t > 0 || p.col !== 'ligar')) {
      c = 'nx';
    }
    d += `<div class="dot ${c}" onclick="window._mT('${p.id}',${i},event)" title="Registrar ${i}ª tentativa">${i}</div>`;
  }
  d += `<span class="tent-lbl" style="color:${tentColor}">${tentLabel}</span></div>`;

  let chip = '';
  if (p.res) {
    const m = { agendou: ['bag','Agendou'], procedimento: ['bpr','Já Realizou'], 'sem-interesse': ['bsi','Sem Interesse'], 'sem-resposta': ['bsr','Sem Resposta'] };
    const [cl, lb] = m[p.res] || ['', ''];
    chip = `<span class="bdg ${cl}">${lb}</span><br>`;
  }

  // Procedimentos: exibe limpo, original no tooltip
  const procLimpo = cleanProc(p.proc);
  const procTitle = p.proc || '';

  // ── Botão "Retornar" separado (linha própria, largura total) ─────────────
  let retBtn = '';
  if (p.col === 'contato' || p.col === 'agendado') {
    retBtn = `<button class="cb cbb cb-retornar" onclick="window.abrirModalRetorno('${p.id}',event)"><span class="mi" style="font-size:12px;vertical-align:middle;margin-right:4px;">event_note</span>Retornar</button>`;
  }

  let b = '';
  if (p.col === 'ligar') b = `<button class="cb cbo" onclick="window._mv('${p.id}','contato',event)">Em Contato</button><button class="cb cbg" onclick="window._mv('${p.id}','agendado',event)">Agendar</button><button class="cb cbgr" onclick="window._oM('${p.id}',event)">Finalizar</button>`;
  else if (p.col === 'contato') b = `<button class="cb cbg" onclick="window._mv('${p.id}','agendado',event)">Agendar</button><button class="cb cbgr" onclick="window._oM('${p.id}',event)">Finalizar</button><button class="cb" style="background:#FFF7ED;color:#92400E;border:1px solid #FED7AA;" onclick="window._mv('${p.id}','ligar',event)" title="Registrar mais uma tentativa e voltar para fila">Nova Tentativa</button>`;
  else if (p.col === 'agendado') b = `<button class="cb cbgr" onclick="window._oM('${p.id}',event)">Finalizar</button><button class="cb" style="background:#FFF7ED;color:#92400E;border:1px solid #FED7AA;" onclick="window._mv('${p.id}','ligar',event)" title="Registrar mais uma tentativa e voltar para fila">Nova Tentativa</button>`;
  else b = `<button class="cb" style="background:#FFF7ED;color:#92400E;border:1px solid #FED7AA;" onclick="window._mv('${p.id}','ligar',event)" title="Registrar mais uma tentativa e voltar para fila">Nova Tentativa</button>`;

  return `<div class="card ${sel}" onclick="window._sP('${esc(p.id)}')">
    <div class="cn">${esc(p.nome)}</div>
    <div class="ctxt" style="display:flex;align-items:center;gap:4px;"><span class="mi" style="font-size:13px;color:var(--cts);vertical-align:middle;">phone</span>${esc(p.tel)}</div>
    <span class="cp2" title="${esc(procTitle)}">${esc(procLimpo)}</span>
    <div class="cv">${esc(p.valor)}</div>
    ${d}${chip}
    <textarea id="obs-${esc(p.id)}" name="obs-${esc(p.id)}" class="cobs" placeholder="Anotações..." onclick="event.stopPropagation()" oninput="window._sO('${esc(p.id)}',this.value)">${esc(p.obs || '')}</textarea>
    ${retBtn}
    <div class="cbtns">${b}</div>
  </div>`;
}

// ─── AÇÕES EXPOSTAS AO WINDOW PARA HANDLERS INLINE ─────────────────────────
window._mv = (id, col, e) => {
  e?.stopPropagation();
  const p = E.find(x => x.id === id);
  if (!p) return;
  const updates = { col };

  if (col === 'ligar') {
    // Ao reabrir, registramos a tentativa atual e limpamos o status
    // para que o indicador reflita que estamos na próxima rodada de contato
    updates.tent = (p.tent || 0) + 1;
    updates.res = null;
  } else if (col === 'contato') {
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
  } else if (n === p.tent + 1) {
    newTent = n;
    // Move automaticamente para "Em Contato" na 1ª tentativa
    if (p.col === 'ligar') newCol = 'contato';
  }
  updatePaciente(id, { tent: newTent, col: newCol });
  if (pA?.id === id) { pA = E.find(x => x.id === id); updS(); }
};

window._sO = (id, v) => {
  clearTimeout(obsDebounce[id]);
  obsDebounce[id] = setTimeout(() => updatePaciente(id, { obs: v }), 800);
};

window._sP = (id) => {
  pA = E.find(x => x.id === id);
  tN = 1; // Sempre usa o script master único
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
  tN = 1; // Script master único — não muda com tentativas
  await updS();
}
window.selT = selT;

function updP() {
  const el = document.getElementById('pbar');
  if (!pA) {
    el.innerHTML = '';
    el.classList.add('empty');
    renderTbar();
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

  const numUrl = pA.tel ? pA.tel.replace(/[^0-9+]/g, '') : '123412312';
  const waNum = numUrl.startsWith('55') || numUrl.startsWith('+') ? numUrl.replace('+', '') : (numUrl.length >= 10 ? '55' + numUrl : numUrl);
  const waSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="14" height="14" fill="currentColor" style="margin-top:-1px"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157.1zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>`;

  const tbar = document.getElementById('tbar');
  if (tbar) {
    tbar.classList.add('tbar-active');
    tbar.innerHTML = `
      <div style="display:flex; width:100%; gap:8px;">
        <a href="tel:${numUrl}" onmouseover="this.style.filter='brightness(0.9)'" onmouseout="this.style.filter='none'" style="flex:1; background:#6B7280; color:#FFF; display:flex; align-items:center; justify-content:center; gap:6px; padding:10px; border-radius:8px; text-decoration:none; font-family:var(--font); font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; border:none; text-align:center; min-height:40px; line-height:1.2;" title="Ligação Normal">
          <span class="mi" style="font-size:18px;">phone</span> Ligar
        </a>
        <a href="https://wa.me/${waNum}" target="_blank" rel="noopener noreferrer" onmouseover="this.style.filter='brightness(0.9)'" onmouseout="this.style.filter='none'" style="flex:1; background:#25D366; color:#FFF; display:flex; align-items:center; justify-content:center; gap:6px; padding:10px; border-radius:8px; text-decoration:none; font-family:var(--font); font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; border:none; text-align:center; min-height:40px; line-height:1.2;" title="Enviar Mensagem no WhatsApp">
          ${waSvg} WhatsApp
        </a>
      </div>
    `;
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
    return `<tr><td style="font-weight:500">${esc(p.nome)}</td><td>${esc(p.proc)}</td><td style="font-weight:700;color:var(--csu)">${esc(p.valor)}</td><td style="text-align:center">${p.tent || 0}</td><td><span class="bdg ${cc}">${cl}</span></td><td style="color:var(--cts)">${p.dt || '—'}</td></tr>`;
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

// ─── RESIZER (AJUSTE DE LARGURA/ALTURA) ──────────────────────────────────────
const resizer = document.getElementById('resizer');
const sp = document.querySelector('.sp');
let isResizing = false;

if (resizer && sp) {
  const startResize = (e) => {
    isResizing = true;
    resizer.classList.add('active');
    document.body.style.userSelect = 'none'; // Evita selecionar texto ao arrastar
    if (window.innerWidth <= 1000) {
      document.body.style.cursor = 'row-resize';
    } else {
      document.body.style.cursor = 'col-resize';
    }
  };

  const doResize = (e) => {
    if (!isResizing) return;
    
    // Suporte para touch e mouse
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;

    if (window.innerWidth <= 1000) {
      // MODO MOBILE: Ajuste Vertical
      const minHeight = 60; // Colapsado (só header do roteiro)
      const maxHeight = window.innerHeight - 150; // Deixa espaço para o Kanban
      let newHeight = clientY - 56; // Abate a altura do header principal (56px)
      
      if (newHeight < minHeight) newHeight = minHeight;
      if (newHeight > maxHeight) newHeight = maxHeight;
      
      sp.style.height = newHeight + 'px';
      sp.style.width = '100%'; // Garante que a largura fica 100%
    } else {
      // MODO DESKTOP: Ajuste Horizontal
      const minWidth = 280; // Mínimo para o roteiro
      const maxWidth = window.innerWidth - 400; // Mínimo para o Kanban
      let newWidth = clientX;
      
      if (newWidth < minWidth) newWidth = minWidth;
      if (newWidth > maxWidth) newWidth = maxWidth;
      
      sp.style.width = newWidth + 'px';
      sp.style.height = ''; // Remove altura fixa do mobile
    }
  };

  const stopResize = () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      resizer.classList.remove('active');
      document.body.style.userSelect = '';
    }
  };

  resizer.addEventListener('mousedown', startResize);
  resizer.addEventListener('touchstart', startResize, {passive: true});

  window.addEventListener('mousemove', doResize);
  window.addEventListener('touchmove', doResize, {passive: true});

  window.addEventListener('mouseup', stopResize);
  window.addEventListener('touchend', stopResize);
  
  // Limpa os estilos inlines aplicados quando redimensiona e depois muda a orientação
  window.addEventListener('resize', () => {
    if (window.innerWidth <= 1000) {
      sp.style.width = '100%';
    } else {
      sp.style.height = '';
      sp.style.width = '38%';
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

// ==========================================
// PWA INSTALL LOGIC (Add to Home Screen)
// ==========================================
let deferredPrompt;
const installBtn = document.getElementById('pwaInstallBtn');

// Detecta se é iOS e se já está instalado
const isIos = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
};
const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);

if (isIos() && !isInStandaloneMode() && installBtn) {
  // Para iOS, mostramos o botão e, ao clicar, ensinamos a instalar
  installBtn.style.display = 'flex';
  installBtn.addEventListener('click', () => {
    alert('Para instalar no iPhone/iPad:\n1. Toque no ícone de Compartilhar (quadrado com seta para cima) na barra do Safari.\n2. Role para baixo e selecione "Adicionar à Tela de Início".');
  });
} else {
  // Para Android / Chrome Desktop
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) {
      installBtn.style.display = 'flex';
      
      // Remove event listeners antigos clonando o botão (para evitar duplicação caso dispare várias vezes)
      const newBtn = installBtn.cloneNode(true);
      installBtn.parentNode.replaceChild(newBtn, installBtn);
      
      newBtn.addEventListener('click', async () => {
        newBtn.style.display = 'none';
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`PWA Install outcome: ${outcome}`);
        deferredPrompt = null;
      });
    }
  });
}

