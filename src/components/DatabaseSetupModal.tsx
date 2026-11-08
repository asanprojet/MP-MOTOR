/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Database Setup, Auto-Provisioning & Automated CRUD Diagnostic Modal
 */

import React, { useState } from 'react';
import {
  Database,
  Server,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Check,
  Zap,
  Activity,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  dbConfigService,
  DbConfig,
  DatabaseEngine,
  CrudStepResult,
} from '../services/dbConfigService';

interface DatabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigApplied?: (config: DbConfig) => void;
}

export const DatabaseSetupModal: React.FC<DatabaseSetupModalProps> = ({
  isOpen,
  onClose,
  onConfigApplied,
}) => {
  const [config, setConfig] = useState<DbConfig>(() => dbConfigService.getConfig());
  const [selectedEngine, setSelectedEngine] = useState<DatabaseEngine>(config.engine);
  
  // Connection parameters
  const [host, setHost] = useState(config.host || '127.0.0.1');
  const [port, setPort] = useState(config.port || 5432);
  const [dbName, setDbName] = useState(config.databaseName || 'maison_mp_motors_db');
  const [username, setUsername] = useState(config.username || 'postgres');
  const [password, setPassword] = useState(config.password || '');
  const [sqlitePath, setSqlitePath] = useState(config.sqlitePath || 'data/maison_mp_motors.sqlite (WAL Mode)');

  // CRUD Diagnostic state
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [currentStep, setCurrentStep] = useState<CrudStepResult | null>(null);
  const [testResults, setTestResults] = useState<CrudStepResult[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleRunCrudTest = async () => {
    setIsRunningTest(true);
    setTestCompleted(false);
    setTestResults([]);
    setCurrentStep(null);
    setFeedback(null);

    const activeConfig: DbConfig = {
      engine: selectedEngine,
      host,
      port: Number(port),
      databaseName: dbName,
      username,
      password,
      sqlitePath,
      isConfigured: false,
      totalTablesCount: 11,
    };

    try {
      const result = await dbConfigService.executeInstallationAndCrudTest(
        activeConfig,
        (step) => {
          setCurrentStep(step);
          setTestResults((prev) => [...prev, step]);
        }
      );

      setIsRunningTest(false);
      setTestCompleted(true);
      setConfig(dbConfigService.getConfig());
      setFeedback({
        type: 'success',
        text: `Configuration et Test CRUD automatique réussis avec succès ! (Latence : ${result.totalDurationMs} ms)`,
      });
    } catch {
      setIsRunningTest(false);
      setFeedback({
        type: 'error',
        text: 'Une erreur est survenue lors du test de la base de données.',
      });
    }
  };

  const handleApplyAndLaunch = () => {
    const finalConfig = dbConfigService.getConfig();
    if (onConfigApplied) onConfigApplied(finalConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border-2 border-blue-500/50 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Configuration de la Base de Données</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Installation & CRUD Automatique
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Sélectionnez le moteur souhaité pour le premier lancement ou la mise en réseau
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-base font-bold p-1 cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Engine Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Option 1: SQLite Embedded */}
          <div
            onClick={() => {
              setSelectedEngine('SQLITE_EMBEDDED');
              setTestCompleted(false);
            }}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedEngine === 'SQLITE_EMBEDDED'
                ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/20'
                : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">SQLite Embarqué Local</span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                RECOMMANDÉ
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Fichier local autonome 100% hors-ligne. Idéal pour poste caisse unique au comptoir (Zéro installation serveur).
            </p>
          </div>

          {/* Option 2: PostgreSQL */}
          <div
            onClick={() => {
              setSelectedEngine('POSTGRESQL');
              setPort(5432);
              setUsername('postgres');
              setTestCompleted(false);
            }}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedEngine === 'POSTGRESQL'
                ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/20'
                : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-white">PostgreSQL (Réseau Local)</span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                MULTI-POSTES
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Idéal pour interconnecter plusieurs ordinateurs (Caisse 1, Caisse 2, Magasinier, Bureau Gérant).
            </p>
          </div>

          {/* Option 3: MySQL / MariaDB */}
          <div
            onClick={() => {
              setSelectedEngine('MYSQL_MARIADB');
              setPort(3306);
              setUsername('root');
              setTestCompleted(false);
            }}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedEngine === 'MYSQL_MARIADB'
                ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/20'
                : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">MySQL / MariaDB</span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                INTRANET
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Serveurs MySQL/MariaDB d'entreprise (WAMP, XAMPP, Docker ou NAS local).
            </p>
          </div>

          {/* Option 4: IndexedDB / LocalStorage */}
          <div
            onClick={() => {
              setSelectedEngine('INDEXEDDB_LOCAL');
              setTestCompleted(false);
            }}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedEngine === 'INDEXEDDB_LOCAL'
                ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/20'
                : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white">Navigateur Haute Résilience</span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                INSTANTANÉ
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Stockage atomique persistant direct dans le navigateur sans configuration externe.
            </p>
          </div>
        </div>

        {/* Configuration Parameters Fields if Network DB */}
        {(selectedEngine === 'POSTGRESQL' || selectedEngine === 'MYSQL_MARIADB') && (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-blue-400" />
              <span>Paramètres de connexion réseau</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="col-span-2">
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                  Hôte / IP Serveur
                </label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="127.0.0.1 ou 192.168.1.100"
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                  Port
                </label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                  Base de données
                </label>
                <input
                  type="text"
                  value={dbName}
                  onChange={(e) => setDbName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                  Utilisateur
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Optionnel ou mot de passe"
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* SQLite File path config */}
        {selectedEngine === 'SQLITE_EMBEDDED' && (
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400">Emplacement du fichier SQLite :</span>
              <span className="text-[10px] font-mono text-slate-400">Mode WAL • Lock-free Concurrent</span>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-slate-800 font-mono text-[11px] text-blue-300">
              {sqlitePath}
            </div>
          </div>
        )}

        {/* Diagnostic Live Feed */}
        {(isRunningTest || testCompleted) && (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-white border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Rapport d'Auto-Installation & Diagnostic CRUD</span>
              </div>
              {isRunningTest ? (
                <span className="text-[10px] text-amber-400 flex items-center gap-1 font-mono">
                  <RotateCw className="w-3 h-3 animate-spin" />
                  <span>En cours d'exécution...</span>
                </span>
              ) : (
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  TEST CRUD 100% RÉUSSI
                </span>
              )}
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs font-mono pr-1">
              {testResults.map((step, idx) => (
                <div
                  key={idx}
                  className="p-1.5 rounded bg-slate-900 border border-slate-800 flex items-start gap-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-200 flex items-center justify-between">
                      <span>{step.title}</span>
                      <span className="text-[10px] text-slate-400">{step.durationMs}ms</span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {step.details}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback message */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-300'
                : 'bg-red-950/80 border border-red-500/60 text-red-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-2 border-t border-slate-800">
          <div className="text-[11px] text-slate-400">
            {config.isConfigured ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Base active : {config.engine} (11 tables relationnelles)</span>
              </span>
            ) : (
              <span>Veuillez lancer le test CRUD pour valider la configuration</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleRunCrudTest}
              disabled={isRunningTest}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-blue-600/30 cursor-pointer transition-all"
            >
              {isRunningTest ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Installation & Test CRUD...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Installer & Lancer Test CRUD</span>
                </>
              )}
            </button>

            {testCompleted && (
              <button
                type="button"
                onClick={handleApplyAndLaunch}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/30 cursor-pointer transition-all animate-bounce"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Utiliser l'Application</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
