# ClinicRC - Design System (Pencil Project)

## Arquivos

- `clinicrc-wireframes.ep` — Wireframes completos do app (abrir no Pencil)
- `content.xml` — Indice de paginas com metadados e notas

## Como usar

1. Baixe o [Pencil Project](https://pencil.evolus.vn/) (gratuito, multiplataforma)
2. Abra `clinicrc-wireframes.ep` no Pencil
3. Navegue pelas 12 paginas no painel lateral

## Mapa de Telas

| # | Pagina | Tipo | Descricao |
|---|--------|------|-----------|
| 01 | Login | Tela | Autenticacao Supabase Auth |
| 02 | CRM Kanban (pg0) | Tela | Layout split: Script + Kanban com colunas dinamicas |
| 03 | Relatorios (pg1) | Tela | Dashboard KPIs + graficos + tabela |
| 04 | Odontograma (pg2) | Tela | Chart SVG FDI + procedimentos em aberto |
| 05 | Config Kanban (pg3) | Tela | Gerenciar colunas do funil |
| 06 | Modal Lead | Modal | Adicionar/editar paciente (8 campos) |
| 07 | Modal Retorno | Modal | Agendar retorno de ligacao |
| 08 | Modal Resultado | Modal | Finalizar contato (4 opcoes) |
| 09 | Modal Procedimento | Modal | Registrar procedimento clinico |
| 10 | Modal Personalizar | Modal | White-label cores RGB |
| 11 | Kanban Mobile | Tela | Responsivo 375px |
| 12 | Painel Retornos | Painel | Lista de retornos agendados (bell) |

## Design Tokens

| Token | Valor | Uso |
|-------|-------|-----|
| `--cp` | #EC6726 | Cor primaria (laranja) |
| `--cbg` | #F3F4F6 | Background |
| `--cs` | #FFFFFF | Surface |
| `--ct` | #1F2937 | Texto principal |
| `--cts` | #6B7280 | Texto secundario |
| `--cdiv` | #E5E7EB | Divisores |
| Font | Inter / system | Sans-serif stack |

## Fluxo de Navegacao

```
Login → Kanban (pg0) ←→ Relatorios (pg1)
                     ←→ Odontograma (pg2)
                     ←→ Config (pg3)

Kanban Card → Modal Lead (editar)
           → Modal Resultado (finalizar)
           → Modal Retorno (agendar)
           → Odontograma (abrir)

Odontograma → Modal Procedimento (registrar)

Header Bell → Painel Retornos
Header Avatar → Logout
Header Menu → Modal Personalizar
```
