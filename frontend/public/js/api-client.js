/**
 * api-client.js — Cliente da API ClinicRC
 *
 * ANALOGIA: É o "telefone" do frontend.
 * Sempre que o Kanban precisa salvar ou buscar dados,
 * ele usa este módulo para ligar para o servidor (backend).
 *
 * Agora usa nossa API Node.js + JWT para a versão multi-clínica.
 */

export default class ClinicrcApiClient {
  constructor() {
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
    const res = await fetch(`${this.base}/patients`, {
      headers: this.headers,
      signal: AbortSignal.timeout(15000)
    });

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
      signal: AbortSignal.timeout(15000)
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
   * Cadastra um novo Lead/Paciente
   */
  async createPatient(patientData) {
    const res = await fetch(`${this.base}/patients`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(patientData),
      signal: AbortSignal.timeout(15000)
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
   * Remove um Lead/Paciente
   */
  async deletePatient(id) {
    const patient = window._E?.find(p => p.id === id);
    const tel = patient?.tel;

    if (!tel) throw new Error('Telefone não encontrado para ID: ' + id);

    const res = await fetch(`${this.base}/patients/${tel}`, {
      method: 'DELETE',
      headers: this.headers,
      signal: AbortSignal.timeout(15000)
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
}
