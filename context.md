# ClinicRC — Plataforma Multi-Clínica

## Instruções Persistentes de Design e Desenvolvimento

---

## 📋 Sobre o Projeto

**App:** ClinicRC — Plataforma de Gestão de Orçamentos em Aberto
**Função:** Sistema multi-tenant para gestão estratégica de leads odontológicos via importação de planilhas XLSX
**Versão:** 2.0 — Multi-Clínica (em construção)

> Esta é uma **evolução** do projeto original "Diva Page" (single-client, Firebase).
> O contexto da Diva Page está preservado na seção legada ao final deste arquivo.

---

## 🏗️ Arquitetura da Nova Plataforma

```
clinicrc/
├── backend/              ← Node.js (Express) — NEW
│   ├── src/
│   │   ├── server.js         ← Entry point Express
│   │   ├── db.js             ← SQLite (Better-SQLite3) + schema
│   │   ├── auth.js           ← Login + JWT
│   │   ├── middleware/
│   │   │   └── auth.middleware.js  ← Proteção de rotas
│   │   ├── parsers/
│   │   │   ├── cliniccorp.parser.js    ← Parser ClinicCorp XLSX
│   │   │   └── simples_dental.parser.js ← Parser Simples Dental XLSX
│   │   ├── routes/
│   │   │   ├── auth.routes.js      ← POST /login
│   │   │   ├── patient.routes.js   ← CRUD pacientes (multi-tenant)
│   │   │   └── upload.routes.js    ← POST /upload (xlsx)
│   │   └── ...
│   ├── data/
│   │   └── clinicrc.db       ← SQLite database (gitignore)
│   └── package.json
├── frontend/
│   └── public/
│       ├── index.html        ← Redireciona para login.html
│       ├── login.html        ← Tela de login (NOVA)
│       ├── app.html          ← Kanban principal (adaptado)
│       ├── upload.html       ← Upload de planilhas (NOVA)
│       └── js/
│           ├── api-client.js     ← HTTP client (Bearer token)
│           └── app.js            ← Lógica Kanban
├── clinicorp_sample.xlsx     ← Amostra real para referência
├── simples_dental_sample.xlsx
├── context.md                ← Este arquivo
└── package.json
```

---

## 🔥 Backend — Node.js + SQLite

### Stack Técnica

| Componente | Tecnologia |
|---|---|
| Runtime | Node.js v24+ |
| Framework | Express |
| Banco de Dados | Better-SQLite3 (SQLite local) |
| Autenticação | bcryptjs + jsonwebtoken (JWT) |
| Upload | multer |
| XLSX | xlsx |
| Deploy | Railway.app (20 dias para ir ao ar) |

### Schema do Banco de Dados

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
  tel             TEXT NOT NULL,         -- CHAVE DE MERGE — apenas dígitos
  proc            TEXT NOT NULL DEFAULT '',
  valor           TEXT NOT NULL DEFAULT 'R$ 0,00',
  col             TEXT NOT NULL DEFAULT 'ligar',
  tent            INTEGER NOT NULL DEFAULT 0,
  obs             TEXT DEFAULT '',
  res             TEXT DEFAULT NULL,
  dt              TEXT DEFAULT NULL,
  origem          TEXT NOT NULL DEFAULT 'manual',   -- 'cliniccorp' | 'simples_dental' | 'manual'
  status_origem   TEXT DEFAULT NULL,                -- status original da planilha
  upload_date     TEXT DEFAULT NULL,                -- data do último upload
  PRIMARY KEY (id, clinic_id)
);

