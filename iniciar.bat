@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
title Codle - desarrollo
if not exist logs mkdir logs
set "LOG=logs\iniciar.log"
echo ==== %date% %time% ==== > "%LOG%"

echo.
echo  [1/4] Comprobando Node.js...
where node >nul 2>&1
if not errorlevel 1 goto node_ok
echo       Node.js no esta instalado. Instalandolo con winget (acepta el aviso de Windows si aparece)...
echo node: no instalado, probando winget >> "%LOG%"
winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements >> "%LOG%" 2>&1
set "PATH=%ProgramFiles%\nodejs;%PATH%"
where node >nul 2>&1
if not errorlevel 1 goto node_ok
echo.
echo  No se pudo instalar Node.js automaticamente. Descargalo de https://nodejs.org (version LTS),
echo  instalalo y vuelve a hacer doble clic en iniciar.bat
echo node: FALLO >> "%LOG%"
pause
exit /b 1

:node_ok
for /f "delims=" %%v in ('node -v') do echo node: %%v >> "%LOG%"

echo  [2/4] Comprobando compiladores para ejecutar codigo en local...
set "PYCMD="
python --version >> "%LOG%" 2>&1
if not errorlevel 1 set "PYCMD=python"
if defined PYCMD goto py_done
py -3 --version >> "%LOG%" 2>&1
if not errorlevel 1 set "PYCMD=py"
:py_done
echo python: %PYCMD% >> "%LOG%"
echo --- java >> "%LOG%"
java -version >> "%LOG%" 2>&1
echo java_exit: %errorlevel% >> "%LOG%"
echo --- javac >> "%LOG%"
javac -version >> "%LOG%" 2>&1
echo javac_exit: %errorlevel% >> "%LOG%"
echo --- g++ >> "%LOG%"
g++ --version >> "%LOG%" 2>&1
echo gpp_exit: %errorlevel% >> "%LOG%"
echo --- mongo port >> "%LOG%"
netstat -ano | findstr ":27017 " >> "%LOG%" 2>&1

if exist server\.env goto env_ok
echo       Creando server\.env (modo local)...
if not defined PYCMD set "PYCMD=python"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=[guid]::NewGuid().ToString('N')+[guid]::NewGuid().ToString('N'); (Get-Content .env.example) -replace '^JWT_SECRET=.*',('JWT_SECRET='+$s) -replace '^EXECUTOR=.*','EXECUTOR=local' -replace '^MONGODB_URI=.*','MONGODB_URI=mongodb://127.0.0.1:27017/codle' -replace '^# LOCAL_PYTHON=.*','LOCAL_PYTHON=%PYCMD%' | Set-Content -Encoding UTF8 server\.env"
echo env: creado >> "%LOG%"
:env_ok

echo  [3/4] Instalando dependencias (la primera vez tarda: tambien descarga MongoDB)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "npm.cmd install --no-audit --no-fund 2>&1 | Tee-Object -FilePath logs\npm-install.log; exit $LASTEXITCODE"
if errorlevel 1 (
  echo npm install: FALLO >> "%LOG%"
  echo.
  echo  Fallo la instalacion de dependencias. Mira logs\npm-install.log
  pause
  exit /b 1
)
echo npm install: ok >> "%LOG%"

echo  [4/4] Arrancando MongoDB, la API y la web. Se abrira el navegador en http://localhost:5173
echo        (para parar pulsa Ctrl+C en esta ventana)
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "npm.cmd run dev:local 2>&1 | Tee-Object -FilePath logs\dev.log"
echo dev: terminado >> "%LOG%"
pause
