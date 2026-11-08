/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - System Settings, User Management & Backup/Restore
 */

import React, { useState } from 'react';
import {
  Settings,
  Building2,
  Users,
  Database,
  Download,
  Upload,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Plus,
  Image as ImageIcon,
  HardDrive,
  Info,
  Crown,
  Clock,
  Sparkles,
  Infinity as InfinityIcon,
  ShieldAlert,
} from 'lucide-react';
import { User, Parametres, Role } from '../shared/types';
import { storage, computeDefaultExpiration } from '../services/storage';
import { getUserLicenseStatus } from '../shared/permissions';
import { dbConfigService } from '../services/dbConfigService';

interface SettingsViewProps {
  currentUser: User;
  onUserListUpdated: () => void;
  onOpenDbConfig?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, onUserListUpdated, onOpenDbConfig }) => {
  const [params, setParams] = useState<Parametres>(storage.getParams());
  const [users, setUsers] = useState<User[]>(storage.getUsers());
  const [dbConfig, setDbConfig] = useState(() => dbConfigService.getConfig());

  // Form states
  const [entrepriseNom, setEntrepriseNom] = useState(params.entrepriseNom);
  const [adresse, setAdresse] = useState(params.adresse);
  const [telephone, setTelephone] = useState(params.telephone);
  const [email, setEmail] = useState(params.email);
  const [tauxUSD_CDF, setTauxUSD_CDF] = useState(params.tauxUSD_CDF.toString());
  const [margeDefaut, setMargeDefaut] = useState(params.margeDefautPourcent.toString());
  const [seuilAlerte, setSeuilAlerte] = useState(params.seuilAlerteDefaut.toString());
  const [formatImpression, setFormatImpression] = useState(params.formatImpression);
  const [bloquerCredit, setBloquerCredit] = useState(params.bloquerCreditClient);
  const [logoPreview, setLogoPreview] = useState<string | undefined>(params.logoDataUrl);

  // User modal
  const [newUserModalOpen, setNewUserModalOpen] = useState(false);
  const [newNom, setNewNom] = useState('');
  const [newIdentifiant, setNewIdentifiant] = useState('');
  const [newRole, setNewRole] = useState<Role>('CAISSIER');
  const [newPin, setNewPin] = useState('1234');
  const [newIsLifetime, setNewIsLifetime] = useState(false);
  const [globalLifetime, setGlobalLifetime] = useState<boolean>(params.licenceGlobaleAVie || false);

  // Feedback & Backup
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Handle Global Lifetime License Toggle (Architect only)
  const handleToggleGlobalLifetime = () => {
    if (currentUser.role !== 'ARCHITECTE') {
      setFeedback({
        type: 'error',
        text: "Seul le compte Architecte a le pouvoir d'accorder la licence définitive à vie pour toute l'entreprise.",
      });
      return;
    }
    const newVal = !globalLifetime;
    const updated = storage.setGlobalLifetimeLicense(newVal, currentUser);
    setGlobalLifetime(newVal);
    setParams(updated);
    setFeedback({
      type: 'success',
      text: newVal
        ? "Licence à vie activée pour toute l'entreprise ! Tous les comptes ont désormais un accès illimité sans aucune restriction de durée."
        : "Mode licences standards réactivé selon les durées individuelles.",
    });
    onUserListUpdated();
  };

  // Handle Prolonging / Modifying User License (Architect / Superadmin)
  const handleProlongUser = (
    userId: string,
    action: 'ADD_15_DAYS' | 'ADD_30_DAYS' | 'ADD_60_DAYS' | 'SET_LIFETIME'
  ) => {
    if (currentUser.role !== 'ARCHITECTE' && currentUser.role !== 'SUPERADMIN') {
      setFeedback({ type: 'error', text: "Action réservée à l'Architecte ou au Superadmin." });
      return;
    }
    const updatedUser = storage.prolongUserLicense(userId, action, undefined, currentUser);
    if (updatedUser) {
      setUsers(storage.getUsers());
      onUserListUpdated();
      setFeedback({
        type: 'success',
        text: `Validité mise à jour avec succès pour ${updatedUser.nom} (${action}).`,
      });
    }
  };

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      const result = evt.target?.result as string;
      setLogoPreview(result);
    };
    reader.readAsDataURL(file);
  };

  // Save Parameters
  const handleSaveParameters = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const parsedRate = parseInt(tauxUSD_CDF, 10);
    if (isNaN(parsedRate) || parsedRate <= 0) {
      setFeedback({ type: 'error', text: "Le taux USD/CDF doit être un entier positif (ex: 2850)." });
      return;
    }

    const updated = storage.updateParams(
      {
        entrepriseNom,
        adresse,
        telephone,
        email,
        tauxUSD_CDF: parsedRate,
        margeDefautPourcent: parseFloat(margeDefaut) || 25,
        seuilAlerteDefaut: parseInt(seuilAlerte, 10) || 5,
        formatImpression,
        bloquerCreditClient: bloquerCredit,
        logoDataUrl: logoPreview,
      },
      currentUser
    );

    setParams(updated);
    setFeedback({ type: 'success', text: "Paramètres de l'entreprise enregistrés avec succès !" });
  };

  // Handle Create User
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNom.trim() || !newIdentifiant.trim()) return;

    const id = `USR_${Date.now()}`;
    const defaults = computeDefaultExpiration(newRole);
    const isLifetime = newIsLifetime || newRole === 'ARCHITECTE';

    const newUser: User = {
      id,
      nom: newNom.trim(),
      identifiant: newIdentifiant.trim().toLowerCase(),
      role: newRole,
      actif: true,
      pin: newPin || '1234',
      echecsConnexion: 0,
      creeLe: new Date().toISOString(),
      estAVie: isLifetime,
      dateExpiration: isLifetime ? null : defaults.dateExpiration,
      dureeInitialeJours: isLifetime ? undefined : defaults.dureeInitialeJours,
    };

    storage.saveUser(newUser, currentUser);
    setUsers(storage.getUsers());
    onUserListUpdated();
    setNewUserModalOpen(false);
    setNewNom('');
    setNewIdentifiant('');
    setNewIsLifetime(false);
    setFeedback({ type: 'success', text: `Compte utilisateur ${newUser.nom} (${newUser.role}) créé avec succès.` });
  };

  const handleToggleUserActive = (user: User) => {
    if (user.id === currentUser.id) {
      setFeedback({ type: 'error', text: "Vous ne pouvez pas désactiver votre propre compte actif." });
      return;
    }
    const updated = { ...user, actif: !user.actif };
    storage.saveUser(updated, currentUser);
    setUsers(storage.getUsers());
    onUserListUpdated();
  };

  // Export Backup File
  const handleDownloadBackup = () => {
    const jsonStr = storage.exportFullBackup();
    const dateStr = new Date().toISOString().slice(0, 10);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MAISON_MP_MOTORS_BACKUP_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFeedback({ type: 'success', text: "Fichier de sauvegarde complet téléchargé." });
  };

  // Restore Backup File
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("Êtes-vous certain de vouloir restaurer cette sauvegarde ? Les données actuelles seront remplacées.")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      const res = storage.importFullBackup(text, currentUser);
      if (res.success) {
        setFeedback({ type: 'success', text: res.message });
        setParams(storage.getParams());
        setUsers(storage.getUsers());
        onUserListUpdated();
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950 text-slate-100 space-y-6">
      {/* Top Header */}
      <div className="flex items-center gap-3 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Paramètres Généraux, Utilisateurs & Sauvegardes
          </h2>
          <p className="text-xs text-slate-400">
            Identité de l'entreprise • Taux USD/CDF • Comptes & Rôles • Sauvegarde locale 100% hors ligne
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
              : 'bg-red-950/80 border-red-700 text-red-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="font-bold">×</button>
        </div>
      )}

      {/* Main Grid: Parameters Form & Users + Backups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Parameters & Logo */}
        <form
          onSubmit={handleSaveParameters}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span>Coordonnées Entreprise & Monnaies</span>
            </h3>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Enregistrer</span>
            </button>
          </div>

          {/* Logo upload and preview */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
              Logo de l'entreprise (Factures, Tickets, En-tête)
            </label>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-500" />
                )}
              </div>
              <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-bold text-white cursor-pointer transition-colors">
                Changer de logo...
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
              {logoPreview && (
                <button
                  type="button"
                  onClick={() => setLogoPreview(undefined)}
                  className="text-xs text-red-400 hover:underline"
                >
                  Supprimer
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
              Raison Sociale / Nom affiché
            </label>
            <input
              type="text"
              required
              value={entrepriseNom}
              onChange={e => setEntrepriseNom(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Téléphones
              </label>
              <input
                type="text"
                value={telephone}
                onChange={e => setTelephone(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Email de contact
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
              Adresse physique du magasin
            </label>
            <input
              type="text"
              value={adresse}
              onChange={e => setAdresse(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Currency Rate & Margins */}
          <div className="pt-2 border-t border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-blue-400 uppercase">
              Règles Monétaires & Tarification
            </h4>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Taux USD / CDF *
                </label>
                <input
                  type="number"
                  required
                  value={tauxUSD_CDF}
                  onChange={e => setTauxUSD_CDF(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Marge défaut (%)
                </label>
                <input
                  type="number"
                  value={margeDefaut}
                  onChange={e => setMargeDefaut(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Seuil Alerte Stock
                </label>
                <input
                  type="number"
                  value={seuilAlerte}
                  onChange={e => setSeuilAlerte(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <input
                type="checkbox"
                id="blockCredit"
                checked={bloquerCredit}
                onChange={e => setBloquerCredit(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 bg-slate-800 border-slate-700"
              />
              <label htmlFor="blockCredit" className="text-xs text-slate-300 font-semibold cursor-pointer">
                Bloquer automatiquement la vente à crédit si le client dépasse son plafond
              </label>
            </div>
          </div>
        </form>

        {/* RIGHT: Users & Backup Engine */}
        <div className="space-y-6">
          {/* ARCHITECT LICENSE & EXPIRATION CONTROL PANEL */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-indigo-950/40 border-2 border-amber-500/40 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Crown className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                    <span>Contrôle des Licences & Validités</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Règles de Durée
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Architecte (À vie) • Super Admin (2 mois) • Admin & Employés (1 mois 15j) • Invité (15j)
                  </p>
                </div>
              </div>

              {/* Global Lifetime Toggle Button (Architect only) */}
              {currentUser.role === 'ARCHITECTE' ? (
                <button
                  type="button"
                  onClick={handleToggleGlobalLifetime}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer border ${
                    globalLifetime
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-emerald-600/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40'
                  }`}
                >
                  <InfinityIcon className="w-4 h-4" />
                  <span>{globalLifetime ? 'Licence Entreprise : À VIE ACTIF' : 'Activer Licence À Vie (Tous)'}</span>
                </button>
              ) : (
                <div className="text-[11px] text-slate-400 italic">
                  Modification réservée à l'Architecte
                </div>
              )}
            </div>

            {globalLifetime && (
              <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>
                  <strong>Licence Globale à Vie Active :</strong> L'Architecte a accordé un accès permanent illimité à toute l'entreprise. Aucun compte ne sera bloqué par expiration.
                </span>
              </div>
            )}
          </div>

          {/* Users List with License Indicators */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span>Utilisateurs & Périodes d'Accès ({users.length})</span>
              </h3>
              <button
                onClick={() => setNewUserModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter un Compte</span>
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {users.map(u => {
                const uLic = getUserLicenseStatus(u, globalLifetime);
                const canModifyThisUser =
                  (currentUser.role === 'ARCHITECTE' || currentUser.role === 'SUPERADMIN') &&
                  u.role !== 'ARCHITECTE';

                return (
                  <div
                    key={u.id}
                    className={`p-3 rounded-xl border transition-all text-xs space-y-2 ${
                      u.role === 'ARCHITECTE'
                        ? 'bg-amber-950/20 border-amber-500/40'
                        : uLic.estExpire
                        ? 'bg-red-950/25 border-red-500/50'
                        : 'bg-slate-800/80 border-slate-750'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          {u.role === 'ARCHITECTE' && <Crown className="w-4 h-4 text-amber-400" />}
                          <span>{u.nom}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono font-bold ${
                            u.role === 'ARCHITECTE'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                              : u.role === 'SUPERADMIN'
                              ? 'bg-purple-900/60 text-purple-200 border-purple-500/40'
                              : u.role === 'ADMIN'
                              ? 'bg-blue-900/60 text-blue-200 border-blue-500/40'
                              : u.role === 'INVITE'
                              ? 'bg-slate-800 text-slate-300 border-slate-600'
                              : 'bg-slate-900 text-slate-300 border-slate-700'
                          }`}>
                            {u.role}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Identifiant : <span className="font-mono text-slate-300">@{u.identifiant}</span> • PIN : <span className="font-mono text-slate-300">{u.pin || '1234'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleUserActive(u)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                            u.actif
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-red-950 text-red-400 border border-red-800'
                          }`}
                        >
                          {u.actif ? 'ACTIF' : 'DÉSACTIVÉ'}
                        </button>
                      </div>
                    </div>

                    {/* License status line */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-700/60">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${uLic.badgeColor}`}>
                          {uLic.label}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({uLic.dateExpirationFormatee})
                        </span>
                      </div>

                      {/* Quick extension actions for Architect / Super Admin */}
                      {canModifyThisUser && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleProlongUser(u.id, 'ADD_15_DAYS')}
                            className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-bold cursor-pointer"
                            title="Ajouter 15 jours de validité"
                          >
                            +15j
                          </button>
                          <button
                            type="button"
                            onClick={() => handleProlongUser(u.id, 'ADD_30_DAYS')}
                            className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-bold cursor-pointer"
                            title="Ajouter 1 mois (30 jours)"
                          >
                            +1m
                          </button>
                          <button
                            type="button"
                            onClick={() => handleProlongUser(u.id, 'ADD_60_DAYS')}
                            className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-bold cursor-pointer"
                            title="Ajouter 2 mois (60 jours)"
                          >
                            +2m
                          </button>
                          {currentUser.role === 'ARCHITECTE' && (
                            <button
                              type="button"
                              onClick={() => handleProlongUser(u.id, 'SET_LIFETIME')}
                              className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold cursor-pointer shadow-sm"
                              title="Définir ce compte comme illimité à vie"
                            >
                              À Vie ♾️
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Backup & System Integrity */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Sauvegardes & Restauration Locale</span>
            </h3>

            <p className="text-xs text-slate-300">
              Protégez vos données contre les pannes d'ordinateur. Sauvegardez régulièrement sur une clé USB externe.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={handleDownloadBackup}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger Sauvegarde</span>
              </button>

              <label className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white text-xs font-bold cursor-pointer transition-all">
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Restaurer Sauvegarde</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleRestoreBackup}
                  className="hidden"
                />
              </label>
            </div>

            {/* Database Engine & Automated CRUD Diagnostic */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-200">
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                  <span>Moteur de Base de Données Actif</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  {dbConfig.engine === 'SQLITE_EMBEDDED' ? 'SQLite WAL Embarqué' :
                   dbConfig.engine === 'POSTGRESQL' ? 'PostgreSQL Serveur' :
                   dbConfig.engine === 'MYSQL_MARIADB' ? 'MySQL / MariaDB' : 'IndexedDB Local'}
                </span>
              </div>

              <div className="space-y-1 text-slate-400">
                <div className="flex justify-between">
                  <span>Base sélectionnée :</span>
                  <span className="font-mono text-slate-200">{dbConfig.databaseName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Schéma relationnel :</span>
                  <span className="text-emerald-400 font-semibold">{dbConfig.totalTablesCount} tables vérifiées</span>
                </div>
                {dbConfig.lastLatencyMs !== undefined && (
                  <div className="flex justify-between">
                    <span>Latence CRUD mesurée :</span>
                    <span className="font-mono text-blue-400">{dbConfig.lastLatencyMs} ms</span>
                  </div>
                )}
              </div>

              {onOpenDbConfig && (
                <button
                  type="button"
                  onClick={onOpenDbConfig}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-xs cursor-pointer transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Changer de Base & Tester le CRUD Automatique</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: New User */}
      {newUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateUser}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>Créer un utilisateur</span>
              </h3>
              <button
                type="button"
                onClick={() => setNewUserModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Nom complet *
              </label>
              <input
                type="text"
                required
                value={newNom}
                onChange={e => setNewNom(e.target.value)}
                placeholder="Ex: Sarah Tshilombo (Caisse 2)"
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Identifiant de connexion *
              </label>
              <input
                type="text"
                required
                value={newIdentifiant}
                onChange={e => setNewIdentifiant(e.target.value)}
                placeholder="Ex: caisse2"
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Rôle
                </label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as Role)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="CAISSIER">CAISSIER (1 mois 15j)</option>
                  <option value="MAGASINIER">MAGASINIER (1 mois 15j)</option>
                  <option value="COMPTABLE">COMPTABLE (1 mois 15j)</option>
                  <option value="ADMIN">ADMIN (1 mois 15j)</option>
                  <option value="SUPERADMIN">SUPERADMIN (2 mois)</option>
                  <option value="INVITE">INVITE (15 jours)</option>
                  <option value="ARCHITECTE">ARCHITECTE (À vie ♾️)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Code PIN (4 chiffres)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={newPin}
                  onChange={e => setNewPin(e.target.value)}
                  placeholder="1234"
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Lifetime license checkbox for Architect */}
            {currentUser.role === 'ARCHITECTE' && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-950/30 border border-amber-500/30">
                <input
                  type="checkbox"
                  id="newIsLifetime"
                  checked={newIsLifetime || newRole === 'ARCHITECTE'}
                  disabled={newRole === 'ARCHITECTE'}
                  onChange={e => setNewIsLifetime(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 bg-slate-800 border-slate-700 cursor-pointer"
                />
                <label htmlFor="newIsLifetime" className="text-xs text-amber-300 font-semibold cursor-pointer flex items-center gap-1.5">
                  <InfinityIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Accorder la licence permanente à vie (sans date d'expiration)</span>
                </label>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setNewUserModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Créer le compte
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
