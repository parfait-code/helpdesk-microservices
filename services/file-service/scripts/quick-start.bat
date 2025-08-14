@echo off
echo ==========================================
echo   File Service - Quick Start
echo ==========================================
echo.

echo 1. Demarrage des services Docker...
docker-compose up -d

echo.
echo 2. Attente du demarrage des services...
timeout /t 10 /nobreak > nul

echo.
echo 3. Verification des services...
docker-compose ps

echo.
echo 4. Test de sante du service...
node scripts/verify-service.js

echo.
echo ==========================================
echo   File Service est pret !
echo ==========================================
echo.
echo Acces:
echo - API: http://localhost:3004/api/v1
echo - Health: http://localhost:3004/api/v1/health
echo - MinIO Console: http://localhost:9001
echo.
echo Pour arreter: docker-compose down
echo.
pause
