/**
 * api-client.js — Cliente da API ClinicRC
 *
 * ANALOGIA: É o "telefone" do frontend.
 * Sempre que o Kanban precisa salvar ou buscar dados,
 * ele usa este módulo para ligar para o servidor (backend).
 *
 * Agora usa nossa API Node.js + JWT ao invés do Firebase/Cloudflare.
 */

export default class ClinicrcApiClient {
  constructor() {
    // URL base da API — em produção, vai ser o domínio do Railway
    this.base = window.location.origin;

    // Token JWT salvo no login
    this.token = localStorage.getItem('clinicrc_token');

    // Se não tem token, manda para o login
    if (!this.token) {
      window.location.href = 'index.html';
    }
  }

  /**
   * Headers padrão com autenticação
   */
  get headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`,
    };
  }

  /**
   * Busca todos os pacientes da clínica logada
   */
  async getPatients() {
    const res = await fetch(`${this.base}/patients`, { headers: this.headers });

    if (res.status === 401) {
      // Token expirado — volta para login
      localStorage.clear();
      window.location.href = 'index.html';
      return [];
    }

    if (!res.ok) throw new Error(`Erro ${res.status}`);
    return await res.json();
  }

  /**
   * Atualiza dados de um paciente (progresso no Kanban)
   * Usa o telefone como identificador único
   */
  async updatePatient(id, updates) {
    // Busca o paciente pelo ID para obter o tel
    const patient = window._E?.find(p => p.id === id);
    const tel = patient?.tel;

    if (!tel) throw new Error('Telefone não encontrado para ID: ' + id);

    const res = await fetch(`${this.base}/patients/${tel}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify(updates),
    });

    if (res.status === 401) {
      localStorage.clear();
      window.location.href = 'index.html';
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erro ${res.status}`);
    }

    return await res.json();
  }

  /**
   * Reset de pacientes — remove todos e mantém apenas os da planilha inicial
   * (Agora não faz mais seed automático, apenas avisa)
   */
  async resetDatabase() {
    throw new Error('Reset desabilitado. Use a página de upload para reimportar a planilha.');
  }
}
