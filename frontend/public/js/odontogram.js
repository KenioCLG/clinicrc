class Odontogram {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.state = {};
    this.onStateChange = null;

    this.teethLayout = {
      adult: {
        top:    [18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28],
        bottom: [48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38]
      },
      kid: {
        top:    [55,54,53,52,51, 61,62,63,64,65],
        bottom: [85,84,83,82,81, 71,72,73,74,75]
      }
    };

    this.anteriorTeeth = new Set([
      11,12,13,21,22,23,31,32,33,41,42,43,
      51,52,53,61,62,63,71,72,73,81,82,83
    ]);

    this.statusColors = {
      saudavel: '',
      carie: 'st-carie',
      restaurado: 'st-restaurado'
    };

    this.statusCycle = ['saudavel', 'carie', 'restaurado'];
    this.init();
  }

  init() {
    this.render();
    this.setupEventDelegation();
  }

  isAnterior(id) { return this.anteriorTeeth.has(Number(id)); }
  hasAnatomy(id) { return !!document.getElementById('anat-' + id); }

  render() {
    let html = '<div class="odonto-wrapper">';

    // Legend
    html += `<div class="odonto-legend">
      <span class="odonto-legend-item"><span class="odonto-legend-sw" style="background:#fff;border:1.5px solid #CBD5E1;"></span>Saudavel</span>
      <span class="odonto-legend-item"><span class="odonto-legend-sw" style="background:#EF4444;"></span>Carie</span>
      <span class="odonto-legend-item"><span class="odonto-legend-sw" style="background:#3B82F6;"></span>Restaurado</span>
      <span class="odonto-legend-item"><span class="odonto-legend-sw" style="background:#E2E8F0;border:1.5px solid #94A3B8;"></span>Ausente</span>
    </div>`;

    const renderTooth = (id, isTopArch) => {
      if (!this.state[id]) {
        this.state[id] = { T: 'saudavel', B: 'saudavel', L: 'saudavel', R: 'saudavel', C: 'saudavel', ausente: false };
      }
      const s = this.state[id];
      const isAnt = this.isAnterior(id);
      const hasAnat = this.hasAnatomy(id);
      const cls = ['tooth-col', s.ausente ? 'ausente' : '', isAnt ? 'tooth-ant' : ''].filter(Boolean).join(' ');
      const centerLabel = isAnt ? 'Incisal' : 'Oclusal';

      const label = `<span class="tooth-num">${id}</span>`;

      const faceGrid = `<svg class="tooth-faces" viewBox="0 0 40 40">
        <g clip-path="url(#tooth-clip)">
          <use href="#tooth-face-T" class="face face-T ${this.statusColors[s.T] || ''}" data-face="T"><title>Vestibular</title></use>
          <use href="#tooth-face-B" class="face face-B ${this.statusColors[s.B] || ''}" data-face="B"><title>Lingual/Palatina</title></use>
          <use href="#tooth-face-L" class="face face-L ${this.statusColors[s.L] || ''}" data-face="L"><title>Mesial</title></use>
          <use href="#tooth-face-R" class="face face-R ${this.statusColors[s.R] || ''}" data-face="R"><title>Distal</title></use>
          <use href="#tooth-face-C" class="face face-C ${this.statusColors[s.C] || ''}" data-face="C"><title>${centerLabel}</title></use>
        </g>
      </svg>`;

      // Anatomy uses the symbol's own viewBox (not overridden)
      const anatSvg = hasAnat
        ? `<svg class="tooth-anat"><use href="#anat-${id}" width="100%" height="100%"/></svg>`
        : '<div class="tooth-anat-placeholder"></div>';

      const absentBtn = `<button class="btn-ausente" data-action="ausente" title="Marcar Ausente">
        <svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>`;

      // Figma layout:
      // Top arch: number → 5-face grid → anatomy (roots up, crown toward center gap)
      // Bottom arch: anatomy (roots down, crown toward center gap) → 5-face grid → number
      if (isTopArch) {
        return `<div class="${cls}" data-id="${id}" id="tooth-wrap-${id}">
          ${label}${faceGrid}${anatSvg}${absentBtn}
        </div>`;
      } else {
        return `<div class="${cls}" data-id="${id}" id="tooth-wrap-${id}">
          ${absentBtn}${anatSvg}${faceGrid}${label}
        </div>`;
      }
    };

    const renderRow = (teethArray, isTopArch) => {
      const mid = Math.floor(teethArray.length / 2);
      let rowHtml = '<div class="odonto-row">';
      rowHtml += '<div class="odonto-quad">';
      teethArray.forEach((id, i) => {
        if (i === mid) {
          rowHtml += '</div><div class="odonto-midline"></div><div class="odonto-quad">';
        }
        rowHtml += renderTooth(id, isTopArch);
      });
      rowHtml += '</div></div>';
      return rowHtml;
    };

    // Arcada Permanente
    html += '<div class="arcada-section">';
    html += '<div class="arcada-title">Permanentes</div>';
    html += renderRow(this.teethLayout.adult.top, true);
    html += '<div class="arcada-separator"></div>';
    html += renderRow(this.teethLayout.adult.bottom, false);
    html += '</div>';

    // Arcada Decidua
    html += '<div class="arcada-section">';
    html += '<div class="arcada-title">Deciduos</div>';
    html += renderRow(this.teethLayout.kid.top, true);
    html += '<div class="arcada-separator"></div>';
    html += renderRow(this.teethLayout.kid.bottom, false);
    html += '</div>';

    html += '</div>';
    this.container.innerHTML = html;
  }

  setupEventDelegation() {
    this.container.addEventListener('click', (e) => {
      const faceEl = e.target.closest('.face');
      if (faceEl) {
        const wrap = faceEl.closest('.tooth-col');
        if (!wrap) return;
        const id = wrap.getAttribute('data-id');
        const face = faceEl.getAttribute('data-face');
        if (this.state[id].ausente) return;
        this.cycleFaceStatus(id, face, faceEl);
        return;
      }
      const btn = e.target.closest('.btn-ausente');
      if (btn) {
        const wrap = btn.closest('.tooth-col');
        if (!wrap) return;
        this.toggleToothAbsence(wrap.getAttribute('data-id'), wrap);
      }
    });
  }

  cycleFaceStatus(toothId, faceId, faceEl) {
    const cur = this.state[toothId][faceId];
    const idx = this.statusCycle.indexOf(cur);
    const next = this.statusCycle[(idx + 1) % this.statusCycle.length];
    this.state[toothId][faceId] = next;
    faceEl.classList.remove('st-saudavel', 'st-carie', 'st-restaurado');
    if (this.statusColors[next]) faceEl.classList.add(this.statusColors[next]);
    if (this.onStateChange) this.onStateChange(this.state, toothId, faceId, next);
  }

  toggleToothAbsence(toothId, el) {
    const isAusente = !this.state[toothId].ausente;
    this.state[toothId].ausente = isAusente;
    if (isAusente) {
      el.classList.add('ausente');
      ['T','B','L','R','C'].forEach(f => this.state[toothId][f] = 'saudavel');
      el.querySelectorAll('.face').forEach(f => f.classList.remove('st-carie', 'st-restaurado'));
    } else {
      el.classList.remove('ausente');
    }
    if (this.onStateChange) this.onStateChange(this.state, toothId, 'ausente', isAusente);
  }
}

window.Odontogram = Odontogram;
