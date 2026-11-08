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
} from 'lucide-react';
import { User, Parametres, Role } from '../shared/types';
import { storage } from '../services/storage';

interface SettingsViewProps {
  currentUser: User;
  onUserListUpdated: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, onUserListUpdated }) => {
  const [params, setParams] = useState<Parametres>(storage.getParams());
  const [users, setUsers] = useState<User[]>(storage.getUsers());

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

  // Feedback & Backup
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    const newUser: User = {
      id,
      nom: newNom.trim(),
      identifiant: newIdentifiant.trim().toLowerCase(),
      role: newRole,
      actif: true,
      pin: newPin || '1234',
      echecsConnexion: 0,
    };

    storage.saveUser(newUser, currentUser);
    setUsers(storage.getUsers());
    onUserListUpdated();
    setNewUserModalOpen(false);
    setNewNom('');
    setNewIdentifiant('');
    setFeedback({ type: 'success', text: `Compte utilisateur ${newUser.nom} créé avec succès.` });
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
          {/* Users List */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span>Utilisateurs & Rôles ({users.length})</span>
              </h3>
              <button
                onClick={() => setNewUserModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter</span>
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {users.map(u => (
                <div
                  key={u.id}
                  className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-750 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{u.nom}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded border bg-slate-900 border-slate-700 text-blue-300 font-mono">
                        {u.role}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Identifiant : @{u.identifiant} • PIN : {u.pin || '1234'}
                    </div>
                  </div>

                  <div>
                    <button
                      onClick={() => handleToggleUserActive(u)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.actif
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-red-950 text-red-400 border border-red-800'
                      }`}
                    >
                      {u.actif ? 'ACTIF' : 'DÉSACTIVÉ'}
                    </button>
                  </div>
                </div>
              ))}
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

            {/* Diagnostic info */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-300">
                <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                <span>Diagnostic Système & Intégrité</span>
              </div>
              <p>Moteur local : SQLite WAL Compatible / Atomic Transactions</p>
              <p>Statut réseau : 100% Autonome sans connexion internet requise</p>
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
                  <option value="CAISSIER">CAISSIER</option>
                  <option value="MAGASINIER">MAGASINIER</option>
                  <option value="COMPTABLE">COMPTABLE</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPERADMIN">SUPERADMIN</option>
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
