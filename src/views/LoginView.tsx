/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Système d'Authentification Complet & Contrôle d'Accès par Rôle
 */

import React, { useState } from 'react';
import {
  Lock,
  User as UserIcon,
  LogIn,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Crown,
  ShoppingCart,
  Package,
  BarChart3,
  Users,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Info,
  DollarSign,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { storage } from '../services/storage';
import { User, Role } from '../shared/types';
import { ROLE_PERMISSIONS, Permissions, getUserLicenseStatus } from '../shared/permissions';

interface LoginViewProps {
  onLogin: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [identifiant, setIdentifiant] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedDemoRole, setSelectedDemoRole] = useState<Role | null>(null);
  const [showDemoAccounts, setShowDemoAccounts] = useState(true);

  const users = storage.getUsers();
  const params = storage.getParams();

  // Quick preset accounts definition for demo and testing
  const demoAccounts: {
    role: Role;
    label: string;
    identifiant: string;
    pin: string;
    badgeColor: string;
    icon: React.ReactNode;
    description: string;
  }[] = [
    {
      role: 'ARCHITECTE',
      label: 'Architecte Système',
      identifiant: 'architecte',
      pin: '9999',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: <Crown className="w-4 h-4 text-amber-400" />,
      description: 'Accès maître absolu, licences permanentes, journal d\'audit complet.',
    },
    {
      role: 'SUPERADMIN',
      label: 'Directeur Général',
      identifiant: 'superadmin',
      pin: '1234',
      badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
      icon: <ShieldCheck className="w-4 h-4 text-red-400" />,
      description: 'Direction, validation des annulations, clôtures et audits.',
    },
    {
      role: 'ADMIN',
      label: 'Gérant du Magasin',
      identifiant: 'admin',
      pin: '1234',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      icon: <Users className="w-4 h-4 text-blue-400" />,
      description: 'Gestion quotidienne, fixation des prix, approbations, rapports.',
    },
    {
      role: 'MAGASINIER',
      label: 'Responsable Stock',
      identifiant: 'magasinier',
      pin: '1234',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: <Package className="w-4 h-4 text-emerald-400" />,
      description: 'Achats fournisseurs (PUMP), réceptions et inventaires physiques.',
    },
    {
      role: 'CAISSIER',
      label: 'Opérateur Caisse',
      identifiant: 'caissier',
      pin: '1234',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      icon: <ShoppingCart className="w-4 h-4 text-indigo-400" />,
      description: 'Ventes comptoir rapides, encaissements (Coûts d\'achat PUMP masqués).',
    },
    {
      role: 'COMPTABLE',
      label: 'Comptable Financier',
      identifiant: 'comptable',
      pin: '1234',
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      icon: <BarChart3 className="w-4 h-4 text-teal-400" />,
      description: 'Rapports de ventes, clôture de caisse, suivi des créances.',
    },
    {
      role: 'INVITE',
      label: 'Visiteur / Stagiaire',
      identifiant: 'invite',
      pin: '0000',
      badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
      icon: <UserIcon className="w-4 h-4 text-slate-400" />,
      description: 'Consultation lecture seule du catalogue sans données financières.',
    },
  ];

  const handleSelectDemoAccount = (acc: typeof demoAccounts[0]) => {
    setIdentifiant(acc.identifiant);
    setPin(acc.pin);
    setError(null);
  };

  const handlePinPadClick = (digit: string) => {
    if (pin.length < 8) {
      setPin(prev => prev + digit);
    }
  };

  const handlePinPadClear = () => {
    setPin('');
  };

  const handlePinPadBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanIdentifiant = identifiant.trim().toLowerCase();
    const cleanPin = pin.trim();

    if (!cleanIdentifiant) {
      setError("Veuillez saisir votre identifiant utilisateur.");
      return;
    }

    if (!cleanPin) {
      setError("Veuillez saisir votre code PIN d'accès.");
      return;
    }

    const user = users.find(
      u => u.identifiant.toLowerCase() === cleanIdentifiant && (u.pin || '1234') === cleanPin
    );

    if (user) {
      if (!user.actif) {
        setError("Ce compte est actuellement désactivé. Veuillez contacter l'Architecte ou l'Administrateur.");
        storage.logAction(
          user,
          'CONNEXION_REFUSEE',
          'AUTHENTIFICATION',
          user.identifiant,
          'Tentative de connexion sur un compte désactivé.'
        );
        return;
      }

      // Check licensing validity
      const license = getUserLicenseStatus(user, params.licenceGlobaleAVie);
      if (license.estExpire && user.role !== 'ARCHITECTE') {
        setError(`Votre période d'accès autorisée a expiré le ${license.dateExpirationFormatee}. Veuillez demander le renouvellement.`);
        storage.logAction(
          user,
          'CONNEXION_REFUSEE',
          'LICENCE',
          user.identifiant,
          `Accès bloqué : licence expirée (${license.dateExpirationFormatee})`
        );
        return;
      }

      // Login success
      user.derniereConnexion = new Date().toISOString();
      user.echecsConnexion = 0;
      storage.saveUser(user, user);
      storage.setCurrentUser(user);
      storage.logAction(
        user,
        'CONNEXION_REUSSIE',
        'AUTHENTIFICATION',
        user.identifiant,
        `Connexion réussie au poste de travail (${user.role})`
      );

      onLogin(user);
    } else {
      // Find if user exists to increment failure count
      const existingUser = users.find(u => u.identifiant.toLowerCase() === cleanIdentifiant);
      if (existingUser) {
        existingUser.echecsConnexion = (existingUser.echecsConnexion || 0) + 1;
        storage.saveUser(existingUser, existingUser);
        storage.logAction(
          existingUser,
          'ECHEC_CONNEXION',
          'AUTHENTIFICATION',
          existingUser.identifiant,
          `Code PIN incorrect (Échec #${existingUser.echecsConnexion})`
        );
      }
      setError("Identifiant ou code PIN incorrect. Veuillez vérifier vos accès.");
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 select-none relative overflow-x-hidden">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="flex items-center justify-between border-b border-slate-800/80 pb-4 max-w-6xl w-full mx-auto relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-600/30">
            MP
          </div>
          <div>
            <h1 className="text-base font-black text-white tracking-wide uppercase">
              Maison MP Motors
            </h1>
            <p className="text-[11px] text-slate-400">
              Quincaillerie & Pièces Automobiles • Kinshasa, RDC
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Taux Comptoir :</span>
            <span className="font-bold text-white font-mono">1 USD = {params.tauxUSD_CDF.toLocaleString('fr-FR')} CDF</span>
          </div>

          <button
            type="button"
            onClick={() => setShowPermissionsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>Grille des Permissions</span>
          </button>
        </div>
      </header>

      {/* Main Login Area */}
      <main className="max-w-6xl w-full mx-auto my-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        {/* Left Column: Login Form + PIN Pad */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold mb-3">
                <KeyRound className="w-3.5 h-3.5" />
                <span>Authentification Sécurisée</span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                Connexion au Poste de Travail
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Entrez vos identifiants ou utilisez les accès rapides de session ci-contre.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Identifiant */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Identifiant de Session
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={identifiant}
                    onChange={(e) => {
                      setIdentifiant(e.target.value);
                      setError(null);
                    }}
                    placeholder="Ex: caissier, admin, architecte"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-blue-500 focus:outline-hidden transition-colors"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Code PIN */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Code PIN ou Mot de Passe
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-blue-400" />}
                    <span>{showPin ? 'Masquer' : 'Afficher'}</span>
                  </button>
                </div>

                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value);
                      setError(null);
                    }}
                    placeholder="Code PIN à 4 chiffres"
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-sm tracking-widest focus:border-blue-500 focus:outline-hidden transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-semibold animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Virtual PIN Pad for Touchscreens */}
              <div className="pt-2">
                <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center justify-between">
                  <span>Pavé numérique tactile :</span>
                  <button
                    type="button"
                    onClick={handlePinPadClear}
                    className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    Effacer le PIN
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handlePinPadClick(digit)}
                      className="py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-sm font-bold text-slate-200 hover:text-white transition-all active:scale-95 cursor-pointer shadow-xs"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handlePinPadClear}
                    className="py-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 text-xs font-bold text-slate-400 transition-all cursor-pointer"
                  >
                    C
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePinPadClick('0')}
                    className="py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-sm font-bold text-slate-200 hover:text-white transition-all active:scale-95 cursor-pointer shadow-xs"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handlePinPadBackspace}
                    className="py-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 text-xs font-bold text-slate-400 transition-all cursor-pointer"
                  >
                    ⌫
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all duration-150 active:scale-98 mt-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Ouvrir la Session de Caisse</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Roles & Permission Matrix Quick Selector */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Comptes Configurés & Rôles d'Accès</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cliquez sur un profil pour charger ses identifiants et tester ses droits.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                {showDemoAccounts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {showDemoAccounts && (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {demoAccounts.map((acc) => {
                  const isSelected = identifiant === acc.identifiant;
                  return (
                    <div
                      key={acc.role}
                      onClick={() => handleSelectDemoAccount(acc)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-blue-600/15 border-blue-500/60 shadow-md'
                          : 'bg-slate-950/60 border-slate-850 hover:bg-slate-800/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${acc.badgeColor}`}>
                            {acc.icon}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-2">
                              <span>{acc.label}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono font-bold ${acc.badgeColor}`}>
                                {acc.role}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>Identifiant: <strong className="text-slate-300">@{acc.identifiant}</strong></span>
                              <span>•</span>
                              <span>PIN: <strong className="text-slate-300 font-mono">{acc.pin}</strong></span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {isSelected ? 'Sélectionné' : 'Tester'}
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-400 mt-2 pl-10 border-t border-slate-800/40 pt-1.5">
                        {acc.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Security & Access Guarantee Card */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-2">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Contrôle d'Accès par Rôle (RBAC Strict)</span>
            </div>
            <p className="leading-relaxed">
              Chaque utilisateur connecté n'accède qu'aux fonctions expressément autorisées par sa fonction. Les caissiers ne voient jamais le prix d'achat ni les marges, et seuls les administrateurs et l'architecte peuvent approuver les annulations et ajuster les stocks.
            </p>
          </div>
        </div>
      </main>

      {/* Footer System Info */}
      <footer className="text-center text-xs text-slate-500 py-2 border-t border-slate-800/60 max-w-6xl w-full mx-auto relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          Maison MP Motors • Système de Gestion Commerciale & Quincaillerie Automobile v2.5
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Mode Local Prêt
          </span>
          <span>•</span>
          <span className="text-blue-400">Sync Cloud Firestore Active</span>
        </div>
      </footer>

      {/* Permissions Matrix Modal */}
      {showPermissionsModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Matrice Complète des Accès & Permissions par Rôle
                  </h3>
                  <p className="text-xs text-slate-400">
                    Règles d'accès garanties pour chaque utilisateur dans Maison MP Motors
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPermissionsModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider bg-slate-950/60">
                    <th className="py-2.5 px-3">Module / Droit d'Accès</th>
                    <th className="py-2.5 px-2 text-center text-amber-400">Architecte</th>
                    <th className="py-2.5 px-2 text-center text-red-400">Superadmin</th>
                    <th className="py-2.5 px-2 text-center text-blue-400">Admin</th>
                    <th className="py-2.5 px-2 text-center text-emerald-400">Magasinier</th>
                    <th className="py-2.5 px-2 text-center text-indigo-400">Caissier</th>
                    <th className="py-2.5 px-2 text-center text-teal-400">Comptable</th>
                    <th className="py-2.5 px-2 text-center text-slate-400">Invité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {[
                    { label: 'Caisse Rapide & Ventes (F2)', key: 'canPerformSales' as keyof Permissions },
                    { label: 'Stock & Articles (F3)', key: 'canViewArticles' as keyof Permissions },
                    { label: 'Achats Fournisseurs PUMP (F4)', key: 'canPerformPurchases' as keyof Permissions },
                    { label: 'Voir Coûts d\'achat PUMP (Confidentialité)', key: 'canViewPurchaseCosts' as keyof Permissions },
                    { label: 'Fixer Prix de Vente Forcés', key: 'canFixPrices' as keyof Permissions },
                    { label: 'Ajustement Inventaire Stock', key: 'canPerformStockAdjustments' as keyof Permissions },
                    { label: 'Factures Ventes & Historique (F5)', key: 'canPerformSales' as keyof Permissions },
                    { label: 'Annulation Vente Directe', key: 'canCancelSalesDirectly' as keyof Permissions },
                    { label: 'Demande Annulation (Avec Approbation)', key: 'canRequestSalesCancellation' as keyof Permissions },
                    { label: 'Crédits & Clients (F6)', key: 'canManageCustomers' as keyof Permissions },
                    { label: 'Tableau de Bord & Stats (F7)', key: 'canViewDashboard' as keyof Permissions },
                    { label: 'Rapports & Clôtures Caisse (F8)', key: 'canViewReports' as keyof Permissions },
                    { label: 'Import / Export Excel', key: 'canImportExportExcel' as keyof Permissions },
                    { label: 'Paramètres & Utilisateurs (F9)', key: 'canManageUsers' as keyof Permissions },
                    { label: 'Gestion des Licences & Durées', key: 'canManageLicensing' as keyof Permissions },
                    { label: 'Journal d\'Audit Système (Anti-Fraude)', key: 'canViewAuditLog' as keyof Permissions },
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-2 px-3 font-medium text-slate-300">{row.label}</td>
                      {(['ARCHITECTE', 'SUPERADMIN', 'ADMIN', 'MAGASINIER', 'CAISSIER', 'COMPTABLE', 'INVITE'] as Role[]).map((r) => {
                        const allowed = ROLE_PERMISSIONS[r]?.[row.key] ?? false;
                        return (
                          <td key={r} className="py-2 px-2 text-center">
                            {allowed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                            ) : (
                              <XCircle className="w-4 h-4 text-slate-600 mx-auto" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPermissionsModal(false)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs cursor-pointer shadow-md"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