-- Histórico de uploads
CREATE TABLE IF NOT EXISTS uploads (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_id    INTEGER NOT NULL REFERENCES users(id),
  filename     TEXT NOT NULL,
  source       TEXT NOT NULL,            -- 'cliniccorp' | 'simples_dental'
  total_rows   INTEGER DEFAULT 0,
  new_rows     INTEGER DEFAULT 0,
  updated_rows INTEGER DEFAULT 0,
  uploaded_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Campos `col` possíveis (Kanban):
`ligar` | `contato` | `agendado` | `final`

### Campos `res` possíveis (resultado):
`agendou` | `procedimento` | `sem-interesse` | `sem-resposta` | `null`

---

## 🔐 Autenticação

- **Modelo:** Nome de usuário + senha simples (sem Firebase Auth)
- **Token:** JWT com validade de 24h
- **Header:** `Authorization: Bearer <token>`
- **Suporte:** Se não conseguir logar, link direto para WhatsApp do admin (Kenio)
- **Admin controla** criação de usuários — não existe auto-cadastro

### Endpoint de Login:

```http
POST /api/auth/login
Content-Type: application/json

{ "username": "andreza", "password": "senha123" }

→ 200 OK
{ "token": "eyJ...", "clinic_name": "Clínica Andreza Paz", "username": "andreza" }

→ 401 Unauthorized
{ "error": "Usuário ou senha incorretos.", "support_link": "https://wa.me/55819..." }
```

---

## 📊 Mapeamento das Planilhas XLSX

### ClinicCorp (244 linhas encontradas nos samples)

```
Sheet: 'Relatório'

Col 0: Data Criação
Col 1: Data
Col 2: Status           ← "OPEN" (em aberto) | "APPROVED" (aprovado)
Col 3: Motivo
Col 4: Profissional
Col 5: Paciente         ← nome completo (vem com espaço à esquerda)
Col 6: Telefone         ← sem formatação (ex: 81986848035)
Col 7: Procedimentos    ← texto livre, múltiplos itens separados por vírgula
Col 8: Valor
Col 9: Valor Total Com Desconto
Col 10: Observações
Col 11: Como conheceu?
Col 12: Desconto-Porcentagem
Col 13: Desconto-Reais
Col 14: Valor Total
Col 15: Ticket Médio
```

**Filtro de importação:** Apenas status `OPEN` (orçamentos em aberto)
**Chave de merge:** `tel` normalizado (somente dígitos)

Profissionais encontrados: `Yuri`, `Mykael`, `Mário Sousa`, `andreza alexandre da paz de souza`, `Thames Bruno`, `Viviane Andrade`

### Simples Dental (125 linhas encontradas nos samples)

```
Sheet: 'Relatorio_orcamentos_por_status'

Col 0: Data
Col 1: Paciente         ← nome completo em maiúsculas
Col 2: Documento        ← CPF
Col 3: Celular Paciente ← sem formatação (ex: 81999396615)
Col 4: E-mail
Col 5: Celular Responsável
Col 6: Descrição        ← "Plano tratamento de <NOME>"
Col 7: Status do orçamento ← "Em aberto" | "Reprovado"
Col 8: Valor            ← número puro (ex: 5200)
```

**Filtro de importação:** Apenas status `Em aberto`
**Chave de merge:** `tel` normalizado (somente dígitos)

---

## 🔄 Lógica de Merge de Planilhas

```
ENTRADA: Nova planilha xlsx (Dia 2)
    ↓
Para cada paciente na planilha:
    ├── Normaliza telefone (só dígitos)
    ├── Busca no DB por (tel + clinic_id)
    │   ├── ENCONTROU → Atualiza apenas: proc, valor, status_origem, upload_date
    │   │                Preserva: col, tent, obs, res, dt  ← progresso do Kanban
    │   └── NÃO ENCONTROU → INSERT novo paciente (col='ligar', tent=0)
    ↓
SAÍDA: Relatório { novos: N, atualizados: M, total: N+M }
```

**Regra de ouro:** O progresso de atendimento (coluna Kanban, tentativas, observações) **nunca é sobrescrito** por um re-upload.

---

## 🚀 Deploy — Railway.app

**Prazo:** 20 dias a partir de 01/06/2026

```
Semana 1: Código local rodando (Node.js + SQLite)
Semana 2: GitHub + Railway configurado (1 clique = no ar)
Semana 3: Testes com clientes reais + ajustes
```

- Push no GitHub → deploy automático em ~2 minutos
- HTTPS automático (link público seguro)
- SQLite persiste no volume do Railway
- Plano gratuito tem $5/mês em créditos (suficiente no início)

---

## 🎨 Design System (Mantido da Diva Page)

### Paleta de Cores (CSS Variables)

```css
:root {
  /* Primária */
  --cp: #EC6726;        /* Laranja principal — botões, destaques */
  --cpd: #c45420;       /* Laranja escuro — hover */

  /* Interface */
  --chbg: #292D36;      /* Header/sidebar — cinza escuro */
  --cbg: #F0F0F0;       /* Background geral */
  --cs: #FFFFFF;        /* Cards e superfícies */
  --ct: #333333;        /* Texto principal */
  --cts: rgba(0,0,0,0.54); /* Texto secundário */
  --cdiv: #E0E0E0;      /* Divisores */
  --cibg: #EAEAEB;      /* Inputs background */

  /* Status / Semânticas */
  --cag: #66BB6A;       /* Verde — agendado/sucesso */
  --cop: #039BE5;       /* Azul — em progresso */
  --cfu: #FFB74D;       /* Âmbar — atenção/em contato */
  --cre: #F44336;       /* Vermelho — erro/sem interesse */
  --csu: #4CAF50;       /* Verde valor monetário */
}
```

### Tipografia

- **Família:** `'Roboto', Helvetica, Arial, sans-serif`
- **Ícones:** Material Icons (Google Fonts)
- Classe `.mi` → `font-family: 'Material Icons'; font-size: 20px;`

---

## 🧩 Componentes Principais

### Kanban — 4 Colunas

| Coluna     | Cor header               | Cor borda   | Badge cor                  |
| ---------- | ------------------------ | ----------- | -------------------------- |
| Para Ligar | `#EDE7F6` roxo claro   | `#7E57C2` | `#7E57C2`                |
| Em Contato | `#FFF8E1` âmbar claro | `--cfu`   | `--cfu` + texto `#333` |
| Agendado   | `#E8F5E9` verde claro  | `--cag`   | `--cag`                  |
| Finalizado | `#F5F5F5` cinza        | `#9E9E9E` | `#9E9E9E`                |

### Cards de Paciente

- Background branco, border `--cdiv`, border-radius `4px`
- Selecionado: `border-color: --cp`, box-shadow laranja suave
- Nome em bold 12px, telefone em cinza 11px
- Badge procedimento: fundo `#E3F2FD`, texto `#0277BD`
- Valor: bold 12px, cor `--csu`
- Dots de tentativa (1-5): azul preenchido = feito, laranja borda = próximo
- Textarea de obs: fundo `--cibg`, border `rgba(0,0,0,.1)`

---

## 🔄 Lógica de Negócio — Kanban

### Fluxo

```
Para Ligar → Em Contato → Agendado → Finalizado
     ↑_____________↑         ↑
          (pode voltar)    (pode voltar para Em Contato)
```

### Tentativas (1 a 5)

- Cada dot clicado incrementa/decrementa `tent`
- Ao incrementar tent enquanto `col === 'ligar'`, move automaticamente para `col === 'contato'`
- O roteiro exibido corresponde ao número da tentativa atual

### Finalização

Ao clicar "Finalizar", abre modal com 4 opções:

1. **Agendou** → `res: 'agendou'`
2. **Já realizou** → `res: 'procedimento'`
3. **Sem interesse** → `res: 'sem-interesse'`
4. **Sem resposta** → `res: 'sem-resposta'`

Todas movem para `col: 'final'` e registram `dt` (data BR).

---

## 📝 Roteiros de Ligação (5 Tentativas)

1. **1ª** — Rapport Empático (PNL) — Primeiro contato
2. **2ª** — Continuidade + Problema (SPIN) — Segundo contato
3. **3ª** — Implicação Suave (SPIN) — Terceira tentativa
4. **4ª** — Need-Payoff + Acolhimento (SPIN+PNL) — Quarta tentativa
5. **5ª** — Último Contato + Porta Aberta (PNL) — Encerramento positivo

Cada roteiro tem 3 caminhos:

- **A** → Paciente abre para reagendar → oferecer reavaliação gratuita
- **B** → Recusa → oferecer reavaliação grátis + limpeza R$ 180,00
- **C** → Já fez em outro local → oferecer limpeza R$ 180,00

---

## 📦 Dependências Instaladas

### Root (`/clinicrc/package.json`)

```json
"xlsx": "^0.18.5"
```

### Backend (`/clinicrc/backend/package.json`)

```json
"express": "^4.x",
"better-sqlite3": "^x.x",
"bcryptjs": "^x.x",
"jsonwebtoken": "^x.x",
"multer": "^x.x",
"cors": "^x.x",
"dotenv": "^x.x"
```

---

## 📋 Status da Implementação

| Passo | Módulo | Status |
|---|---|---|
| 1 | `backend/src/server.js` (Express básico) | ⏳ Em andamento |
| 2 | `backend/src/db.js` (SQLite + schema) | ✅ Criado |
| 3 | `backend/src/auth.js` (login + JWT) | ✅ Criado |
| 3.1 | `backend/src/middleware/auth.middleware.js` | ✅ Criado |
| 4 | `backend/src/parsers/cliniccorp.parser.js` | ✅ Criado |
| 4.1 | `backend/src/parsers/simples_dental.parser.js` | ⏳ Em andamento |
| 5 | Rotas de pacientes (CRUD multi-tenant) | ❌ Pendente |
| 6 | Rota de upload xlsx | ❌ Pendente |
| 7 | Frontend: tela de login | ❌ Pendente |
| 8 | Frontend: upload de planilhas | ❌ Pendente |
| 9 | Adaptar Kanban para usar API (não Firebase) | ❌ Pendente |
| 10 | Configurar Railway.app (deploy) | ❌ Pendente |

---

## ⚠️ Notas Importantes da Nova Arquitetura

1. **Multi-tenant por `clinic_id`** — toda query filtra por `clinic_id` extraído do JWT
2. **Chave de merge é o telefone normalizado** (só dígitos) — funciona para ambas as planilhas
3. **SQLite na produção** com Railway volume — não usar em memória
4. **JWT no localStorage** do frontend → enviado como `Bearer` em toda requisição à API
5. **Firebase foi abandonado** nesta versão — o novo backend é Node.js + SQLite
6. **Arquivos sample** `clinicorp_sample.xlsx` e `simples_dental_sample.xlsx` estão no root para referência dos parsers

---

## 🏛️ Legado — Diva Page (Referência)

> O app original (Firebase + HTML único) ainda existe nos arquivos:
> - `Diva_Page_-_Andreza_Paz.html` (versão completa)
> - `diva-page (1).html` (versão alternativa)
> - `frontend/public/app.html` (versão Cloudflare D1)
>
> Firebase config do projeto original:
> ```js
> const firebaseConfig = {
>   apiKey: "AIzaSyCFR9jmFYTuvdDRj9p8AK7rXTRZEbUGIo8",
>   authDomain: "clinicrc-8ba64.firebaseapp.com",
>   projectId: "clinicrc-8ba64",
>   storageBucket: "clinicrc-8ba64.firebasestorage.app",
>   messagingSenderId: "325046795760",
>   appId: "1:325046795760:web:f5b67f94b13b03f41c3135",
>   measurementId: "G-TYFQ5WE761"
> };
> ```
> Coleção Firestore: `pacientes_andreza_paz`
