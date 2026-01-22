# Branch Protection Setup Guide

Esta guía te ayudará a configurar las reglas de protección para las ramas `main` y `develop`.

## 📍 Acceder a Branch Protection

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (⚙️)
3. En el menú lateral, click en **Branches**
4. Click en **Add branch protection rule**

## 🛡️ Protección para `main` (Producción)

### Paso 1: Branch name pattern

```
main
```

### Paso 2: Configurar reglas

#### ✅ Require a pull request before merging

Marca esta opción y configura:

- [x] **Require approvals**: 1
  - Require approval from Code Owners: ❌ (opcional - actívalo si tienes CODEOWNERS)
  - Dismiss stale pull request approvals when new commits are pushed: ✅
  - Require review from Code Owners: ❌

#### ✅ Require status checks to pass before merging

Marca esta opción y configura:

- [x] **Require branches to be up to date before merging**: ✅

**Status checks that are required:**
- Busca y selecciona: `CI Success` (aparecerá después del primer run del workflow)
- O espera a que aparezca después de crear tu primer PR

#### ✅ Require conversation resolution before merging

- [x] Activado ✅

#### ✅ Require signed commits

- [ ] Desactivado ❌ (opcional - actívalo si quieres commits firmados)

#### ✅ Require linear history

- [ ] Desactivado ❌ (permite merge commits)

#### ✅ Require deployments to succeed before merging

- [ ] Desactivado ❌ (el deployment ocurre DESPUÉS del merge)

#### ✅ Lock branch

- [ ] Desactivado ❌

#### ✅ Do not allow bypassing the above settings

- [x] Activado ✅
  - Esto asegura que NADIE (ni siquiera admins) pueda saltarse las reglas

#### ✅ Restrict who can push to matching branches

- [ ] Desactivado ❌
  - O activado y agregar solo a admins si quieres control extra

#### ✅ Allow force pushes

- [ ] Desactivado ❌ ⚠️ IMPORTANTE: Nunca permitir force push en main

#### ✅ Allow deletions

- [ ] Desactivado ❌ ⚠️ IMPORTANTE: Nunca permitir borrar main

### Paso 3: Guardar

Click en **Create** o **Save changes**

---

## 🔧 Protección para `develop` (Development)

### Paso 1: Branch name pattern

```
develop
```

### Paso 2: Configurar reglas

#### ✅ Require a pull request before merging

Marca esta opción y configura:

- [x] **Require approvals**: 0 (o 1 si prefieres más control)
  - Permite desarrollo más ágil
  - Pero igual requiere que CI pase

#### ✅ Require status checks to pass before merging

Marca esta opción y configura:

- [x] **Require branches to be up to date before merging**: ✅

**Status checks that are required:**
- Busca y selecciona: `CI Success`

#### ✅ Require conversation resolution before merging

- [x] Activado ✅ (opcional pero recomendado)

#### ✅ Do not allow bypassing the above settings

- [ ] Desactivado ❌
  - Permite que admins puedan bypass si es necesario

#### ✅ Allow force pushes

- [ ] Desactivado ❌

#### ✅ Allow deletions

- [ ] Desactivado ❌

### Paso 3: Guardar

Click en **Create** o **Save changes**

---

## 🎯 Resumen de Configuración

| Configuración | main | develop |
|--------------|------|---------|
| Requiere PR | ✅ (1 aprobación) | ✅ (0 aprobaciones) |
| CI debe pasar | ✅ | ✅ |
| Branch actualizada | ✅ | ✅ |
| Resolver conversaciones | ✅ | ✅ |
| No bypass | ✅ | ❌ |
| Force push | ❌ | ❌ |
| Permitir borrar | ❌ | ❌ |

## ✨ Después de Configurar

### 1. Verifica que funciona

Intenta hacer push directo a main:

```bash
git checkout main
echo "test" >> test.txt
git add .
git commit -m "test direct push"
git push origin main
```

**Resultado esperado:**
```
❌ remote: error: GH006: Protected branch update failed
```

### 2. Workflow normal

```bash
# ✅ Correcto
git checkout -b feature/test
git add .
git commit -m "feat: test"
git push origin feature/test
# Luego crear PR en GitHub
```

## 🔍 Verificar Status Checks

Los status checks (`CI Success`) aparecerán automáticamente después de:

1. Hacer push a una rama
2. Esperar a que GitHub Actions ejecute
3. Refrescar la página de Branch Protection
4. Los checks aparecerán en la lista para seleccionar

**Nota:** Si no aparecen inmediatamente:
- Espera a que se ejecute al menos una vez el workflow de CI
- Refresca la página de settings
- Busca "CI Success" o el nombre exacto del job

## 🆘 Troubleshooting

### "Status checks not found"

**Solución:**
1. Ve a Actions tab
2. Ejecuta manualmente el workflow "CI"
3. Espera a que complete
4. Vuelve a Branch Protection y refresca

### "Cannot enable branch protection"

**Causa:** No tienes permisos de admin

**Solución:** Pide a un admin del repo que lo configure

### Quiero hacer un hotfix urgente

```bash
# Opción 1: Crear PR rápido (recomendado)
git checkout -b hotfix/critical-fix main
# hacer fix
git push origin hotfix/critical-fix
# Crear PR, marcar como urgent, mergear cuando CI pase

# Opción 2: Admin puede temporalmente deshabilitar protection
# (No recomendado - solo en emergencias)
```

## 📚 Más Información

- [GitHub Docs: Protected Branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Best Practices for Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#best-practices)

---

**¿Preguntas?** Abre un issue o consulta al equipo.
