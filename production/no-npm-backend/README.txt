PCFix backend sin npm

Usalo cuando Windows diga que npm no existe.

Como iniciar:
1. Abre esta carpeta:
   outputs\production\no-npm-backend
2. Da doble clic en iniciar-backend.bat
3. Abre en el navegador:
   http://localhost:8080
4. Tambien puedes validar:
   http://localhost:8080/api/health

Credenciales iniciales:
Email: admin@pcfix.local
Password: Cambiar123!

Base de datos:
data\pcfix-data.json

Notas:
- No requiere npm install.
- Usa el node.exe incluido por Codex.
- Sirve para probar backend, login, API, registros, auditoria y WhatsApp Cloud API.
- Incluye endpoints de usuarios para crear roles desde Admin.
- La interfaz puede activar Modo servidor automatico para sincronizar cambios.
- Para produccion final con SQLite usa outputs\production\backend cuando tengas Node.js completo instalado.
