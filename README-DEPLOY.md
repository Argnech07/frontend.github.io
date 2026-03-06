# Deploy Frontend Angular en Render.com

## Preparación

1. Ve a [dashboard.render.com](https://dashboard.render.com)
2. Clic en **"+ New"** → **"Static Site"**
3. Conecta tu repositorio de GitHub

## Configuración

### Build Command:
```bash
npm install && npm run build
```

### Publish Directory:
```
dist/vita-care
```

### Variables de Entorno (opcional):
- `NODE_VERSION`: 20

## SPA Routing (Redirección)

Añade en las rutas del servicio:
- **Source**: `/.*`
- **Destination**: `/index.html`

Esto permite que Angular maneje el enrutamiento del lado del cliente.

## Configuración Backend URL

El archivo `src/environments/environment.ts` ya está configurado:
```typescript
apiUrl: 'https://vitacare-backend-5iud.onrender.com'
```

## Despliegue

1. El archivo `render.yaml` en la raíz del proyecto contiene la configuración automática
2. Render detectará este archivo y configurará todo automáticamente
3. O configura manualmente con los valores de arriba

## URL Esperada

Una vez desplegado, tu frontend estará en:
`https://vitacare-frontend-xxxx.onrender.com`

## Notas

- El frontend es una SPA (Single Page Application)
- Todas las llamadas API van al backend de Render
- El QR generará URLs apuntando al backend para verificación global
