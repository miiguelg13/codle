@echo off
setlocal
cd /d "%~dp0..\.."
if not exist logs mkdir logs
echo ==== %date% %time% ==== >> logs\subida-retos.log
python tools\retos\upload.py --pendientes >> logs\subida-retos.log 2>&1
if errorlevel 9009 py -3 tools\retos\upload.py --pendientes >> logs\subida-retos.log 2>&1
