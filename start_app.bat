@echo off
title Rice Sales & Stock Ledger Web Portal
cd /d "%~dp0"
echo ============================================================
echo   Starting Rice Sales & Stock Web Application...
echo ============================================================
start "" http://localhost:3000
node server.js
pause
