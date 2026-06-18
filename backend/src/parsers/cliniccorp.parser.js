/**
 * cliniccorp.parser.js — Parser da planilha ClinicCorp
 *
 * ANALOGIA: É um "tradutor" especializado em ClinicCorp.
 * Recebe uma planilha no "dialeto ClinicCorp" e converte
 * para o formato interno padrão do ClinicRC.
 *
 * Colunas da planilha ClinicCorp:
 *   [0] Data Criação
 *   [1] Data
 *   [2] Status          ← "OPEN" | "APPROVED"
 *   [4] Profissional
 *   [5] Paciente
 *   [6] Telefone        ← sem formatação (ex: 81986848035)
 *   [7] Procedimentos
 *   [8] Valor
 *   [9] Valor Total Com Desconto
 */

const XLSX = require('xlsx');

/**
 * Normaliza telefone: remove tudo que não for dígito
 * Ex: "(81) 9986-8035" → "81998680385"
 *     "81986848035"    → "81986848035"
 */
function normalizeTel(raw) {
  if (!raw) return '';
  return String(raw).replace(/\D/g, '');
}

/**
 * Formata valor monetário para padrão BR
 * Ex: "700,00" → "R$ 700,00"
 *     1350      → "R$ 1.350,00"
 */
function formatValor(raw) {
  if (!raw) return 'R$ 0,00';
  const str = String(raw).replace(/[^\d,.]/g, '');
  // Já está em formato BR (ex: "1.350,00")
  if (str.includes(',')) {
    return `R$ ${str}`;
  }
  // É número puro
  const num = parseFloat(str);
  if (Number.isNaN(num)) return 'R$ 0,00';
  return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

/**
 * Lê e converte o arquivo xlsx do ClinicCorp
 * @param {Buffer} buffer - Buffer do arquivo
 * @returns {Array} Lista de pacientes no formato interno
 */
function parseClinicCorp(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (rows.length < 2) {
    throw new Error('Planilha vazia ou sem dados.');
  }

  // ── DETECÇÃO AUTOMÁTICA DE COLUNAS POR CABEÇALHO ──────────────────────────
  const header = rows[0].map(h => String(h).trim().toLowerCase());
  console.log('[ClinicCorp Parser] Cabeçalho detectado:', JSON.stringify(header));

  // Mapeamento flexível: tenta vários nomes possíveis para cada campo
  const findCol = (...names) => {
    for (const name of names) {
      const idx = header.findIndex(h => h.includes(name));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const colData     = findCol('data cria', 'data_cria', 'data do orça');
  const colStatus   = findCol('status');
  const colProf     = findCol('profissional', 'dentista', 'doutor');
  const colNome     = findCol('paciente', 'nome', 'cliente');
  const colTel      = findCol('telefone', 'celular', 'fone', 'tel');
  const colProc     = findCol('procedimento', 'tratamento', 'serviço', 'servico');
  const colValor    = findCol('valor total', 'valor com desc', 'valor');
  const colValorAlt = findCol('valor', 'total');

  console.log('[ClinicCorp Parser] Colunas mapeadas:', { colData, colStatus, colProf, colNome, colTel, colProc, colValor });

  // Se não encontrou coluna de paciente OU telefone, tenta fallback posicional
  const useFallback = colNome === -1 || colTel === -1;
  if (useFallback) {
    console.warn('[ClinicCorp Parser] Cabeçalho não reconhecido, usando posições fixas (fallback).');
  }

  const patients = [];
  const skippedReasons = { noTel: 0, notOpen: 0, shortRow: 0, empty: 0 };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    // Ignora linhas vazias
    const isEmpty = row.every(c => !c && c !== 0);
    if (isEmpty) { skippedReasons.empty++; continue; }

    // Extrai campos (smart ou fallback)
    let nome, tel, proc, valor, status, profissional, dataOrc;

    if (useFallback) {
      // Fallback posicional original
      if (row.length < 7) { skippedReasons.shortRow++; continue; }
      dataOrc      = String(row[0] || '').trim();
      status       = String(row[2] || '').trim().toUpperCase();
      profissional = String(row[4] || '').trim();
      nome         = String(row[5] || '').trim();
      tel          = normalizeTel(row[6]);
      proc         = String(row[7] || '').trim();
      valor        = formatValor(row[9] || row[8] || '');
    } else {
      // Detecção por cabeçalho
      dataOrc      = colData >= 0 ? String(row[colData] || '').trim() : '';
      status       = colStatus >= 0 ? String(row[colStatus] || '').trim().toUpperCase() : 'OPEN';
      profissional = colProf >= 0 ? String(row[colProf] || '').trim() : '';
      nome         = String(row[colNome] || '').trim();
      tel          = normalizeTel(row[colTel]);
      proc         = colProc >= 0 ? String(row[colProc] || '').trim() : '';
      valor        = formatValor(colValor >= 0 ? row[colValor] : (colValorAlt >= 0 ? row[colValorAlt] : ''));
    }

    if (!tel) { skippedReasons.noTel++; continue; }

    // Filtra: só importa orçamentos em aberto (OPEN / EM ABERTO)
    if (colStatus >= 0 && status !== 'OPEN' && status !== 'EM ABERTO') { skippedReasons.notOpen++; continue; }

    patients.push({
      nome: nome.toUpperCase() || 'SEM NOME',
      tel,
      proc: proc || 'Procedimento não informado',
      valor,
      source: 'cliniccorp',
      source_status: status || 'OPEN',
      profissional,
      data_orcamento: dataOrc,
    });
  }

  console.log(`[ClinicCorp Parser] Resultado: ${patients.length} pacientes extraídos, ${rows.length - 1} linhas lidas.`);
  console.log(`[ClinicCorp Parser] Pulados: ${JSON.stringify(skippedReasons)}`);

  return patients;
}

module.exports = { parseClinicCorp };
