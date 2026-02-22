@echo off
cd /d "H:\long\MobeClaude"
echo Checking node_modules...
if not exist "node_modules\electron\dist\electron.exe" (
  echo ERROR: electron not found!
  echo Please run: npm install
  pause
  exit /b 1
)
echo Starting with full error output...
node_modules\electron\dist\electron.exe --disable-gpu --no-sandbox main.js
echo.
echo Process exited with code: %errorlevel%
pause
