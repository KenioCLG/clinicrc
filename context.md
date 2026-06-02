# ClinicRC — Plataforma Multi-Clínica

> **Documento de contexto vivo.** Atualizado em: 02/06/2026
> Sempre consulte este arquivo antes de continuar o desenvolvimento.

---

## 📋 Visão Geral do Produto

**App:** ClinicRC — Plataforma de Retorno Ativo de Pacientes  
**Dono:** Kenio (dev + gestor)  
**Contato/Suporte:** WhatsApp `(81) 98654-4577` → `https://wa.me/5581986544577`  
**Função:** Sistema multi-tenant SaaS para clínicas odontológicas gerenciarem orçamentos em aberto via importação de planilhas XLSX e CRM Kanban  
**Versão atual:** 1.0 — Funcional local, aguardando deploy Railway

> **Origem:** Evolução do projeto "Diva Page" (single-client, Firebase).
> Firebase foi abandonado. O backend agora é 100% Node.js + SQLite.

---

## 🗂️ Estrutura de Arquivos

```
clinicrc/
├── backend/
│   ├── src/
│   │   ├── server.js              ← Entry point Express (porta 3000)
│   │   ├── db.js                  ← SQLite (better-sqlite3) + schema completo
│   │   ├── auth.js                ← createUser, login, verifyToken, getSupportLink
│   │   ├── middleware/
│   │   │   └── auth.middleware.js ← Valida JWT em rotas protegidas
│   │   ├── parsers/
│   │   │   ├── cliniccorp.parser.js      ← Parser planilha ClinicCorp
│   │   │   └── simples_dental.parser.js  ← Parser planilha Simples Dental
│   │   ├── routes/
│   │   │   ├── auth.routes.js     ← POST /auth/login, GET /auth/support
│   │   │   ├── patient.routes.js  ← CRUD pacientes (multi-tenant)
│   │   │   └── upload.routes.js   ← POST /upload, GET /upload/history
│   │   └── use-cases/
│   ├── data/
│   │   └── clinicrc.db            ← Banco SQLite (gitignored)
│   ├── .env                       ← Variáveis locais (gitignored)
│   └── package.json
├── frontend/
│   └── public/
│       ├── index.html             ← Tela de login (design dark glassmorphism)
│       ├── app.html               ← Kanban CRM principal
│       ├── upload.html            ← Upload de planilhas XLSX
│       ├── css/
│       │   └── styles.css         ← Design system do app
│       └── js/
│           ├── api-client.js      ← HTTP client (Bearer JWT)
│           └── app.js             ← Lógica Kanban + roteiros
├── seed-clientes.js               ← Script para criar contas (rodar do /backend)
├── railway.json                   ← Config de deploy Railway
├── .env.example                   ← Template de variáveis
├── .gitignore                     ← node_modules, .env, *.xlsx, data/
├── context.md                     ← Este arquivo
└── package.json                   ← root: start → node backend/src/server.js
```

---

## 👥 Usuários no Sistema

| ID | Clínica | Usuário | Senha | Tipo |
|---|---|---|---|---|
| 1 | Administrador | `admin` | `admin123` | Admin (Kenio) |
| 2 | Clínica Andreza Paz | `andreza` | `Andreza@2025` | Cliente |
| 3 | COP — Thames Bruno | `thames` | `Thames@2025` | Cliente |

> **Regra:** Cada clínica acessa **apenas seus próprios pacientes** (isolamento por `clinic_id` via JWT).
> Não existe auto-cadastro. O admin (Kenio) cria as contas manualmente.

---

## 🔐 Autenticação

- **Modelo:** username + senha → JWT 24h
- **Header:** `Authorization: Bearer <token>`
- **Suporte:** Link direto para WhatsApp do Kenio quando login falha
- **Endpoint:** `POST /auth/login` → `{ token, clinic_name, username }`
- **Suporte API:** `GET /auth/support` → `{ whatsapp: "https://wa.me/5581986544577" }`

### Fluxo JWT:
```
Login → JWT assinado com clinic_id, username, clinic_name
Qualquer rota protegida → middleware extrai clinic_id do JWT
Queries no banco → sempre filtram por clinic_id (multi-tenant)
```

---

## 🏗️ Stack Técnica

