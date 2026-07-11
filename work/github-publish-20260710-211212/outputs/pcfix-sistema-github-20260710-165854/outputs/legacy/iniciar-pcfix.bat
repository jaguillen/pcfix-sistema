@echo off
setlocal
set "NODE_EXE=C:\Users\PCFix Comitan\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
cd /d "%~dp0"
if exist "%NODE_EXE%" (
  "%NODE_EXE%" whatsapp-webhook-server.js
) else (
  node whatsapp-webhook-server.js
)
pause
