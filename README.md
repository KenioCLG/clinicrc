# ClinicRC

Micro SaaS v1 para retorno comercial de pacientes.

## Caminho local

```powershell
C:\Users\kenio\clinicrc
```

## Arquitetura

- `public/`: frontend publicado no Firebase Hosting.
- `functions/`: backend seguro em Cloud Functions.
- `firestore.rules`: bloqueia acesso direto do navegador ao Firestore.
- `public/js/api.js`: cliente HTTP que chama o backend autenticado por Firebase Auth.

## Design system

A interface segue o arquivo de referencia `C:\Users\kenio\Downloads\CLAUDE.md`:

- Paleta Clinicorp/Diva Page com `--cp: #EC6726` e header `--chbg: #292D36`.
- Tipografia Roboto + Material Icons.
- Kanban com 4 colunas: Para Ligar, Em Contato, Agendado e Finalizado.
- Roteiro lateral com 5 tentativas e blocos PNL/SPIN.
- Modal de finalizacao com `agendou`, `procedimento`, `sem-interesse` e `sem-resposta`.

Observacao de seguranca: o CLAUDE.md original sugere Firestore publico em modo teste. Nesta v1 SaaS mantemos Firestore bloqueado no cliente e todas as leituras/escritas passam pelo backend.

## Deploy no Warp / PowerShell

Use `firebase.cmd`, nao `firebase`, para evitar o bloqueio de execucao de scripts `.ps1` no Windows.

```powershell
cd C:\Users\kenio\clinicrc
firebase.cmd login --reauth
firebase.cmd use clinicrc-8ba64
firebase.cmd deploy --only firestore:rules,hosting,functions
```

Depois do deploy, o app fica em:

```text
https://clinicrc-8ba64.web.app
```

## Configuracao obrigatoria do login Google

Se aparecer `auth/internal-error` no login com Google, valide estes pontos no Firebase Console:

- Authentication > clique em `Primeiros passos` / `Get started`, se ainda nao tiver inicializado.
- Authentication > Sign-in method > habilitar `Google`.
- Authentication > Sign-in method > habilitar `Email/Senha`.
- Authentication > Settings > Authorized domains > incluir `clinicrc-8ba64.web.app`.
- Em Google provider, preencher o email de suporte do projeto.

## Criar usuario inicial

Depois de habilitar Authentication no Firebase Console, crie um usuario por script:

```powershell
cd C:\Users\kenio\clinicrc
powershell -ExecutionPolicy Bypass -File .\scripts\create-user.ps1 -Email "admin@clinicrc.app" -ClinicName "ClinicRC Admin"
```

O script gera uma senha forte, cria o usuario no Firebase Auth e tenta criar a clinica inicial via Cloud Functions.

## Observacao importante

Cloud Functions normalmente exige que o projeto Firebase esteja no plano Blaze. Se o deploy de `functions` pedir billing, ative o plano Blaze no Firebase Console e rode o deploy novamente.

## Importacao de pacientes

Formatos aceitos na v1:

- XML
- CSV
- XLS
- XLSX

Colunas reconhecidas:

- `nome` ou `name`
- `telefone` ou `phone`
- `procedimento` ou `procedure`
- `valor` ou `value`
- `observacao`, `obs` ou `notes`
- `status`

Limite atual: 500 pacientes por importacao e arquivo ate 5 MB.
