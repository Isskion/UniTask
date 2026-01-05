@echo off
echo ===================================================
echo   INSTALANDO DEPENDENCIAS (Solo la primera vez)
echo ===================================================
call npm install

echo.
echo ===================================================
echo   ARRANCANDO APLICACION
echo ===================================================
echo.
echo Abre en tu navegador: http://localhost:3000
echo.
call npm run dev
pause
