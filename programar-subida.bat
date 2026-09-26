@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
if not exist .codle-deploy (
  echo.
  echo  Falta el fichero .codle-deploy. Crealo primero siguiendo DESPLIEGUE.md, paso 6.
  echo.
  pause
  exit /b 1
)
set "VBS=%~dp0tools\retos\subir-retos-oculto.vbs"
schtasks /Create /TN "Codle - subir retos" /TR "wscript.exe \"%VBS%\"" /SC HOURLY /F
if errorlevel 1 (
  echo.
  echo  No se pudo crear la tarea programada.
  pause
  exit /b 1
)
echo.
echo  Tarea "Codle - subir retos" creada: se ejecutara cada hora.
echo  Subiendo ahora los retos pendientes...
echo.
python tools\retos\upload.py --pendientes
if errorlevel 9009 py -3 tools\retos\upload.py --pendientes
echo.
pause
