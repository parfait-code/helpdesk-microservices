@echo off
REM scripts/quick-start.bat

echo 🚀 Quick Start - Ticket Service
echo =================================

REM Vérifier si Node.js est installé
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js n'est pas installé. Veuillez l'installer pour continuer.
    pause
    exit /b 1
)

REM Vérifier si les dépendances sont installées
if not exist "node_modules" (
    echo 📦 Installation des dépendances...
    call npm install
)

REM Démarrer le service
echo 🔄 Démarrage du Ticket Service...
echo 📍 Port: 3003
echo 🔗 Health: http://localhost:3003/api/v1/health
echo 🔗 Service: http://localhost:3003/
echo.
echo Appuyez sur Ctrl+C pour arrêter le service.
echo.

call npm start
pause
