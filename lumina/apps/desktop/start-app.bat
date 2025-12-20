@echo off
cd /d "%~dp0"
echo Starting Lumina Desktop App...
echo.
echo If this fails, you need to install pnpm first:
echo   npm install -g pnpm
echo.
call npx concurrently "npx vite" "npx wait-on http://localhost:5173 && npx electron ."
pause
