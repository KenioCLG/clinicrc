import ClinicrcApiClient from './api-client.js';

// Roteiros (PNL + SPIN) idênticos ao protótipo
const ROT = {
  1:{t:"1ª Ligação — Primeiro Contato (Rapport + Situação)",b:[
    {tp:"or",lb:"🧠 TÉCNICA: RAPPORT EMPÁTICO (PNL)",h:`Tom de voz <strong>preocupado e genuíno</strong>, como quem liga para um amigo. Fale devagar. Sorria enquanto fala — muda a voz.`},
    {tp:"bl",lb:"1️⃣ ABERTURA",h:`"Olá! Aqui quem fala é a <em>Diva</em>, da <em>Clínica Andreza Paz</em>.<br><br>Estou entrando em contato para saber se está tudo bem com o(a) senhor(a), [NOME].<br><br>Fiquei preocupada ao ver que alguns procedimentos clínicos estão em aberto — queria saber se está tudo bem mesmo."`},
    {tp:"",lb:"⏸ 2️⃣ ESCUTAR ATIVAMENTE (PNL)",h:`<strong>Faça uma pausa. Deixe o paciente falar.</strong> Não interrompa.<br><strong>Espelhe</strong> palavras que ele usar (mesma linguagem = conexão).`},
    {tp:"gr",lb:"🟢 CAMINHO A — Paciente abre para reagendar",h:`"Certo, compreendo perfeitamente.<br><br>Então vamos <strong>refazer a sua avaliação de forma totalmente gratuita!</strong><br><br>Quando podemos agendar — <strong>amanhã ou na próxima semana?</strong>"`},
    {tp:"ye",lb:"🟡 CAMINHO B — Paciente recusa o tratamento",h:`"Entendo... Mas podemos fazer uma <strong>reavaliação gratuita</strong>, sem custo nenhum.<br><br>💎 E temos <strong>limpeza por apenas R$ 180,00</strong>!"`},
    {tp:"bl",lb:"🔵 CAMINHO C — Já fez em outro local",h:`"Que bom! 💎 Temos <strong>limpeza por R$ 180,00</strong> — ótimo para manutenção!"`},
    {tp:"",lb:"🔚 ENCERRAMENTO",h:`"Muito obrigada, [NOME]! Tenha um ótimo dia!"`},
  ]},
  2:{t:"2ª Ligação — Segundo Contato (Rapport + Problema)",b:[
    {tp:"or",lb:"🧠 TÉCNICA: CONTINUIDADE + PROBLEMA (SPIN)",h:`Retome como conversa interrompida. Use <strong>"novamente"</strong> para criar familiaridade.`},
    {tp:"bl",lb:"1️⃣ ABERTURA",h:`"Olá, [NOME]! Aqui é a Diva <strong>novamente</strong>, da Clínica Andreza Paz.<br><br>Liguei outro dia e vim saber se precisa de alguma coisa — aquele tratamento ainda está em aberto aqui."`},
    {tp:"",lb:"⏸ 2️⃣ ESCUTAR ATIVAMENTE",h:`<strong>Pausa. Deixe o paciente responder.</strong> Preste atenção no tom de voz.`},
    {tp:"gr",lb:"🟢 CAMINHO A — Reagendar",h:`"<strong>Reavaliação totalmente gratuita</strong>! Amanhã ou semana que vem?"`},
    {tp:"ye",lb:"🟡 CAMINHO B — Recusa",h:`"<strong>Reavaliação gratuita</strong> + <strong>limpeza R$ 180,00</strong> — continua disponível!"`},
    {tp:"bl",lb:"🔵 CAMINHO C — Outro local",h:`"Que maravilha! 💎 <strong>Limpeza R$ 180,00</strong> — manutenção 6 em 6 meses!"`},
    {tp:"",lb:"🔚 ENCERRAMENTO",h:`"Obrigada, [NOME]! Ótimo dia!"`},
  ]},
  3:{t:"3ª Ligação — Terceira Tentativa (Implicação)",b:[
    {tp:"or",lb:"🧠 TÉCNICA: IMPLICAÇÃO SUAVE (SPIN)",h:`Traga consciência das <strong>consequências de não tratar</strong> — mas como amigo que se preocupa.`},
    {tp:"bl",lb:"1️⃣ ABERTURA",h:`"Boa [manhã/tarde], [NOME]! Aqui é a Diva, da Clínica Andreza Paz.<br><br>Estou ligando <strong>mais uma vez</strong> porque realmente me preocupo — <em>[PROCEDIMENTO]</em> continua em aberto."`},
    {tp:"",lb:"⏸ 2️⃣ ESCUTAR",h:`<strong>Silêncio estratégico.</strong> Deixe espaço para falar.`},
    {tp:"gr",lb:"🟢 CAMINHO A — Reagendar",h:`"<strong>Reavaliação gratuita</strong> agora mesmo! Amanhã ou semana que vem?"`},
    {tp:"ye",lb:"🟡 CAMINHO B — Recusa",h:`"🏥 <strong>Reavaliação gratuita</strong> + 💎 <strong>Limpeza R$ 180,00</strong> — ambas disponíveis!"`},
    {tp:"bl",lb:"🔵 CAMINHO C — Outro local",h:`"💎 <strong>Limpeza R$ 180,00</strong> — cada 6 meses faz toda diferença!"`},
    {tp:"",lb:"🔚 ENCERRAMENTO",h:`"Obrigada, [NOME]! Cuide-se muito bem!"`},
  ]},
  4:{t:"4ª Ligação — Quarta Tentativa (Need-Payoff)",b:[
    {tp:"or",lb:"🧠 TÉCNICA: NEED-PAYOFF + ACOLHIMENTO",h:`Foco no <strong>benefício real</strong>. Valide a hesitação antes de oferecer a solução.`},
    {tp:"bl",lb:"1️⃣ ABERTURA",h:`"Olá, [NOME]! Sou a Diva da Clínica Andreza Paz.<br><br>Sei que já liguei algumas vezes — desculpe o incômodo. Me importo com o(a) senhor(a) e não queria deixar essa oportunidade passar."`},
    {tp:"",lb:"⏸ 2️⃣ VALIDAR OBJEÇÃO",h:`<em>"Entendo perfeitamente, muita gente sente isso..."</em><br>Depois conduza com calma.`},
    {tp:"gr",lb:"🟢 CAMINHO A — Reagendar",h:`"<strong>Reavaliação gratuita</strong> — sem compromisso. Amanhã ou semana que vem?"`},
    {tp:"ye",lb:"🟡 CAMINHO B — Preocupa com $$",h:`"<strong>Reavaliação 100% gratuita</strong> + <strong>parcelamento</strong> disponível.<br>💎 <strong>Limpeza R$ 180,00</strong> também!"`},
    {tp:"bl",lb:"🔵 CAMINHO C — Outro local",h:`"💎 <strong>Limpeza R$ 180,00</strong> — melhor preço da região! Fica o convite."`},
    {tp:"",lb:"🔚 ENCERRAMENTO",h:`"Obrigada, [NOME]! Estarei aqui sempre. Ótimo dia!"`},
  ]},
  5:{t:"5ª Ligação — Última Tentativa (Encerramento Positivo)",b:[
    {tp:"or",lb:"🧠 TÉCNICA: ÚLTIMO CONTATO + PORTA ABERTA",h:`Encerre sem frustração. Deixe uma <strong>boa lembrança</strong> — aumenta chance de retorno espontâneo.`},
    {tp:"bl",lb:"1️⃣ ABERTURA",h:`"Olá, [NOME]! Aqui é a Diva, Clínica Andreza Paz.<br><br>Esta é minha <strong>última ligação</strong> sobre o tratamento. Queria muito conversar uma última vez."`},
    {tp:"",lb:"⏸ 2️⃣ ESCUTAR",h:`<strong>Última chance de ouvir.</strong> Dê tempo, não pressione.`},
    {tp:"gr",lb:"🟢 CAMINHO A — Reagendar",h:`"<strong>Reavaliação gratuita</strong> agora! Amanhã ou semana que vem?"`},
    {tp:"ye",lb:"🟡 CAMINHO B — Recusa",h:`"🏥 <strong>Reavaliação gratuita</strong> + 💎 <strong>Limpeza R$ 180,00</strong> — sempre disponíveis. Se mudar de ideia, é só ligar!"`},
    {tp:"bl",lb:"🔵 CAMINHO C — Outro local",h:`"💎 <strong>Limpeza R$ 180,00</strong> para manutenção — conte com a gente!"`},
    {tp:"",lb:"🔚 ENCERRAMENTO COM CARINHO",h:`"Cuide-se muito, [NOME]! A <strong>Clínica Andreza Paz</strong> estará sempre de braços abertos. Lindo dia! 😊"`},
  ]},
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

/**
 * Inicializar a aplicação
 */
async function init() {
  try {
    setSyncStatus('ok', 'Carregando dados...');
    E = await api.getPatients();
    window._E = E; // Sincroniza referência global
    setSyncStatus('ok', `Conectado · ${E.length} pacientes`);
  } catch (err) {
    console.warn('Erro ao conectar na API. Utilizando localStorage como fallback...', err);
    fallbackMode();
  } finally {
    document.getElementById('loadingOverlay').classList.add('hide');
    render();
  }
}

/**
 * Fallback local offline (caso o Worker backend esteja fora do ar)
 */
function fallbackMode() {
  setSyncStatus('err', 'Modo Offline (Local)');
  try {
    const s = localStorage.getItem('clv_andreza');
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
  try { localStorage.setItem('clv_andreza', JSON.stringify(E)); } catch(e) {}
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
  for (let i = 1; i <= 5; i++) {
    const c = i <= p.tent ? 'dn' : (i === p.tent + 1 ? 'nx' : '');
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
  updatePaciente(id, { col });
};

window._mT = (id, n, e) => {
  e?.stopPropagation();
  const p = E.find(x => x.id === id);
  if (!p) return;
  let newTent = p.tent, newCol = p.col;
  if (n === p.tent) newTent = p.tent - 1;
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

function selT(n) {
  tN = n;
  document.querySelectorAll('.tbtn').forEach((b, i) => b.classList.toggle('on', i + 1 === n));
  updS();
}
window.selT = selT;

function updP() {
  const el = document.getElementById('pbar');
  if (!pA) return;
  el.classList.remove('empty');
  el.innerHTML = `<span class="mi" style="color:var(--cp)">person</span><div><strong>${pA.nome}</strong><span>${pA.proc} · ${pA.valor} · ${pA.tent || 0} tentativa(s)</span></div>`;
  updS();
}

function updS() {
  const el = document.getElementById('sbody');
  const r = ROT[tN];
  if (!r) return;
  const nm = pA ? pA.nome.split(' ')[0] : '[NOME]';
  const pr = pA ? pA.proc : '[PROCEDIMENTO]';
  let h = `<div class="rt">${r.t}</div>`;
  r.b.forEach(b => {
    let txt = b.h.replace(/\[NOME\]/g, `<em>${nm}</em>`).replace(/\[PROCEDIMENTO\]/g, `<em>${pr}</em>`);
    h += `<div class="blk ${b.tp}"><div class="blk-l">${b.lb}</div><div class="blk-b">${txt}</div></div>`;
  });
  el.innerHTML = h; el.scrollTop = 0;
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
    <button class="breset" onclick="window._resetar()"><span class="mi" style="font-size:15px">warning</span> Resetar todos os dados</button>
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

window._resetar = async () => {
  if (!confirm('Apagar todo o progresso de TODOS os usuários? Esta ação é irreversível.')) return;
  try {
    setSyncStatus('ok', 'Resetando...');
    const result = await api.resetDatabase();
    E = result.patients;
    setSyncStatus('ok', 'Conectado via Worker API');
    showToast('Dados resetados com sucesso!', 'ok');
  } catch (err) {
    setSyncStatus('err', 'Erro ao resetar');
    showToast('Erro ao redefinir base online', 'er');
  }
  pA = null;
  render();
};

// ─── INÍCIO ────────────────────────────────────────────────────────────────
updS();
init();
window.render = render;
