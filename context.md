# ClinicRC — Plataforma Multi-Clínica

> **Documento de contexto vivo.** Atualizado em: 02/06/2026
> Sempre consulte este arquivo antes de continuar o desenvolvimento.

---

## 📋 Visão Geral do Produto

**App:** ClinicRC — Plataforma de Retorno Ativo de Pacientes  
**Dono:** Kenio (dev + gestor)  
**Contato/Suporte:** WhatsApp `(81) 98654-4577` → `https://wa.me/5581986544577`  
**Função:** Sistema multi-tenant SaaS para clínicas odontológicas gerenciarem orçamentos em aberto via importação de planilhas XLSX e CRM Kanban.

> **Evolução:** O projeto iniciou focado no Firebase e Railway com SQLite, mas **atualmente a stack oficial é Vercel (Hospedagem) + Supabase (PostgreSQL)** para maior escalabilidade e performance Serverless.

---

## 🗂️ Estrutura de Arquivos Principal

```
clinicrc/
├── backend/
│   ├── src/
│   │   ├── server.js              ← Entry point Express
│   │   ├── db-postgres.js         ← Conexão pg (Supabase) + schema PostgreSQL
│   │   ├── auth.js                ← createUser, login, verifyToken
│   │   ├── middleware/            ← Valida JWT em rotas protegidas
│   │   ├── parsers/               ← Parsers XLSX (ClinicCorp, Simples Dental)
│   │   └── routes/                ← Rotas REST (Auth, Patient, Upload)
│   ├── data/                      ← (Legado/Local)
│   ├── .env                       ← Variáveis de ambiente (gitignored)
│   └── package.json
├── frontend/
│   └── public/
│       ├── index.html             ← Tela de login (design dark glassmorphism)
│       ├── app.html               ← Kanban CRM principal
│       ├── upload.html            ← Upload de planilhas XLSX
│       ├── css/                   ← Design system do app
│       └── js/                    ← Lógica Kanban, API client (Vanilla JS)
├── vercel.json                    ← Config de deploy Vercel
├── .env.example                   ← Template de variáveis
└── context.md                     ← Este arquivo
```

---

## 🔐 Autenticação & Usuários

- **Modelo:** username + senha → JWT (24h)
- **Header:** `Authorization: Bearer <token>`
- **Regra de Isolamento (Multi-tenant):** Cada clínica acessa **apenas seus próprios pacientes** (isolamento estrito por `clinic_id` extraído do JWT em cada query).

---

## 🏗️ Stack Técnica (Atual)

| Componente | Tecnologia |
|---|---|
| Hospedagem | **Vercel** (Serverless Functions via `vercel.json`) |
| Banco de Dados | **Supabase** (PostgreSQL gerido) |
| Runtime | Node.js |
| Linguagens | JavaScript / TypeScript (onde aplicável) |
| Framework Backend | Express v5 |
| Driver DB | `pg` (PostgreSQL client) |
| Auth | `bcryptjs` + `jsonwebtoken` |
| Upload & Parse | `multer` + `xlsx` |
| Frontend | Vanilla JS + HTML + CSS (sem frameworks grandes) |
| Fontes e Ícones | Inter, Roboto, Material Symbols |

---

## 🗄️ Schema do Banco de Dados (PostgreSQL)

O schema está implementado no Supabase (`db-postgres.js` cuida do init):

