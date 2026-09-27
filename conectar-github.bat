@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
where git >nul 2>&1
if errorlevel 1 (
  echo.
  echo  No encuentro git. Instala Git for Windows: https://git-scm.com/download/win
  echo.
  pause
  exit /b 1
)
echo.
set "REPO=codle"
set /p "REPO=  Nombre del repositorio en GitHub [codle]: "
echo.
python tools\github\conectar.py "%REPO%"
if errorlevel 9009 py -3 tools\github\conectar.py "%REPO%"
if errorlevel 1 (
  echo.
  pause
  exit /b 1
)
set "VBS=%~dp0tools\github\subir-github-oculto.vbs"
schtasks /Create /TN "Codle - subir a GitHub" /TR "wscript.exe \"%VBS%\"" /SC HOURLY /F >nul
if errorlevel 1 (
  echo.
  echo  El codigo ya esta en GitHub, pero no se pudo crear la tarea de cada hora.
) else (
  echo  Tarea "Codle - subir a GitHub" creada: cada hora sube los cambios nuevos.
  echo  Registro: logs\subida-github.log
)
echo.
pause
