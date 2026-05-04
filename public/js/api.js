// API Client - todas as chamadas passam pelo backend (Cloud Functions)
const API = {
  // Cloud Functions do projeto ClinicRC.
  // Frontend nao fala com Firestore direto; tudo passa por esta API.
  baseUrl: "https://us-central1-clinicrc-8ba64.cloudfunctions.net",

  // Pega token JWT do usuario logado
  async getToken() {
    const user = auth.currentUser;
    if (!user) throw new Error("Nao autenticado");
    return user.getIdToken();
  },

  // Request generico com auth
  async request(endpoint, options = {}) {
    const token = await this.getToken();
    const url = this.baseUrl + endpoint;

    const config = {
      headers: {
        "Authorization": "Bearer " + token,
        ...options.headers
      },
      ...options
    };

    // Nao setar Content-Type para FormData (upload)
    if (!(options.body instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
      if (options.body && typeof options.body === "object") {
        config.body = JSON.stringify(options.body);
      }
    }

    const res = await fetch(url, config);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || data.errors?.join(", ") || "Erro na requisicao");
    }

    return data;
  },

  // === CLINICA ===
  async getClinic() {
    return this.request("/clinicGet");
  },

  async createClinic(name) {
    return this.request("/clinicCreate", {
      method: "POST",
      body: { name }
    });
  },

  // === PACIENTES ===
  async listPatients(status) {
    const query = status ? "?status=" + status : "";
    return this.request("/patientsList" + query);
  },

  async createPatient(data) {
    return this.request("/patientsCreate", {
      method: "POST",
      body: data
    });
  },

  async updatePatient(id, data) {
    return this.request("/patientsUpdate?id=" + id, {
      method: "PUT",
      body: data
    });
  },

  async deletePatient(id) {
    return this.request("/patientsDelete?id=" + id, {
      method: "DELETE"
    });
  },

  // === LIGACOES ===
  async registerCall(patientId, outcome, notes) {
    return this.request("/callRegister", {
      method: "POST",
      body: { patientId, outcome, notes }
    });
  },

  async listCalls(patientId) {
    const query = patientId ? "?patientId=" + patientId : "";
    return this.request("/callsList" + query);
  },

  // === STATS ===
  async getStats() {
    return this.request("/stats");
  },

  // === IMPORTACAO ===
  async importFile(file) {
    const formData = new FormData();
    formData.append("file", file);

    return this.request("/importPatients", {
      method: "POST",
      body: formData
    });
  }
};
