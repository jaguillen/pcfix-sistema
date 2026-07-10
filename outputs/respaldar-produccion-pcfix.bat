@echo off
set "ROOT=%~dp0"
set "DATA=%ROOT%production\no-npm-backend\data\pcfix-data.json"
set "BACKUPS=%ROOT%production\backups"
if not exist "%BACKUPS%" mkdir "%BACKUPS%"
for /f "tokens=1-3 delims=/ " %%a in ("%date%") do set TODAY=%%c-%%b-%%a
if exist "%DATA%" (
  copy "%DATA%" "%BACKUPS%\pcfix-data-%TODAY%.json" >nul
  echo Respaldo creado en %BACKUPS%
) else (
  echo No existe base de datos para respaldar.
)
pause
