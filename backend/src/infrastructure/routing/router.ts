import { PatientController } from "../controllers/PatientController";

export async function handleRequest(request: Request, controller: PatientController): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Adicionar cabeçalhos de CORS a todas as respostas
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Tratar requisição OPTIONS (Preflight)
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  let response: Response;

  if (path === "/api/patients" || path === "/patients") {
    if (method === "GET") {
      response = await controller.list(request);
    } else {
      response = new Response(JSON.stringify({ error: "Metodo nao permitido." }), { status: 405 });
    }
  } else if (path === "/api/patients/update" || path === "/patients/update") {
    if (method === "POST" || method === "PUT") {
      response = await controller.update(request);
    } else {
      response = new Response(JSON.stringify({ error: "Metodo nao permitido." }), { status: 405 });
    }
  } else if (path === "/api/patients/reset" || path === "/patients/reset") {
    if (method === "POST") {
      response = await controller.reset(request);
    } else {
      response = new Response(JSON.stringify({ error: "Metodo nao permitido." }), { status: 405 });
    }
  } else {
    response = new Response(JSON.stringify({ error: "Recurso nao encontrado." }), { status: 404 });
  }

  // Injetar headers de CORS na resposta final
  const finalHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    finalHeaders.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: finalHeaders,
  });
}
