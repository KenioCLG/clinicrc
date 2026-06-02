import { PatientRepository } from "../../../domain/repositories/PatientRepository";
import { GetPatients } from "../../../use-cases/GetPatients";
import { UpdatePatient, UpdatePatientInput } from "../../../use-cases/UpdatePatient";
import { ResetPatients } from "../../../use-cases/ResetPatients";

export class PatientController {
  constructor(private patientRepository: PatientRepository) {}

  async list(request: Request): Promise<Response> {
    try {
      const useCase = new GetPatients(this.patientRepository);
      const patients = await useCase.execute();
      
      return new Response(JSON.stringify(patients), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  async update(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const id = url.searchParams.get("id");
      
      if (!id) {
        return new Response(JSON.stringify({ error: "O ID do paciente e obrigatorio." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      const body: any = await request.json();
      
      const useCase = new UpdatePatient(this.patientRepository);
      const input: UpdatePatientInput = {
        id,
        col: body.col,
        tent: body.tent !== undefined ? Number(body.tent) : undefined,
        obs: body.obs,
        res: body.res,
        dt: body.dt
      };

      const updated = await useCase.execute(input);

      return new Response(JSON.stringify(updated), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  async reset(request: Request): Promise<Response> {
    try {
      const useCase = new ResetPatients(this.patientRepository);
      const seeded = await useCase.execute();

      return new Response(JSON.stringify({ message: "Banco de dados resetado com sucesso!", patients: seeded }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
}
