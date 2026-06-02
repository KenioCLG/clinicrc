import { PatientRepository } from "../domain/repositories/PatientRepository";
import { Patient } from "../domain/entities/Patient";

export class GetPatients {
  constructor(private patientRepository: PatientRepository) {}

  async execute(): Promise<Patient[]> {
    return await this.patientRepository.findAll();
  }
}
