@echo off
set "ROOT=%~dp0"
set "BACKEND=%ROOT%production\no-npm-backend"
set "NODE_EXE=C:\Users\PCFix Comitan\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
start "PCFix Backend" cmd /k "cd /d "%BACKEND%" && "%NODE_EXE%" server.js"
timeout /t 2 >nul
start "" "%ROOT%index.html"
