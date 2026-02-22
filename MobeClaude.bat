@echo off
cd /d "H:\long\MobeClaude"
set ELECTRON_DISABLE_GPU=1
"node_modules\electron\dist\electron.exe" --disable-gpu --disable-gpu-compositing --use-gl=swiftshader --no-sandbox main.js
pause
