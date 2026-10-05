# Branch protection

Estado 2026-10-04: `main` y `develop` **no tienen** reglas ni rulesets (verificado con `gh api repos/quiniapp/bets-online/rulesets` y `.../branches/<rama>/protection`). Esta guía es lo que hay que configurar. Requiere permiso de admin en `quiniapp/bets-online`.

Usar **Rulesets** (Settings → Rules → Rulesets → New branch ruleset). Las "classic branch protection rules" siguen existiendo pero son el mecanismo legado.

## `main` (producción)

Ruleset `main`, target branch `main`, enforcement **Active**:

- Restrict deletions ✅
- Block force pushes ✅
- Require a pull request before merging ✅
  - Required approvals: 1
  - Dismiss stale pull request approvals when new commits are pushed ✅
  - Require conversation resolution before merging ✅
- Require status checks to pass ✅
  - Require branches to be up to date before merging ✅
  - Checks: `CI Success` (workflow CI), `Secret Scan (gitleaks)` (workflow Security), `Analyze (javascript-typescript)` (workflow CodeQL)
- Bypass list: vacía

`Dependency Audit` (workflow Security) hoy falla en `develop` por una vulnerabilidad critical; agregarla como check requerido recién cuando esté verde, o bloquea todo.

## `develop` (integración)

Ruleset `develop`, target branch `develop`, enforcement **Active**:

- Restrict deletions ✅
- Block force pushes ✅
- Require a pull request before merging ✅ (0 aprobaciones)
- Require status checks to pass: `CI Success`, `Secret Scan (gitleaks)`
- Bypass list: solo "Repository admin", para emergencias

Los nombres de los checks aparecen en el selector después de que cada workflow corrió al menos una vez; si no aparecen, correr CI en cualquier rama y refrescar.

## Verificar

```bash
gh api repos/quiniapp/bets-online/rulesets --jq '.[] | {name, enforcement}'
```

Y en la UI: Settings → Rules → Rulesets debe listar `main` y `develop` como Active.

## Hotfix urgente

Rama `hotfix/<tema>` desde `main`, PR a `main` con CI verde, y después mergear `main` en `develop`. No deshabilitar las reglas.