| Componente | Tecnologia |
|---|---|
| Runtime | Node.js v24+ |
| Framework | Express v5 |
| Banco de Dados | better-sqlite3 (SQLite local) |
| Auth | bcryptjs + jsonwebtoken |
| Upload | multer |
| XLSX parse | xlsx |
| Deploy alvo | Railway.app |
| Frontend | HTML + Vanilla JS + CSS (sem framework) |
| Fontes | Inter (login) + Roboto (app) + Material Icons/Symbols |

---

## 🗄️ Schema do Banco de Dados

```sql
-- Usuários (1 por clínica)
CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_name  TEXT NOT NULL,
  username     TEXT NOT NULL UNIQUE,
  password     TEXT NOT NULL,          -- bcrypt hash
  whatsapp     TEXT DEFAULT '',
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
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
  source          TEXT DEFAULT 'manual', -- 'cliniccorp' | 'simples_dental' | 'manual'
  source_status   TEXT DEFAULT NULL,
  profissional    TEXT DEFAULT NULL,
  data_orcamento  TEXT DEFAULT NULL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, clinic_id),
  UNIQUE(clinic_id, tel)               -- mesmo tel = mesmo paciente na clínica
);

-- Histórico de uploads
CREATE TABLE IF NOT EXISTS uploads (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id    INTEGER NOT NULL REFERENCES users(id),
  filename     TEXT NOT NULL,
  source       TEXT NOT NULL,
  total_rows   INTEGER DEFAULT 0,
  new_rows     INTEGER DEFAULT 0,
  updated_rows INTEGER DEFAULT 0,
  skipped_rows INTEGER DEFAULT 0,
  uploaded_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Valores de `col`:** `ligar` | `contato` | `agendado` | `final`  
**Valores de `res`:** `agendou` | `procedimento` | `sem-interesse` | `sem-resposta` | `null`

---

## 📊 Mapeamento das Planilhas XLSX

### ClinicCorp

```
Sheet: 'Relatório'
Col 5: Paciente         ← nome completo (pode ter espaço à esquerda)
Col 6: Telefone         ← sem formatação (ex: 81986848035)
Col 7: Procedimentos    ← texto livre
Col 8: Valor            ← valor com desconto
Col 2: Status           ← filtrar apenas "OPEN"
Col 4: Profissional
Col 0: Data Criação
```

Profissionais mapeados: `Yuri`, `Mykael`, `Mário Sousa`, `andreza alexandre da paz de souza`, `Thames Bruno`, `Viviane Andrade`

### Simples Dental

```
Sheet: 'Relatorio_orcamentos_por_status'
Col 1: Paciente         ← maiúsculas
Col 3: Celular          ← sem formatação
Col 6: Descrição        ← "Plano tratamento de <NOME>"
Col 7: Status           ← filtrar apenas "Em aberto"
Col 8: Valor            ← número puro (ex: 5200)
Col 0: Data
```

---

## 🔄 Lógica de Merge (Upload)

```
Nova planilha uploadada
    ↓
Para cada paciente:
    ├── Normaliza telefone (só dígitos)
    ├── Busca por (tel + clinic_id)
    │   ├── ENCONTROU → Atualiza: proc, valor, source_status, data_orcamento
    │   │                Preserva: col, tent, obs, res, dt  ← progresso CRM intacto
    │   └── NÃO ENCONTROU → INSERT (col='ligar', tent=0)
    ↓
Retorna: { total, new, updated, unchanged }
```

> **Regra de ouro:** O progresso de atendimento no Kanban **nunca é sobrescrito** por um re-upload.

---

## 🎨 Design System

### Login (index.html)
- **Fundo:** Dark `#0d1117` com orbs animados e grid sutil
- **Card:** Glassmorphism — `backdrop-filter: blur(24px)`, border translúcida
- **Cor primária:** `#EC6726` (laranja)
- **Fontes:** Inter + Material Symbols Rounded
- **Features:** toggle mostrar/ocultar senha, shake animation no erro, feedback verde no sucesso

### App (app.html + styles.css)
- **Header:** `#292D36` escuro
- **Background:** `#F0F0F0` cinza claro
- **Cards:** brancos com sombra suave
- **Fontes:** Roboto + Material Icons

### Variáveis CSS principais (app):
```css
--cp: #EC6726;    /* laranja principal */
--chbg: #292D36;  /* header */
--cbg: #F0F0F0;   /* background */
--cag: #66BB6A;   /* verde agendado */
--cop: #039BE5;   /* azul em progresso */
--cfu: #FFB74D;   /* âmbar atenção */
--cre: #F44336;   /* vermelho erro */
```

---

