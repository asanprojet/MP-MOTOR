/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Windows Executable (.exe) Generation & Desktop Packaging
 */

import React, { useState } from 'react';
import {
  Monitor,
  Download,
  Terminal,
  CheckCircle2,
  Package,
  HardDrive,
  Copy,
  Check,
  ShieldCheck,
  Cpu,
  Layers,
  ExternalLink,
  Zap,
  Play,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export const DesktopBuildView: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const downloadScript = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateBuildBatch = () => {
    const content = `@echo off
chcp 65001 >nul
title MAISON MP MOTORS - Générateur d'Exécutable Windows (.exe)
color 0B
echo ======================================================================
echo           MAISON MP MOTORS - GENERATION DE L'EXECUTABLE WINDOWS
echo ======================================================================
echo.
echo [1/4] Nettoyage des anciens builds...
rd /s /q dist
rd /s /q release
echo Succes : Nettoyage termine.

echo.
echo [2/4] Installation propre des dependances...
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo ERREUR lors de l'installation des dependances.
    pause
    exit /b %errorlevel%
)

echo.
echo [3/4] Compilation du code React (Vite)...
call npm run build
if %errorlevel% neq 0 (
    echo ERREUR lors de la compilation Vite.
    pause
    exit /b %errorlevel%
)

echo.
echo [4/4] Emballage de l'exécutable (Electron-Builder)...
call npx electron-builder --win nsis portable --config electron-builder.json
if %errorlevel% neq 0 (
    echo ERREUR lors de la creation de l'executable.
    echo Assurez-vous d'avoir installe les outils de build Windows.
    pause
    exit /b %errorlevel%
)

echo.
echo ======================================================================
echo   FELICITATIONS ! Vos executables sont generes dans : %cd%\\release\\
echo ======================================================================
echo.
pause
explorer release
`;
    downloadScript('GENERER_EXE_WINDOWS.bat', content);
  };

  const generateRunBatch = () => {
    const content = `@echo off
chcp 65001 >nul
title MAISON MP MOTORS - Mode Comptoir Hors Ligne
color 0A
echo ======================================================================
echo           MAISON MP MOTORS - QUINCAILLERIE AUTOMOBILE
echo                 Demarrage en mode 100% Hors Ligne
echo ======================================================================
echo.
echo Lancement de l'application...
if exist "release\\win-unpacked\\Maison MP Motors.exe" (
    start "" "release\\win-unpacked\\Maison MP Motors.exe"
) else if exist "release\\Maison_MP_Motors_Portable_x64.exe" (
    start "" "release\\Maison_MP_Motors_Portable_x64.exe"
) else (
    echo Lancement en mode Electron direct...
    call npx electron .
)
`;
    downloadScript('LANCER_MAISON_MP_MOTORS.bat', content);
  };

  const commandsList = [
    {
      title: '1. Installer les modules Electron (cmd Windows)',
      cmd: 'npm install --save-dev electron electron-builder --legacy-peer-deps',
    },
    {
      title: '2. Compiler les fichiers de l\'application (React/Vite)',
      cmd: 'npm run build',
    },
    {
      title: '3. Générer le fichier .exe (Installateur NSIS & Portable)',
      cmd: 'npx electron-builder --win nsis portable --config electron-builder.json',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950 text-slate-100 space-y-6">
      {/* Header */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Générateur Exécutable Windows (.exe)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white">
                Windows 10 / 11 64-bit
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Production de l'installateur autonome .exe (NSIS) et de la version portable sans connexion internet
            </p>
          </div>
        </div>

        {/* Quick Batch Download Button */}
        <div className="flex items-center gap-2">
          <a
            href="/downloads/Maison_MP_Motors_Windows_x64.zip"
            download="Maison_MP_Motors_Windows_x64.zip"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/30 cursor-pointer transition-all active:scale-[0.98] border border-emerald-400/40"
          >
            <Download className="w-4 h-4 animate-bounce" />
            <span>TÉLÉCHARGER LE PACKAGE WINDOWS (.ZIP avec .EXE)</span>
          </a>
        </div>
      </div>

      {/* Prominent Direct Download Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/80 via-slate-900 to-emerald-950/60 border-2 border-emerald-500/50 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">
              Fichiers Windows Générés et Prêts au Téléchargement Immédiat
            </h3>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700">
            Prêt pour Windows 10 & 11 (64-bit)
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Le moteur Electron et l'application <strong>Maison MP Motors</strong> ont été compilés. Vous pouvez télécharger le fichier complet directement sur votre PC d'un simple clic :
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Main Recommended ZIP Download */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/40 space-y-3 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-emerald-400 font-mono">
                  Maison_MP_Motors_Windows_x64.zip
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  RECOMMANDÉ
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2">
                <strong>Pack complet prêt à l'emploi :</strong> Contient l'exécutable <code>Maison MP Motors.exe</code> ainsi que toutes les DLLs et ressources nécessaires. Décompressez et double-cliquez pour lancer immédiatement sans internet !
              </p>
              <div className="text-[11px] text-slate-400 mt-2 font-mono">
                Taille : ~171 Mo • Autonome • 100% Hors ligne
              </div>
            </div>

            <a
              href="/downloads/Maison_MP_Motors_Windows_x64.zip"
              download="Maison_MP_Motors_Windows_x64.zip"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer text-center"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger le Package Complet (.ZIP)</span>
            </a>
          </div>

          {/* Standalone EXE Download */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-750 space-y-3 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-blue-400 font-mono">
                  Maison_MP_Motors.exe
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  EXECUTABLE DIRECT
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2">
                Le fichier exécutable binaire natif Windows 64-bit compilé directement pour MAISON MP MOTORS.
              </p>
              <div className="text-[11px] text-slate-400 mt-2 font-mono">
                Taille : ~239 Mo • Binaire natif PE32+
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <a
                href="/downloads/Maison_MP_Motors_Windows_x64.zip"
                download="Maison_MP_Motors_Windows_x64.zip"
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer text-center"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger le Pack Complet (.ZIP)</span>
              </a>

              <a
                href="/downloads/DEMARRER_TOUT_EN_1_CLIC.bat"
                download="DEMARRER_TOUT_EN_1_CLIC.bat"
                className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer text-center"
              >
                <Play className="w-4 h-4" />
                <span>Lanceur 1-Clic (.BAT)</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 1-CLICK AUTOMATED LAUNCHER SECTION */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900/60 via-indigo-900/40 to-slate-900 border-2 border-blue-500/50 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30">
              <Zap className="w-6 h-6 text-yellow-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">
                  Lanceur Automatisé 1-Clic (Zéro Commande Manuelle)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                  Nouveau • 100% Automatique
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Vous n'avez pas envie de taper des commandes CMD ? Double-cliquez simplement sur le script 1-clic !
              </p>
            </div>
          </div>

          <a
            href="/downloads/DEMARRER_TOUT_EN_1_CLIC.bat"
            download="DEMARRER_TOUT_EN_1_CLIC.bat"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-lg shadow-blue-600/40 transition-all cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger le Script 1-Clic (.BAT)</span>
          </a>
        </div>

        {/* 3 Steps Performed Automatically in 1-Click */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
              <span className="w-5 h-5 rounded-full bg-blue-600/30 flex items-center justify-center text-[11px] text-white">1</span>
              <span>Installation Paquets (npm)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Vérifie automatiquement les modules et installe toutes les dépendances sans que vous ayez à taper <code className="text-slate-300">npm install</code>.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
              <span className="w-5 h-5 rounded-full bg-indigo-600/30 flex items-center justify-center text-[11px] text-white">2</span>
              <span>Compilation Vite</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Exécute automatiquement <code className="text-slate-300">npm run build</code> pour préparer l'application React et les assets hors ligne.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <span className="w-5 h-5 rounded-full bg-emerald-600/30 flex items-center justify-center text-[11px] text-white">3</span>
              <span>Lancement Application</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Ouvre immédiatement la fenêtre de bureau de <strong>Maison MP Motors</strong> en plein écran avec sa base de données locale.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-blue-500/20 text-xs text-slate-300 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <strong>Astuce gain de temps :</strong> Si vous avez téléchargé le fichier <code>Maison_MP_Motors_Windows_x64.zip</code>, vous n'avez <em>même pas</em> besoin de Node.js ni de npm : le fichier <code>Maison MP Motors.exe</code> à l'intérieur est <strong>déjà tout emballé</strong> et démarre instantanément !
          </div>
        </div>
      </div>

      {/* Two Column Layout: Executable Types & Terminal Commands */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Types of Executables Generated */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-400" />
              <span>Exécutables Prêts à être Produits</span>
            </h3>

            {/* NSIS Installer Card */}
            <div className="p-4 rounded-xl bg-slate-850 border border-slate-750 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-blue-400">
                  Maison_MP_Motors_Setup.exe
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Installateur NSIS
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Installateur Windows classique avec assistant d'installation, création automatique du raccourci sur le Bureau et dans le Menu Démarrer.
              </p>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                <span>Dossier par défaut : <code>C:\Program Files\Maison MP Motors</code></span>
              </div>
            </div>

            {/* Portable EXE Card */}
            <div className="p-4 rounded-xl bg-slate-850 border border-slate-750 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-purple-400">
                  Maison_MP_Motors_Portable_x64.exe
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950 text-purple-400 border border-purple-800">
                  Version Portable
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Fichier unique exécutable directement depuis une **clé USB** ou n'importe quel dossier sans nécessiter de droits administrateur.
              </p>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Conserve la base de données locale dans le dossier utilisateur</span>
              </div>
            </div>

            {/* Batch scripts action */}
            <div className="pt-2 border-t border-slate-800 flex gap-2">
              <button
                onClick={generateRunBatch}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-xs font-bold border border-slate-700 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Télécharger LANCER.bat</span>
              </button>
            </div>
          </div>

          {/* Architecture & Specs */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-400" />
              <span>Conformité avec les Spécifications Techniques</span>
            </h3>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Sécurité stricte :</strong> <code>contextIsolation: true</code>, <code>nodeIntegration: false</code>, <code>sandbox: true</code></span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Hors Ligne Intégral :</strong> Aucun appel externe, base locale SQLite intégrée</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Résolution Comptoir :</strong> Optimisée 1366 × 768 pour écrans de caisse</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span><strong>Impression Silencieuse :</strong> Prise en charge des imprimantes tickets 80mm</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Step-by-Step CMD Instructions */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-400" />
              <span>Génération sous Windows (Invite de commandes CMD)</span>
            </h3>
          </div>

          <p className="text-xs text-slate-300">
            Pour générer le fichier <code>.exe</code> sur votre ordinateur Windows, ouvrez votre invite de commandes (<strong>cmd</strong>) dans le dossier du projet et tapez les 3 commandes suivantes :
          </p>

          <div className="space-y-3">
            {commandsList.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="text-[11px] font-bold text-slate-400">
                  {item.title}
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400">
                  <span className="truncate mr-2">{item.cmd}</span>
                  <button
                    onClick={() => handleCopy(item.cmd, idx)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white shrink-0 cursor-pointer"
                    title="Copier la commande"
                  >
                    {copiedIndex === idx ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Result explanation */}
          <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/60 text-xs space-y-2">
            <span className="font-bold text-blue-300 block">
              📁 Où se trouveront vos fichiers .EXE ?
            </span>
            <p className="text-slate-300">
              Dès que la commande est terminée, un dossier nommé <code className="text-emerald-400 font-bold">\release\</code> est automatiquement créé à la racine avec :
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-300 font-mono text-[11px]">
              <li><code>Maison MP Motors Setup.exe</code> (~85 Mo)</li>
              <li><code>Maison_MP_Motors_Portable_x64.exe</code> (~85 Mo)</li>
            </ul>
            <p className="text-[11px] text-slate-400 pt-1">
              Vous pouvez copier directement ce fichier <code>.exe</code> sur une clé USB et l'installer sur n'importe quel ordinateur de comptoir sans internet !
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