```sql
-- Usuários (1 por clínica)
CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  clinic_name  TEXT NOT NULL,
  username     TEXT NOT NULL UNIQUE,
  password     TEXT NOT NULL,          -- bcrypt hash
  whatsapp     TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Pacientes (multi-tenant por clinic_id)
CREATE TABLE IF NOT EXISTS patients (
  id              TEXT NOT NULL,
  clinic_id       INTEGER NOT NULL REFERENCES users(id),
  nome            TEXT NOT NULL,
  tel             TEXT NOT NULL,         -- CHAVE DE MERGE (só dígitos)
  proc            TEXT NOT NULL DEFAULT '',
  valor           TEXT NOT NULL DEFAULT 'R$ 0,00',
  col             TEXT NOT NULL DEFAULT 'ligar',   -- kanban column
  tent            INTEGER NOT NULL DEFAULT 0,       -- tentativas (0-5)
  obs             TEXT DEFAULT '',
  res             TEXT DEFAULT NULL,     -- resultado final
  dt              TEXT DEFAULT NULL,     -- data do fechamento
  source          TEXT DEFAULT 'manual', 
  source_status   TEXT DEFAULT NULL,
  profissional    TEXT DEFAULT NULL,
  data_orcamento  TEXT DEFAULT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id, clinic_id),
  UNIQUE(clinic_id, tel)               -- Evita duplicidade de pacientes na mesma clínica
);

-- Histórico de uploads
CREATE TABLE IF NOT EXISTS uploads (
  id           SERIAL PRIMARY KEY,
  clinic_id    INTEGER NOT NULL REFERENCES users(id),
  filename     TEXT NOT NULL,
  source       TEXT NOT NULL,
  total_rows   INTEGER DEFAULT 0,
  new_rows     INTEGER DEFAULT 0,
  updated_rows INTEGER DEFAULT 0,
  skipped_rows INTEGER DEFAULT 0,
  uploaded_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔄 Lógica de Merge (Upload de XLSX)

As planilhas (ClinicCorp, Simples Dental) são convertidas para JSON, e cada paciente é integrado no DB.

**Regra de Ouro do Upsert:**
1. A chave de unificação é `tel` (apenas os dígitos numéricos) + `clinic_id`.
2. **Se encontrar:** Atualiza apenas campos acessórios (`proc`, `valor`, `data_orcamento`), **preservando intacto o progresso do Kanban** (`col`, `tent`, `obs`, `res`, `dt`).
3. **Se não encontrar:** Insere novo (na coluna `ligar` com tentativas `0`).

---

## 🎨 Design System & UI

O projeto foca em uma interface sofisticada e premium para as clínicas:

- **Login:** Dark Mode/Glassmorphism (`backdrop-filter: blur(24px)`), paleta centrada na cor laranja (`#EC6726`), feedbacks visuais animados.
- **Kanban:** Interface clara (`#F0F0F0`), cards distintos, paleta funcional:
  - `--cp`: Laranja (Principal)
  - `--cag`: Verde (`agendado`)
  - `--cop`: Azul (`em progresso`)
  - `--cfu`: Âmbar (`atenção`)
  - `--cre`: Vermelho (`erro`)

---

## 🚀 Deployment (Vercel & Supabase)

O deploy ocorre na Vercel consumindo um banco de dados hospedado no Supabase.

### Variáveis Necessárias (.env na Vercel)
```env
DATABASE_URL=postgresql://postgres:<senha>@<host-supabase>:5432/postgres
JWT_SECRET=<string longa aleatória>
WHATSAPP_SUPPORT=https://wa.me/5581986544577
NODE_ENV=production
```

> **Atenção:** Como o deploy ocorre via Vercel (ambiente Serverless), a conexão com o Supabase deve aceitar as requisições (geralmente usando SSL e Connection Pooling interno ou pgbouncer do Supabase).

---

## ⚠️ Regras Técnicas Críticas

1. **Vercel Serverless Functions:** As rotas são resolvidas via `vercel.json` encaminhando o tráfego para `server.js`.
2. **PostgreSQL Obrigatório:** Não utilizar módulos nativos como `better-sqlite3` que quebram o build da Vercel. O arquivo `db.js` deve carregar exclusivamente o `db-postgres.js`.
3. **Nenhum Dado Fica no Repositório:** Senhas, Strings de Conexão, Chaves de API e planilhas XLSX sensíveis não sobem para o GitHub.
