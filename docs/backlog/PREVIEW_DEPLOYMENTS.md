# Preview Deployments Setup

Cómo configurar deployments automáticos de preview para cada Pull Request.

## 🎯 Objetivo

Cuando abres un PR, automáticamente obtener:
- ✅ **Frontend Preview** (Vercel) - URL única para la web
- ✅ **Backend Preview** (Railway) - URL única para la API
- ✅ **Comentario automático** en el PR con ambos links

---

## 📦 Frontend Preview (Vercel) - ✅ YA FUNCIONA

Vercel **ya está configurado** para crear preview deployments automáticamente.

### Cómo funciona:
1. Abres un PR
2. Vercel automáticamente:
   - Hace build del frontend
   - Crea una URL única tipo: `dev-arena-bett-git-feature-branch-quiniapps.vercel.app`
   - Comenta en el PR con el link

### Encontrar el link:
- Busca el comentario del **Vercel bot** en tu PR
- O ve a: [Vercel Dashboard](https://vercel.com/quiniapps-projects/dev-arena-bett) → Deployments

---

## 🚂 Backend Preview (Railway) - ⚠️ NECESITA CONFIGURACIÓN

### Paso 1: Habilitar PR Deployments

1. Ve a [Railway Dashboard](https://railway.app)
2. Abre tu proyecto
3. Click en el servicio **API**
4. Ve a **Settings** (⚙️ en la sidebar)
5. Busca la sección **"Environments"**
6. En "PR Deployments":
   - ✅ Activa **"Create ephemeral environments from Pull Requests"**
   - Base Branch: `develop`
   - Service Filters: deja en blanco (o selecciona solo API)

### Paso 2: Configurar Variables de Entorno para PR

Las variables de entorno se heredan del environment base (develop), pero puedes sobrescribir algunas:

**Opción A: Heredar todo de develop** (Recomendado)
- No hagas nada, Railway copiará todas las vars de develop
- Solo actualiza `ALLOWED_ORIGINS` si es necesario

**Opción B: Usar base de datos separada para PRs**
1. Crea un servicio PostgreSQL separado para "preview"
2. En PR environment vars, configura:
   ```bash
   DATABASE_URL=${{Postgres-Preview.DATABASE_URL}}
   ```

### Paso 3: Resultado

Ahora, cada vez que abras un PR:

1. **Railway automáticamente**:
   - Detecta el PR
   - Crea un environment temporal
   - Hace build y deploy de la API
   - Genera URL tipo: `pr-123-api-bets-online.up.railway.app`

2. **GitHub Actions**:
   - Comenta en el PR con el link del preview
   - Actualiza el comentario en cada nuevo commit

3. **Cleanup automático**:
   - Cuando cierras/merges el PR, Railway elimina el environment

---

## 🔧 Configuración de CORS para Previews

**Importante**: El frontend preview necesita poder comunicarse con el backend preview.

### En Railway - Variables de Entorno del PR:

Cuando Railway crea el PR environment, agrega esta variable:

```bash
ALLOWED_ORIGINS=https://dev-arena-bett-git-[branch-name]-quiniapps.vercel.app,https://dev-arena-bett.vercel.app
```

**Nota**: Reemplaza `[branch-name]` con el nombre de tu branch.

O para aceptar todos los previews de Vercel (menos seguro pero más fácil):

```bash
ALLOWED_ORIGINS=https://*.vercel.app
```

---

## 📝 Workflow de Testing con Preview

### Cuando abres un PR:

1. **Abres el PR** en GitHub
2. **Esperas ~2-3 minutos** mientras:
   - ✅ Vercel hace build del frontend
   - ✅ Railway hace build del backend
   - ✅ GitHub Actions valida el build
3. **Aparecen comentarios** con:
   - Link de Vercel (del bot de Vercel)
   - Link de Railway (del workflow de GitHub)
4. **Testas** usando ambos links
5. **Haces cambios** → push
6. **Preview se actualiza automáticamente**

### Ejemplo de URLs:

```
Frontend: https://dev-arena-bett-git-feature-auth-quiniapps.vercel.app
Backend:  https://pr-42-api-bets-online.up.railway.app
API Docs: https://pr-42-api-bets-online.up.railway.app/doc
```

---

## 🎨 Personalizar el comentario del workflow (Opcional)

Después de habilitar Railway PR deployments, puedes actualizar el workflow para mostrar la URL real:

1. Edita `.github/workflows/preview-deploy.yml`
2. Busca la línea:
   ```javascript
   const backendUrl = `https://bets-online-api-production-XXXX.up.railway.app`;
   ```
3. Reemplaza con el patrón real de tu proyecto:
   ```javascript
   const backendUrl = `https://pr-${prNumber}-api-bets-online.up.railway.app`;
   ```

---

## 💰 Consideraciones de Costos

### Railway PR Deployments:
- ⚠️ **Cada PR environment consume recursos**
- Se cobran como un servicio adicional mientras está activo
- Se eliminan automáticamente al cerrar el PR
- **Recomendación**: Cierra PRs viejos que ya no necesitas

### Vercel:
- ✅ Preview deployments son **gratis** en el plan Pro
- No hay límite de previews activos

---

## 🐛 Troubleshooting

### "El frontend preview no puede conectarse al backend preview"
- Verifica `ALLOWED_ORIGINS` en Railway PR environment
- Agrega la URL de Vercel preview a los origins permitidos

### "Railway no está creando PR deployments"
- Verifica que "PR Deployments" esté habilitado en Settings
- Verifica que el PR sea contra la branch base correcta (develop)
- Revisa los logs de Railway para errores de build

### "El comentario de GitHub no muestra el link de Railway"
- El workflow muestra advertencia si PR deployments no están configurados
- Habilita PR deployments en Railway primero
- Actualiza el workflow con la URL correcta (ver sección de personalización)

---

## ✅ Checklist de Setup

- [ ] Vercel preview deployments funcionando (ya está ✅)
- [ ] Railway PR deployments habilitado
- [ ] Variables de entorno configuradas en Railway
- [ ] ALLOWED_ORIGINS incluye URLs de Vercel preview
- [ ] Workflow de GitHub actualizado (opcional)
- [ ] Probado con un PR de prueba

---

## 🚀 Próximos Pasos

Una vez configurado todo:

1. **Crea un PR de prueba**
2. **Verifica que aparezcan ambos links** (Vercel + Railway)
3. **Testa la aplicación** usando los previews
4. **Cierra PRs viejos** para liberar recursos

¡Listo! Ahora cada PR tendrá su propio ambiente completo para testing 🎉
