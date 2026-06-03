/**
 * simples-dental.parser.js — Parser da planilha Simples Dental
 *
 * ANALOGIA: É o mesmo "tradutor" mas especializado no dialeto Simples Dental.
 * A estrutura é diferente do ClinicCorp, mas o resultado final é idêntico.
 *
 * Colunas da planilha Simples Dental:
 *   [0] Data
 *   [1] Paciente
 *   [2] Documento (CPF)
 *   [3] Celular Paciente  ← chave de merge
 *   [4] E-mail
 *   [5] Celular Responsável
 *   [6] Descrição
 *   [7] Status do orçamento  ← "Em aberto" | "Reprovado"
 *   [8] Valor               ← número (ex: 5200)
 */

const XLSX = require('xlsx');

function normalizeTel(raw) {
  if (!raw) return '';
  return String(raw).replace(/\D/g, '');
}

function formatValor(raw) {
  if (!raw && raw !== 0) return 'R$ 0,00';
  const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^\d,.]/g, '').replace(',', '.'));
  if (Number.isNaN(num)) return 'R$ 0,00';
  return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

/**
 * Lê e converte o arquivo xlsx do Simples Dental
 * @param {Buffer} buffer - Buffer do arquivo
 * @returns {Array} Lista de pacientes no formato interno
 */
function parseSimplesDental(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const patients = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    if (!row[1] && !row[3]) continue;

    if (row.length < 9) {
      console.warn(`⚠️  Simples Dental: Linha ${i+1} tem apenas ${row.length} colunas (esperadas: 9). Pulando.`);
      continue;
    }

    const tel = normalizeTel(row[3]) || normalizeTel(row[5]);

    if (!tel) continue;

    const status = String(row[7]).trim();

    // Removemos o filtro de "Em aberto" porque o objetivo do CRM é
    // justamente ligar para pacientes que não fecharam (Reprovados).

    // Nome do procedimento: o campo Descrição costuma ser genérico
    // ("Plano tratamento de NOME"), então usamos como proc mesmo
    const descricao = String(row[6]).trim();
    const proc = descricao.startsWith('Plano tratamento de ')
      ? 'Plano de Tratamento' // simplifica a descrição genérica
      : descricao;

    patients.push({
      nome: String(row[1]).trim().toUpperCase(),
      tel,
      proc,
      valor: formatValor(row[8]),
      source: 'simples_dental',
      source_status: status,
      profissional: null,
      data_orcamento: String(row[0]).trim(),
    });
  }

  return patients;
}

module.exports = { parseSimplesDental };
