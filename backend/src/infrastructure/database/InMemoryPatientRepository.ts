import { PatientRepository } from "../../../domain/repositories/PatientRepository";
import { Patient } from "../../../domain/entities/Patient";

export class InMemoryPatientRepository implements PatientRepository {
  private patients: Map<string, Patient> = new Map();

  async findAll(): Promise<Patient[]> {
    return Array.from(this.patients.values());
  }

  async findById(id: string): Promise<Patient | null> {
    return this.patients.get(id) || null;
  }

  async save(patient: Patient): Promise<void> {
    this.patients.set(patient.id, patient);
  }

  async saveMany(patients: Patient[]): Promise<void> {
    patients.forEach(p => this.patients.set(p.id, p));
  }

  async resetAll(initialPatients: Patient[]): Promise<void> {
    this.patients.clear();
    initialPatients.forEach(p => this.patients.set(p.id, p));
  }
}
