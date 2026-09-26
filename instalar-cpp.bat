@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
if not exist logs mkdir logs
set "LOG=logs\instalar-cpp.log"
set "GPP="
echo ==== %date% %time% ==== > "%LOG%"

where g++ >> "%LOG%" 2>&1
if not errorlevel 1 goto found

echo.
echo  Instalando g++ (WinLibs MinGW-w64) con winget. Puede tardar unos minutos...
winget install -e --id BrechtSanders.WinLibs.POSIX.UCRT --accept-source-agreements --accept-package-agreements >> "%LOG%" 2>&1
echo winget_exit: %errorlevel% >> "%LOG%"
set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Links;%PATH%"
where g++ >> "%LOG%" 2>&1
if not errorlevel 1 goto found

echo  Buscando g++.exe en los paquetes de winget...
for /r "%LOCALAPPDATA%\Microsoft\WinGet\Packages" %%f in (g++.exe) do if exist "%%f" set "GPP=%%f"
if defined GPP goto write
echo gpp: NO ENCONTRADO >> "%LOG%"
echo.
echo  No se pudo instalar g++. Mira logs\instalar-cpp.log
pause
exit /b 1

:found
for /f "delims=" %%p in ('where g++') do if not defined GPP set "GPP=%%p"

:write
echo gpp: %GPP% >> "%LOG%"
"%GPP%" --version >> "%LOG%" 2>&1
if not exist server\.env goto done
powershell -NoProfile -ExecutionPolicy Bypass -Command "$f='server\.env'; $c=@(Get-Content $f | Where-Object { $_ -notmatch '^\s*#?\s*LOCAL_GPP=' }); $c += 'LOCAL_GPP=%GPP%'; Set-Content -Encoding UTF8 $f $c"
echo env: LOCAL_GPP actualizado >> "%LOG%"

:done
echo OK >> "%LOG%"
echo.
echo  Listo: C++ configurado con %GPP%
timeout /t 5 >nul
exit /b 0
