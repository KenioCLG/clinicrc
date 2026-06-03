// Estado global do odontograma
window.OdontogramaState = {};

// Constante com o molde único (Flyweight Pattern)
// ViewBox 0 0 100 100 com 5 faces poligonais
const TOOTH_SVG_TEMPLATE = `
  <svg class="dente-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <!-- Topo (Vestibular/Palatina dependendo do arco) -->
    <polygon class="dente-face" data-face="top" points="0,0 100,0 75,25 25,25" />
    <!-- Direita (Distal/Mesial) -->
    <polygon class="dente-face" data-face="right" points="100,0 100,100 75,75 75,25" />
    <!-- Fundo (Lingual/Vestibular) -->
    <polygon class="dente-face" data-face="bottom" points="0,100 100,100 75,75 25,75" />
    <!-- Esquerda (Mesial/Distal) -->
    <polygon class="dente-face" data-face="left" points="0,0 0,100 25,75 25,25" />
    <!-- Centro (Oclusal/Incisal) -->
    <polygon class="dente-face" data-face="center" points="25,25 75,25 75,75 25,75" />
  </svg>
`;

// Quadrantes Permanentes
const q1 = [18, 17, 16, 15, 14, 13, 12, 11];
const q2 = [21, 22, 23, 24, 25, 26, 27, 28];
const q4 = [48, 47, 46, 45, 44, 43, 42, 41];
const q3 = [31, 32, 33, 34, 35, 36, 37, 38];

// Quadrantes Decíduos
const q5 = [55, 54, 53, 52, 51];
const q6 = [61, 62, 63, 64, 65];
const q8 = [85, 84, 83, 82, 81];
const q7 = [71, 72, 73, 74, 75];

function buildTooth(id) {
  // Inicializa estado vazio
  window.OdontogramaState[id] = { top: '', right: '', bottom: '', left: '', center: '' };
  
  const wrapper = document.createElement('div');
  wrapper.className = 'dente-wrapper';
  wrapper.dataset.id = id;
  
  const label = document.createElement('span');
  label.className = 'dente-label';
  label.innerText = id;
  
  const svgContainer = document.createElement('div');
  svgContainer.innerHTML = TOOTH_SVG_TEMPLATE.trim();
  const svg = svgContainer.firstChild;
  
  wrapper.appendChild(label);
  wrapper.appendChild(svg);
  
  return wrapper;
}

function buildQuadrant(dentes) {
  const quad = document.createElement('div');
  quad.className = 'odontograma-quadrant';
  dentes.forEach(d => {
    quad.appendChild(buildTooth(d));
  });
  return quad;
}

function initOdontograma(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Row 1 (Superior Permanente)
  const row1 = document.createElement('div');
  row1.className = 'odontograma-row';
  row1.appendChild(buildQuadrant(q1));
  row1.appendChild(buildQuadrant(q2));
  
  // Row 2 (Superior Decíduo)
  const row2 = document.createElement('div');
  row2.className = 'odontograma-row';
  row2.appendChild(buildQuadrant(q5));
  row2.appendChild(buildQuadrant(q6));

  // Row 3 (Inferior Decíduo)
  const row3 = document.createElement('div');
  row3.className = 'odontograma-row';
  row3.appendChild(buildQuadrant(q8));
  row3.appendChild(buildQuadrant(q7));

  // Row 4 (Inferior Permanente)
  const row4 = document.createElement('div');
  row4.className = 'odontograma-row';
  row4.appendChild(buildQuadrant(q4));
  row4.appendChild(buildQuadrant(q3));
  
  container.appendChild(row1);
  container.appendChild(row2);
  container.appendChild(row3);
  container.appendChild(row4);
  
  // Event Delegation para Performance O(1) nos cliques
  container.addEventListener('click', function(e) {
    if (e.target.tagName.toLowerCase() === 'polygon') {
      const face = e.target.dataset.face;
      const toothWrapper = e.target.closest('.dente-wrapper');
      const toothId = toothWrapper.dataset.id;
      
      // Ciclo de estados: Normal -> Cárie -> Restauração -> Normal
      let currentState = window.OdontogramaState[toothId][face];
      
      // Remove classes antigas
      e.target.classList.remove('carie', 'restauracao');
      
      if (currentState === '') {
        currentState = 'carie';
        e.target.classList.add('carie');
      } else if (currentState === 'carie') {
        currentState = 'restauracao';
        e.target.classList.add('restauracao');
      } else {
        currentState = '';
      }
      
      // Atualiza Estado
      window.OdontogramaState[toothId][face] = currentState;
      console.log(`Dente ${toothId}, Face ${face} -> ${currentState}`);
    }
  });
}

// Inicia quando o DOM carregar
document.addEventListener('DOMContentLoaded', () => {
  initOdontograma('odontograma-container');
});
