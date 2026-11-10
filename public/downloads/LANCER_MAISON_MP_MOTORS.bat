@echo off
chcp 65001 >nul
title MAISON MP MOTORS - Demarrage Automatique en 1-Clic
color 0B

echo ==============================================================================
echo              MAISON MP MOTORS - QUINCAILLERIE AUTOMOBILE (RDC)
echo             LANCEUR 1-CLIC INTELLIGENT AVEC AUTO-INSTALLATION COMPLETE
echo ==============================================================================
echo.

:: 0. DETECTION AUTOMATIQUE DU DOSSIER PROJET (SI LANCE DEPUIS TELECHARGEMENTS)
if not exist "package.json" (
    if exist "MP-MOTOR-main\package.json" (
        echo [INFO] Navigation automatique dans le dossier MP-MOTOR-main...
        cd "MP-MOTOR-main"
    ) else if exist "%~dp0MP-MOTOR-main\package.json" (
        echo [INFO] Navigation automatique dans le dossier MP-MOTOR-main...
        cd "%~dp0MP-MOTOR-main"
    ) else (
        for /d %%D in (*MP-MOTOR*) do (
            if exist "%%D\package.json" (
                echo [INFO] Navigation dans %%D...
                cd "%%D"
            )
        )
    )
)

if not exist "package.json" (
    color 0C
    echo [ERREUR] Le fichier package.json est introuvable.
    echo Veuillez vous assurer que ce fichier .bat est execute dans le dossier du projet MP-MOTOR-main.
    pause
    exit /b 1
)

:: 1. VERIFICATION ET AUTO-INSTALLATION DE NODE.JS SI MANQUANT
where node >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%ProgramFiles%\nodejs\node.exe" (
        set "PATH=%ProgramFiles%\nodejs;%PATH%"
    ) else if exist "%LOCALAPPDATA%\Programs\node\node.exe" (
        set "PATH=%LOCALAPPDATA%\Programs\node;%PATH%"
    ) else (
        echo [ETAPE 1/4] Node.js n'a pas ete detecte sur ce PC.
        echo Telechargement automatique de Node.js LTS pour Windows (64-bit)...
        set "NODE_MSI=%TEMP%\nodejs_installer.msi"
        powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $ProgressPreference = 'SilentlyContinue'; Write-Host 'Telechargement de Node.js depuis nodejs.org...'; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' -OutFile '%NODE_MSI%'"
        
        if exist "%NODE_MSI%" (
            echo Installation silencieuse automatique de Node.js en cours...
            msiexec /i "%NODE_MSI%" /qn /norestart
            set "PATH=%ProgramFiles%\nodejs;%LOCALAPPDATA%\Programs\node;%PATH%"
            timeout /t 5 >nul
            del "%NODE_MSI%" >nul 2>&1
        ) else (
            echo Tentative d'installation via Windows Package Manager (winget)...
            winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
        )
    )
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%ProgramFiles%\nodejs\node.exe" (
        set "PATH=%ProgramFiles%\nodejs;%PATH%"
    )
)

echo [OK] Environnement Node.js pret.
echo.

:: 2. AUTO-INSTALLATION DES PACKAGES REQUIS (NPM INSTALL)
if not exist "node_modules\" (
    echo [ETAPE 2/4] Premier demarrage : Installation des dependances (npm install)...
    call npm install --legacy-peer-deps
    if %errorlevel% neq 0 (
        color 0C
        echo [ERREUR] Echec lors du telechargement des modules npm.
        echo Verifiez votre connexion internet pour ce premier demarrage.
        pause
        exit /b %errorlevel%
    )
    echo [OK] Tous les paquets ont ete installes avec succes !
    echo.
) else (
    echo [OK] Modules npm deja presents.
)

:: 3. COMPILATION DE L'APPLICATION (VITE + REACT)
if not exist "dist\index.html" (
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
) else (
    echo [OK] Fichiers compiles dist deja prets.
)

:: 4. LANCEMENT IMMEDIAT DE L'APPLICATION EN MODE FENETRE DESKTOP
echo [ETAPE 4/4] Lancement automatique de Maison MP Motors...
echo ==============================================================================
echo   APPLICATION OUVERTE SUR VOTRE ECRAN (Fenetre Bureau Dediee)
echo   Mode Comptoir Hors Ligne Actif (Double devise USD / Franc Congolais)
echo ==============================================================================
echo.

:: Demarrer le serveur local en arriere-plan
start /b cmd /c "npx vite preview --port 3000 --host 127.0.0.1 >nul 2>&1 || npx vite --port 3000 --host 127.0.0.1 >nul 2>&1"

:: Attendre 2 secondes
timeout /t 2 >nul

:: Ouvrir en mode Fenetre Application Desktop autonome (sans barre d'adresse ni onglets)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=http://127.0.0.1:3000 --window-size=1366,768
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=http://127.0.0.1:3000 --window-size=1366,768
) else if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=http://127.0.0.1:3000 --window-size=1366,768
) else (
    start http://127.0.0.1:3000
)

echo.
echo Application en cours d'execution !
echo Gardez cette invite de commande ouverte pendant l'utilisation de la caisse.
echo.
pause
