@echo off
setlocal
title Bug Tool Live Server

rem El servidor y este archivo deben permanecer en la misma carpeta.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0BugTool_Server.ps1"

if errorlevel 1 pause
endlocal
