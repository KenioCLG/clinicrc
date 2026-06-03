// Componente Odontograma Heatmap (Vanilla JS)
window.OdontogramaHeatmap = {};

// Gerador de Shapes Anatômicos Fiéis (Referência Odontológica Profissional)
function getToothSvg(type, temperatureColor) {
  const rootColor = '#334155'; // Dark mode root
  const strokeColor = '#475569';
  
  let rootPath = '';
  let crownPath = '';

  if (type === 'molar') {
    // 3 raízes (anatomia superior realista)
    rootPath = `M 35,45 C 30,20 25,5 40,5 C 45,15 45,35 45,45 
                M 65,45 C 70,20 75,5 60,5 C 55,15 55,35 55,45
                M 50,45 C 50,20 48,10 50,10 C 52,10 50,20 50,45`;
    // Coroa larga e curvada com 4 cúspides
    crownPath = `M 25,45 C 25,35 75,35 75,45 C 85,60 80,85 70,95 C 60,90 40,90 30,95 C 20,85 15,60 25,45 Z`;
  } else if (type === 'premolar') {
    // 1 a 2 raízes unidas
    rootPath = `M 40,45 C 35,20 40,5 50,5 C 60,5 65,20 60,45`;
    // Coroa ovalada com 2 cúspides
    crownPath = `M 30,45 C 30,35 70,35 70,45 C 80,65 75,85 65,95 C 50,90 50,90 35,95 C 25,85 20,65 30,45 Z`;
  } else if (type === 'canino') {
    // 1 raiz longa e pontiaguda
    rootPath = `M 40,45 C 35,20 45,0 50,0 C 55,0 65,20 60,45`;
    // Coroa com cúspide aguda (ponta)
    crownPath = `M 35,45 C 35,35 65,35 65,45 C 75,65 60,85 50,100 C 40,85 25,65 35,45 Z`;
  } else {
    // incisivo: 1 raiz reta
    rootPath = `M 40,45 C 38,20 45,0 50,0 C 55,0 62,20 60,45`;
    // Coroa plana na incisal
    crownPath = `M 35,45 C 35,38 65,38 65,45 C 70,75 70,90 65,100 L 35,100 C 30,90 30,75 35,45 Z`;
  }

  // Preenchimento com opacidade para brilhar no dark mode
  const glowFill = temperatureColor === '#f8fafc' ? 'rgba(255,255,255,0.05)' : temperatureColor;

  return `
    <svg class="dente-svg-anat" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path class="dente-root" d="${rootPath}" fill="none" stroke="${rootColor}" stroke-width="3" stroke-linecap="round"/>
      <path class="dente-crown" d="${crownPath}" fill="${glowFill}" stroke="${strokeColor}" stroke-width="2" stroke-linejoin="round"/>
      <!-- Overlay brilhante para o heatmap -->
      <path class="dente-crown-glow" d="${crownPath}" fill="${temperatureColor}" opacity="0.8" style="mix-blend-mode: overlay;" />
    </svg>
  `;
}

function getToothType(id) {
  const mod = id % 10;
  if (mod >= 6) return 'molar';
  if (mod >= 4) return 'premolar';
  if (mod === 3) return 'canino';
  return 'incisivo';
}

function calculateTemperatureColor(count, maxCount) {
  if (count === 0) return '#f8fafc'; 
  const ratio = Math.min(count / maxCount, 1);
  const hue = ((1 - ratio) * 120).toString(10);
  return `hsl(${hue}, 90%, 60%)`;
}

const MOCK_DATA = {
  "16": 45, "26": 32, "36": 28, "46": 50,
  "11": 5, "21": 3,
  "14": 15, "24": 12,
  "38": 20, "48": 25
};

const q1 = [18, 17, 16, 15, 14, 13, 12, 11];
const q2 = [21, 22, 23, 24, 25, 26, 27, 28];
const q4 = [48, 47, 46, 45, 44, 43, 42, 41];
const q3 = [31, 32, 33, 34, 35, 36, 37, 38];

function buildToothHeatmap(id, isLower) {
  const wrapper = document.createElement('div');
  wrapper.className = 'dente-wrapper-anat';
  if (isLower) wrapper.classList.add('lower');
  
  const label = document.createElement('span');
  label.className = 'dente-label-anat';
  label.innerText = id;
  
  const count = MOCK_DATA[id] || 0;
  const maxCount = 50; 
  const color = calculateTemperatureColor(count, maxCount);
  
  const svgContainer = document.createElement('div');
  svgContainer.className = 'svg-container-anat';
  svgContainer.setAttribute('data-tooltip', `Dente ${id}: ${count} proced. abertos`);
  
  svgContainer.innerHTML = getToothSvg(getToothType(id), color);
  
  if (isLower) {
    wrapper.appendChild(svgContainer);
    wrapper.appendChild(label);
  } else {
    wrapper.appendChild(label);
    wrapper.appendChild(svgContainer);
  }
  
  return wrapper;
}

function buildArch(leftQ, rightQ, isLower) {
  const row = document.createElement('div');
  row.className = 'odontograma-arch';
  
  const quadL = document.createElement('div');
  quadL.className = 'odontograma-quadrant-anat';
  leftQ.forEach(id => quadL.appendChild(buildToothHeatmap(id, isLower)));
  
  const quadR = document.createElement('div');
  quadR.className = 'odontograma-quadrant-anat';
  rightQ.forEach(id => quadR.appendChild(buildToothHeatmap(id, isLower)));
  
  row.appendChild(quadL);
  row.appendChild(quadR);
  return row;
}

function initHeatmap(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  
  const header = document.createElement('div');
  header.className = 'heatmap-header';
  header.innerHTML = `
    <h2>Dashboard de Oportunidades Clínicas</h2>
    <div class="legend">
      <span style="background:rgba(255,255,255,0.05); border:1px solid #475569">0 proced.</span>
      <span style="background:hsl(120,90%,60%); color:#000">Baixo</span>
      <span style="background:hsl(60,90%,60%); color:#000">Médio</span>
      <span style="background:hsl(0,90%,60%); color:#fff">Alto</span>
    </div>
  `;
  container.appendChild(header);

  container.appendChild(buildArch(q1, q2, false));
  container.appendChild(buildArch(q4, q3, true));
}

function tryInitHeatmap() {
  const container = document.getElementById('odontograma-container');
  if (container) initHeatmap('odontograma-container');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', tryInitHeatmap);
} else {
  tryInitHeatmap();
}

window.renderHeatmap = tryInitHeatmap;
