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
  if (isNaN(num)) return 'R$ 0,00';
  return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

/**
 * Lê e converte o arquivo xlsx do ClinicCorp
 * @param {string} filepath - Caminho do arquivo
 * @returns {Array} Lista de pacientes no formato interno
 */
function parseClinicCorp(filepath) {
  const workbook = XLSX.readFile(filepath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const patients = [];

  // Começa da linha 1 (linha 0 é o cabeçalho)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    // Ignora linhas completamente vazias
    if (!row[5] && !row[6]) continue;

    const tel = normalizeTel(row[6]);

    // Ignora pacientes sem telefone
    if (!tel) continue;

    const status = String(row[2]).trim().toUpperCase();

    // Filtra: só importa orçamentos em aberto (OPEN)
    // APPROVED = já foi aprovado/pago, não precisa de retorno ativo
    if (status !== 'OPEN') continue;

    patients.push({
      nome: String(row[5]).trim().toUpperCase(),
      tel,
      proc: String(row[7]).trim() || 'Procedimento não informado',
      valor: formatValor(row[9] || row[8]),
      source: 'cliniccorp',
      source_status: status,
      profissional: String(row[4]).trim(),
      data_orcamento: String(row[0]).trim(),
    });
  }

  return patients;
}

module.exports = { parseClinicCorp };
