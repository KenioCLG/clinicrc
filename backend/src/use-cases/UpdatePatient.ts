import { PatientRepository } from "../domain/repositories/PatientRepository";
import { Patient } from "../domain/entities/Patient";

export interface UpdatePatientInput {
  id: string;
  col?: 'ligar' | 'contato' | 'agendado' | 'final';
  tent?: number;
  obs?: string;
  res?: 'agendou' | 'procedimento' | 'sem-interesse' | 'sem-resposta' | null;
  dt?: string | null;
}

export class UpdatePatient {
  constructor(private patientRepository: PatientRepository) {}

  async execute(input: UpdatePatientInput): Promise<Patient> {
    const patient = await this.patientRepository.findById(input.id);
    if (!patient) {
      throw new Error(`Paciente com ID ${input.id} nao encontrado.`);
    }

    // Aplicar atualizações seguras
    if (input.col !== undefined) {
      patient.moveTo(input.col);
    }
    
    if (input.tent !== undefined) {
      // Regra de domínio se o usuário clicou em um dot de tentativa específico
      // mas mantemos suporte a passagem direta de valor de tentativa se necessário.
      patient.tent = input.tent;
    }

    if (input.obs !== undefined) {
      patient.obs = input.obs;
    }

    if (input.res !== undefined) {
      patient.res = input.res;
    }

    if (input.dt !== undefined) {
      patient.dt = input.dt;
    }

    await this.patientRepository.save(patient);
    return patient;
  }
}
