@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0.."
if not exist logs mkdir logs
set "LOG=%CD%\logs\prueba-wandbox.log"
echo ==== %date% %time% ==== > "%LOG%"
echo.
echo  Probando Wandbox con todos los retos y los 8 lenguajes (unos 15 minutos)...
echo  Registro: logs\prueba-wandbox.log
echo.
cd server
echo ==== 1. Referencias y vigilante de tiempo ==== >> "%LOG%"
call npx tsx src\tests\wandbox-check.ts >> "%LOG%" 2>&1
echo. >> "%LOG%"
echo ==== 2. Soluciones en los 8 lenguajes ==== >> "%LOG%"
set CODLE_TEST_EXECUTOR=wandbox
call npx tsx --test --test-reporter=spec src\tests\harness.test.ts src\tests\languages.test.ts >> "%LOG%" 2>&1
echo. >> "%LOG%"
echo ==== FIN %date% %time% ==== >> "%LOG%"
echo  Terminado.
timeout /t 10 >nul
