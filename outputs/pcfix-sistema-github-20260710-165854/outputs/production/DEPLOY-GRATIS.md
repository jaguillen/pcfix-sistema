# Montar PCFix gratis con subdominio

## Opcion recomendada: Render

Render permite publicar:

- Frontend estatico gratis.
- Backend Node desde plan free.
- Subdominio gratis tipo:
  - `https://pcfix-sistema.onrender.com`
  - `https://pcfix-backend.onrender.com`

Fuente: Render muestra Static Sites a `$0`, Web Services desde `$0`, custom domains/TLS y plan Hobby `$0`.

## Importante sobre "dominio gratis"

Un dominio real tipo `pcfixcomitan.com` normalmente es de pago.
Lo gratuito y recomendable para empezar es usar un subdominio del proveedor:

- Render: `tusitio.onrender.com`
- Vercel: `tusitio.vercel.app`
- Cloudflare Pages: `tusitio.pages.dev`
- DuckDNS: `tusitio.duckdns.org`
- No-IP: `tusitio.no-ip.info`

Para este sistema, el mejor balance gratis es Render porque puede hospedar frontend y backend.

## Preparacion

Ya se agrego `render.yaml` en la raiz del proyecto.

Render detectara dos servicios:

1. `pcfix-backend`
   - Usa `outputs/production/no-npm-backend`
   - No necesita `npm install`
   - Comando: `node server.js`

2. `pcfix-sistema`
   - Usa `outputs`
   - Publica `index.html`, `app.js`, `styles.css`

## Pasos en Render

1. Crea cuenta en https://render.com
2. Sube este proyecto a GitHub.
3. En Render elige `New > Blueprint`.
4. Conecta el repositorio.
5. Render leera `render.yaml`.
6. Crea los dos servicios.

Cuando termine, Render te dara dos URLs:

```text
https://pcfix-backend.onrender.com
https://pcfix-sistema.onrender.com
```

Los nombres exactos pueden variar si ya estan ocupados.

## Conectar el sistema al backend

1. Abre la URL del frontend.
2. Entra a `Admin > Conexion backend`.
3. En URL del servidor escribe la URL del backend:

```text
https://pcfix-backend.onrender.com
```

4. Email:

```text
admin@pcfix.local
```

5. Password:

```text
Cambiar123!
```

6. Presiona `Conectar`.
7. Presiona `Subir datos locales`.
8. Activa `Modo servidor automatico`.

## Limitacion del plan gratis

El backend sin npm guarda datos en:

```text
data/pcfix-data.json
```

En hosting gratuito, el almacenamiento local puede no ser permanente al reiniciar o redeployar.
Para uso real debes migrar a una base externa gratuita como Supabase o Neon, o contratar almacenamiento persistente.

## Alternativa estatica solamente

Si solo quieres publicar la app local sin backend:

- Cloudflare Pages
- Vercel
- Netlify
- Render Static Site

Pero en ese modo cada navegador guarda sus propios datos en `localStorage`.

## Alternativa con PC de la tienda como servidor

Si quieres que la PC de PCFix sea el servidor:

1. Ejecuta `outputs/iniciar-produccion-pcfix.bat`.
2. Usa DuckDNS o No-IP para subdominio gratis.
3. Configura el router para redirigir puerto 8080.

Esto requiere revisar seguridad, firewall y HTTPS antes de usarlo con clientes reales.
