@echo off
echo ===================================================
echo   LIMPIEZA DE REPOSITORIO GIT (NODE_MODULES)
echo ===================================================
echo.
echo Este script va a eliminar la carpeta node_modules del
echo historial de Git (pero NO de tu disco local).
echo.
echo Esto solucionara el problema de despliegue lento/roto
echo en Vercel por haber subido miles de archivos exta.
echo.
pause

echo.
echo 1. Eliminando node_modules del indice de Git...
git rm -r --cached node_modules

echo.
echo 2. Confirmando y empujando cambios...
git add .
git commit -m "chore: remove accidental node_modules from git"
git push

echo.
echo ===================================================
echo   PROCESO COMPLETADO
echo ===================================================
echo.
echo Ahora Vercel deberia desplegar correctamente.
echo Espera unos minutos y prueba /repair de nuevo.
echo.
pause