## 📝 Roteiros de Ligação (5 tentativas)

Cada tentativa tem roteiro PNL/SPIN com 3 caminhos:

| Tentativa | Técnica | Caminhos |
|---|---|---|
| 1ª | Rapport Empático (PNL) | A: Reagendar \| B: Recusa \| C: Outro local |
| 2ª | Continuidade + Problema (SPIN) | A: Reagendar \| B: Recusa \| C: Outro local |
| 3ª | Implicação Suave (SPIN) | A: Reagendar \| B: Recusa \| C: Outro local |
| 4ª | Need-Payoff + Acolhimento (SPIN+PNL) | A: Reagendar \| B: Custo \| C: Outro local |
| 5ª | Último Contato + Porta Aberta (PNL) | A: Reagendar \| B: Recusa \| C: Outro local |

**Oferta padrão:** Reavaliação gratuita + Limpeza R$ 180,00

---

## ✅ Status de Implementação

| Módulo | Status | Observação |
|---|---|---|
| `server.js` — Express + rotas | ✅ Funcional | Serve frontend estático + API |
| `db.js` — SQLite + schema | ✅ Funcional | WAL mode, foreign keys ON |
| `auth.js` — JWT + bcrypt | ✅ Funcional | 24h token |
| `auth.routes.js` — login + support | ✅ Funcional | GET /auth/support adicionado |
| `patient.routes.js` — CRUD | ✅ Funcional | Multi-tenant por clinic_id |
| `upload.routes.js` — xlsx | ✅ Funcional | ClinicCorp + Simples Dental |
| `cliniccorp.parser.js` | ✅ Funcional | Filtro OPEN |
| `simples_dental.parser.js` | ✅ Funcional | Filtro Em aberto |
| `index.html` — Login | ✅ Funcional | Dark glassmorphism, Material Symbols |
| `app.html` — Kanban CRM | ✅ Funcional | Botão Suporte no header |
| `upload.html` — Upload xlsx | ✅ Funcional | Histórico de uploads |
| `api-client.js` — HTTP client | ✅ Funcional | Bearer token automático |
| Criação de usuários clientes | ✅ Feito | andreza + thames criados |
| WhatsApp suporte | ✅ Configurado | (81) 98654-4577 em todo o sistema |
| Git / GitHub | ⏳ Pendente | Repositório ainda não criado |
| Deploy Railway | ⏳ Pendente | Aguardando push GitHub |
| Variáveis env Railway | ⏳ Pendente | Definidas no .env.example |

---

## 🚀 Próximos Passos (Deploy)

```
1. gh auth status                        ← verificar login GitHub CLI
2. gh repo create clinicrc --private     ← criar repo privado
3. git init && git add . && git commit   ← primeiro commit
4. git push -u origin main               ← push
5. railway login                         ← autenticar Railway
6. railway init && railway up            ← criar projeto + deploy
7. railway variables set JWT_SECRET=...  ← configurar env vars
8. Testar URL pública /health            ← confirmar deploy
```

### Variáveis necessárias no Railway:
```
JWT_SECRET=<string longa e aleatória — gerar nova para produção>
ADMIN_USER=admin
ADMIN_PASS=<senha forte>
WHATSAPP_SUPPORT=https://wa.me/5581986544577
NODE_ENV=production
```

> ⚠️ Após o deploy, rodar o seed de usuários clientes novamente (o banco Railway começa vazio).

---

## ⚠️ Notas Técnicas Importantes

1. **Multi-tenant:** toda query filtra por `clinic_id` do JWT — nunca mistura dados
2. **Chave de merge é o telefone normalizado** (só dígitos) — funciona para ambas planilhas
3. **SQLite no Railway:** usar volume persistente, não memória
4. **Frontend servido pelo Express** em `express.static()` — não é SPA separada
5. **CORS:** `*` em dev, configurar `CORS_ORIGIN` com domínio Railway em produção
6. **O seed de usuários** deve ser re-executado após o primeiro deploy (banco novo)
7. **Arquivos sample** `clinicorp_sample.xlsx` e `simples_dental_sample.xlsx` são gitignored (dados sensíveis)

---

## 🏛️ Legado — Referência

> Arquivos originais da Diva Page preservados na raiz:
> - `Diva_Page_-_Andreza_Paz.html` (versão Firebase completa)
> - `diva-page (1).html` (versão alternativa)
>
> Firebase foi **abandonado** — toda a lógica migrada para Node.js + SQLite.
