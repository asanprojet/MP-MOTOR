@echo off
chcp 65001 >nul
title MAISON MP MOTORS - Installation et Demarrage 100%% Automatique (1-Clic)
color 0B

echo ==============================================================================
echo              MAISON MP MOTORS - QUINCAILLERIE AUTOMOBILE (RDC)
echo             LANCEUR 1-CLIC INTELLIGENT AVEC AUTO-INSTALLATION COMPLETE
echo ==============================================================================
echo.
echo Ce script 1-clic prend tout en charge automatiquement :
echo   - Detection et auto-telechargement de Node.js si absent sur la machine
echo   - Auto-telechargement de tous les paquets et extensions manquants (npm install)
echo   - Compilation automatique du projet (npm run build)
echo   - Lancement immediat de l'application sur votre ecran !
echo.
echo ------------------------------------------------------------------------------
echo.

:: 1. VERIFICATION ET AUTO-INSTALLATION DE NODE.JS SI MANQUANT
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ETAPE 1/4] Node.js n'a pas ete detecte sur ce PC.
    echo Telechargement automatique de Node.js LTS pour Windows (64-bit)...
    
    set "NODE_MSI=%TEMP%\nodejs_installer.msi"
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $ProgressPreference = 'SilentlyContinue'; Write-Host 'Telechargement de Node.js depuis nodejs.org...'; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' -OutFile '%NODE_MSI%'"
    
    if exist "%NODE_MSI%" (
        echo Installation silencieuse automatique de Node.js en cours, veuillez patienter quelques secondes...
        msiexec /i "%NODE_MSI%" /qn /norestart
        set "PATH=%ProgramFiles%\nodejs;%PATH%"
        set "PATH=%LOCALAPPDATA%\Programs\node;%PATH%"
        timeout /t 5 >nul
        del "%NODE_MSI%" >nul 2>&1
    ) else (
        echo [INFO] Tentative d'installation via Windows Package Manager (winget)...
        winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    )
)

:: Re-verification
where node >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%ProgramFiles%\nodejs\node.exe" (
        set "PATH=%ProgramFiles%\nodejs;%PATH%"
    )
)

echo [OK] Environnement Node.js pret :
node -v 2>nul || echo (Node.js initialise)
echo.

:: 2. AUTO-INSTALLATION DE TOUS LES PAQUETS & EXTENSIONS (NPM)
echo [ETAPE 2/4] Verification et auto-installation de tous les packages requis...
echo Installation automatique en cours (npm install)...
call npm install --legacy-peer-deps

if %errorlevel% neq 0 (
    color 0C
    echo [ERREUR] Echec lors du telechargement des modules npm.
    echo Verifiez votre connexion internet pour ce premier demarrage.
    pause
    exit /b %errorlevel%
)
echo [OK] Tous les paquets et extensions ont ete installes avec succes !
echo.

:: 3. COMPILATION DE L'APPLICATION (VITE + REACT)
echo [ETAPE 3/4] Compilation automatique de l'application (Vite + React)...
call npm run build

if %errorlevel% neq 0 (
    color 0C
    echo [ERREUR] Echec lors de la compilation Vite.
    pause
    exit /b %errorlevel%
)
echo [OK] Application compilee avec succes dans \dist\.
echo.

:: 4. LANCEMENT IMMEDIAT DE L'APPLICATION
echo [ETAPE 4/4] Lancement automatique de Maison MP Motors...
echo ==============================================================================
echo   L'APPLICATION DEMARRE SUR VOTRE ECRAN...
echo   Mode Comptoir Hors Ligne Actif (Double devise USD / Franc Congolais)
echo ==============================================================================
echo.

:: Verifier si le .exe existe debarque
if exist "release\win-unpacked\Maison MP Motors.exe" (
    start "" "release\win-unpacked\Maison MP Motors.exe"
) else if exist "release\Maison_MP_Motors_Portable_x64.exe" (
    start "" "release\Maison_MP_Motors_Portable_x64.exe"
) else (
    :: Lancement en mode Electron direct
    start "" npx electron .
)

timeout /t 3 >nul
exit
