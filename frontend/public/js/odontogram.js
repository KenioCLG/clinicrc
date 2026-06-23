class Odontogram {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    
    // Estado interno (Input/Output da "Caixa Preta")
    // Armazena o status de cada face de cada dente. Status possíveis: saudavel, carie, restaurado, ausente
    this.state = {};
    
    // Callback externa para notificar mudanças
    this.onStateChange = null;
    
    // Configuração dos quadrantes da arcada
    this.teethLayout = {
      adult: {
        top: [18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28],
        bottom: [48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38]
      },
      kid: {
        top: [55,54,53,52,51, 61,62,63,64,65],
        bottom: [85,84,83,82,81, 71,72,73,74,75]
      }
    };

    // Paleta de status para as faces
    this.statusColors = {
      saudavel: '', // Usa o CSS padrão (branco/cinza)
      carie: 'st-carie', // Vermelho
      restaurado: 'st-restaurado', // Azul
      ausente: 'st-ausente' // Dente inteiro escuro (aplicado no wrapper)
    };
    
    // O ciclo de cliques: saudavel -> carie -> restaurado -> saudavel
    this.statusCycle = ['saudavel', 'carie', 'restaurado'];

    this.init();
  }

  init() {
    this.render();
    this.setupEventDelegation();
  }

  // PROCESSAMENTO: Constrói a arcada iterando sobre o Layout e injetando o Molde SVG
  render() {
    let html = '<div class="odonto-wrapper">';
    
    // Função auxiliar para renderizar uma fileira de dentes
    const renderRow = (teethArray) => {
      let rowHtml = '<div class="odonto-row">';
      teethArray.forEach(id => {
        // Inicializa o estado se não existir
        if (!this.state[id]) {
          this.state[id] = { T: 'saudavel', B: 'saudavel', L: 'saudavel', R: 'saudavel', C: 'saudavel', ausente: false };
        }
        
        const isAusente = this.state[id].ausente ? 'ausente' : '';
        
        rowHtml += `
          <div class="tooth-wrapper ${isAusente}" data-id="${id}" id="tooth-wrap-${id}">
            <span class="tooth-label">${id}</span>
            <svg class="tooth-svg" viewBox="0 0 40 40">
              <!-- Instanciando o Molde (Flyweight Pattern) -->
              <use href="#tooth-face-T" class="face face-T ${this.statusColors[this.state[id].T] || ''}" data-face="T" title="Face Superior"></use>
              <use href="#tooth-face-B" class="face face-B ${this.statusColors[this.state[id].B] || ''}" data-face="B" title="Face Inferior"></use>
              <use href="#tooth-face-L" class="face face-L ${this.statusColors[this.state[id].L] || ''}" data-face="L" title="Face Esquerda"></use>
              <use href="#tooth-face-R" class="face face-R ${this.statusColors[this.state[id].R] || ''}" data-face="R" title="Face Direita"></use>
              <use href="#tooth-face-C" class="face face-C ${this.statusColors[this.state[id].C] || ''}" data-face="C" title="Face Central"></use>
            </svg>
            <div class="tooth-actions">
              <button class="btn-ausente" title="Marcar como Ausente / Extraído">❌</button>
            </div>
          </div>
        `;
      });
      rowHtml += '</div>';
      return rowHtml;
    };

    // Renderiza Adultos
    html += '<div class="arcada-title">Arcada Permanente</div>';
    html += renderRow(this.teethLayout.adult.top);
    html += renderRow(this.teethLayout.adult.bottom);
    
    // Renderiza Crianças
    html += '<div class="arcada-title" style="margin-top: 20px;">Arcada Decídua (Leite)</div>';
    html += renderRow(this.teethLayout.kid.top);
    html += renderRow(this.teethLayout.kid.bottom);

    html += '</div>';
    this.container.innerHTML = html;
  }

  // EVENT DELEGATION: Apenas UM listener para todas as milhares de faces!
  setupEventDelegation() {
    this.container.addEventListener('click', (e) => {
      // 1. Clique em uma Face do Dente
      const faceEl = e.target.closest('.face');
      if (faceEl) {
        const toothWrap = faceEl.closest('.tooth-wrapper');
        if (!toothWrap) return;
        
        const toothId = toothWrap.getAttribute('data-id');
        const faceId = faceEl.getAttribute('data-face');
        
        // Se o dente está ausente, não deixamos pintar a face
        if (this.state[toothId].ausente) return;

        this.cycleFaceStatus(toothId, faceId, faceEl);
        return;
      }

      // 2. Clique no botão de Dente Ausente/Extraído
      const btnAusente = e.target.closest('.btn-ausente');
      if (btnAusente) {
        const toothWrap = btnAusente.closest('.tooth-wrapper');
        if (!toothWrap) return;
        
        const toothId = toothWrap.getAttribute('data-id');
        this.toggleToothAbsence(toothId, toothWrap);
      }
    });
  }

  cycleFaceStatus(toothId, faceId, faceEl) {
    const currentStatus = this.state[toothId][faceId];
    const currentIndex = this.statusCycle.indexOf(currentStatus);
    const nextStatus = this.statusCycle[(currentIndex + 1) % this.statusCycle.length];
    
    // Atualiza o estado lógico
    this.state[toothId][faceId] = nextStatus;
    
    // Atualiza a View (Classes CSS)
    faceEl.classList.remove('st-saudavel', 'st-carie', 'st-restaurado');
    if (this.statusColors[nextStatus]) {
      faceEl.classList.add(this.statusColors[nextStatus]);
    }

    if (this.onStateChange) {
      this.onStateChange(this.state, toothId, faceId, nextStatus);
    }
  }

  toggleToothAbsence(toothId, toothWrapEl) {
    const isAusente = !this.state[toothId].ausente;
    this.state[toothId].ausente = isAusente;
    
    if (isAusente) {
      toothWrapEl.classList.add('ausente');
      // Resetar faces se foi extraído
      ['T', 'B', 'L', 'R', 'C'].forEach(f => this.state[toothId][f] = 'saudavel');
      const faces = toothWrapEl.querySelectorAll('.face');
      faces.forEach(f => f.classList.remove('st-carie', 'st-restaurado'));
    } else {
      toothWrapEl.classList.remove('ausente');
    }

    if (this.onStateChange) {
      this.onStateChange(this.state, toothId, 'ausente', isAusente);
    }
  }
}

// Expõe para uso no app.js
window.Odontogram = Odontogram;
