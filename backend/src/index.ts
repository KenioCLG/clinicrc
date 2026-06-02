import { D1PatientRepository } from "./infrastructure/database/D1PatientRepository";
import { PatientController } from "./infrastructure/controllers/PatientController";
import { handleRequest } from "./infrastructure/routing/router";

export interface Env {
  DB: any; // Cloudflare D1 Database binding
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Instancia o repositório concreto acoplado ao Cloudflare D1
    const repository = new D1PatientRepository(env.DB);
    
    // Instancia o controlador passando o repositório
    const controller = new PatientController(repository);
    
    // Processa a rota através do roteador HTTP leve
    return await handleRequest(request, controller);
  },
};
