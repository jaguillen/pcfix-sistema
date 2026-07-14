# PCFix en Android

## Opcion recomendada: app instalable PWA

La carpeta `outputs` ya incluye:

- `manifest.webmanifest`
- `service-worker.js`
- `assets/app-icon.svg`

Cuando el sistema este publicado con HTTPS, Android permite instalarlo como app:

1. Abre `https://pcfix-sistema.onrender.com` en Chrome de Android.
2. Toca el menu de tres puntos.
3. Elige `Agregar a pantalla principal` o `Instalar app`.
4. Confirma `PCFix`.

La app abrira sin barra de navegador y usara el mismo backend conectado en Render.

## Importante

Para que funcione como app instalable necesitas:

- HTTPS.
- `manifest.webmanifest`.
- `service-worker.js`.
- Icono de app.

Todo eso ya quedo agregado.

## Datos y sincronizacion

La app Android usa el mismo modo online-first:

- Guarda cambios localmente de inmediato.
- Sube cambios al backend si `Modo servidor automatico` esta activo.
- Si no hay internet, conserva cola pendiente.
- Cuando vuelve la conexion, reintenta sincronizar.

## APK nativo

Si despues necesitas un APK para Play Store o instalacion manual, la ruta recomendada es envolver esta PWA con:

- Trusted Web Activity
- Capacitor

Eso requiere Android Studio, Java/JDK y Gradle en la computadora.
