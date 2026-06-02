import { Patient } from "../entities/Patient";

export interface PatientRepository {
  findAll(): Promise<Patient[]>;
  findById(id: string): Promise<Patient | null>;
  save(patient: Patient): Promise<void>;
  saveMany(patients: Patient[]): Promise<void>;
  resetAll(initialPatients: Patient[]): Promise<void>;
}
