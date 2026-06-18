# QA - Resizer Mobile (Barra de Ajuste)

## Contexto

O layout mobile do ClinicRC tem 3 areas empilhadas:

```
+-------------------+
|   .sp (Roteiro)   |  <- grid-row 1: var(--sp-h, 40%)
+-------------------+
| === #resizer ===  |  <- grid-row 2: 24px fixo
+-------------------+
|   .kp (Kanban)    |  <- grid-row 3: 1fr (resto)
+-------------------+
```

O container `.pg.on` usa CSS Grid no mobile (`@media max-width: 1000px`):
```css
grid-template-rows: var(--sp-h, 40%) 24px 1fr;
```

## Comportamentos Esperados

### 1. DRAG (arrastar a barra)
- **Trigger:** Tocar e arrastar verticalmente a barra `#resizer`
- **Esperado:** O painel de roteiro (.sp) cresce/diminui conforme o dedo move
- **Mecanismo:** JS seta `--sp-h` como CSS variable no `#pg0`
- **Limite minimo:** 60px para .sp
- **Limite maximo:** `window.innerHeight - 36(header) - 104`

### 2. TAP (toque rapido sem mover)
- **Trigger:** Tocar e soltar a barra sem arrastar
- **Esperado:** Roteiro expande fullscreen, contatos somem
- **Mecanismo:** Classe `.script-full` no `#pg0` que muda grid para `1fr 24px 0px`
- **Icone muda:** `expand_more` -> `expand_less`
- **Tap novamente:** Restaura layout original

### 3. RESIZE (mudar orientacao/tamanho da janela)
- **Trigger:** Rotacionar dispositivo ou mudar tamanho da janela
- **Esperado:** Layout reseta para proporcao padrao (40/60)
- **Mecanismo:** Remove `--sp-h` e classe `.script-full`

## Checklist de Testes

### Teste A: Drag basico
- [ ] Abrir app no mobile (ou DevTools < 1000px)
- [ ] Arrastar barra para BAIXO — roteiro cresce, kanban diminui
- [ ] Arrastar barra para CIMA — roteiro diminui, kanban cresce
- [ ] Verificar que .sp nao fica menor que 60px
- [ ] Verificar que .kp nao desaparece completamente no drag

### Teste B: Tap toggle
- [ ] Tocar rapidamente na barra SEM arrastar
- [ ] Roteiro deve ocupar tela inteira
- [ ] Contatos (.kp) devem sumir
- [ ] Icone na barra muda para `expand_less`
- [ ] Tocar novamente — volta ao layout 40/60
- [ ] Icone volta para `expand_more`

### Teste C: Drag apos tap
- [ ] Fazer tap para expandir roteiro
- [ ] Arrastar a barra — deve sair do fullscreen e entrar no modo drag

### Teste D: Orientacao
- [ ] Arrastar barra para uma posicao customizada
- [ ] Rotacionar dispositivo
- [ ] Layout deve resetar para proporcao padrao

### Teste E: Desktop (nao deve afetar)
- [ ] Em tela > 1000px, tap na barra nao faz nada
- [ ] Drag horizontal funciona normalmente (largura do .sp)

## Debug: O que verificar se nao funciona

1. **Inspecionar `#pg0`:** Deve ter `display: grid` e `grid-template-rows`
2. **CSS variable:** Ao arrastar, `#pg0` deve ter `style="--sp-h: Xpx"` (nao `height` no `.sp`)
3. **Classe:** Ao fazer tap, `#pg0` deve ter classe `script-full`
4. **Inline styles no `.sp`:** NAO deve ter `height: Xpx` inline. Se tiver, e codigo antigo
5. **`flex-shrink: 0`:** No mobile, `.sp` deve ter `flex-shrink: unset` (override do base)

## Arquivos Relevantes

- CSS: `frontend/public/css/styles-v4.css` linhas 141-205 (media query mobile)
- JS: `frontend/public/js/app.js` buscar por `resizer` (~linha 1261)
- HTML: `frontend/public/app.html` linha 184 (`<div class="resizer" id="resizer">`)
