import { PatientRepository } from "../domain/repositories/PatientRepository";
import { Patient } from "../domain/entities/Patient";
import { INITIAL_PATIENTS } from "../domain/constants/InitialPatients";

export class ResetPatients {
  constructor(private patientRepository: PatientRepository) {}

  async execute(): Promise<Patient[]> {
    const list = INITIAL_PATIENTS.map(p => new Patient(p));
    await this.patientRepository.resetAll(list);
    return list;
  }
}
