/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Desktop Title Bar & Session Header
 */

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  WifiOff,
  UserCheck,
  Clock,
  Keyboard,
  ChevronDown,
  DollarSign,
  ShieldCheck,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { User, Role } from '../shared/types';
import { storage } from '../services/storage';

interface DesktopHeaderProps {
  currentUser: User;
  onUserChange: (user: User) => void;
  onOpenShortcuts: () => void;
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  currentUser,
  onUserChange,
  onOpenShortcuts,
}) => {
  const [params, setParams] = useState(storage.getParams());
  const [allUsers, setAllUsers] = useState<User[]>(storage.getUsers());
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSwitchUser = (user: User) => {
    storage.setCurrentUser(user);
    onUserChange(user);
    setUserDropdownOpen(false);
  };

  const getRoleBadgeColor = (role: Role) => {
    switch (role) {
      case 'SUPERADMIN':
        return 'bg-purple-900/60 text-purple-200 border-purple-500/40';
      case 'ADMIN':
        return 'bg-blue-900/60 text-blue-200 border-blue-500/40';
      case 'MAGASINIER':
        return 'bg-amber-900/60 text-amber-200 border-amber-500/40';
      case 'CAISSIER':
        return 'bg-emerald-900/60 text-emerald-200 border-emerald-500/40';
      case 'COMPTABLE':
        return 'bg-cyan-900/60 text-cyan-200 border-cyan-500/40';
    }
  };

  return (
    <header className="no-print bg-slate-900 border-b border-slate-800 text-slate-100 select-none shadow-md">
      {/* Top simulated Windows title bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-slate-950 text-xs text-slate-400 border-b border-slate-900">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 font-semibold text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-sm shadow-blue-500/50"></span>
            <span>MAISON MP MOTORS</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 font-normal">Gestion de Quincaillerie Automobile (Comptoir)</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Offline indicator */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 font-medium">
            <WifiOff className="w-3.5 h-3.5" />
            <span>100% Hors Ligne</span>
          </div>

          {/* Clock */}
          <div className="flex items-center gap-1 text-slate-300 font-mono">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{time}</span>
          </div>

          {/* Window controls decoration */}
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-800">
            <span className="w-3 h-3 rounded-full bg-slate-700/60 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-slate-700/60 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-blue-600/80 inline-block"></span>
          </div>
        </div>
      </div>

      {/* Primary operational bar */}
      <div className="flex items-center justify-between px-4 py-2.5">
        {/* Company Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center shadow-lg shadow-blue-900/40 border border-blue-500/30 overflow-hidden">
            {params.logoDataUrl ? (
              <img src={params.logoDataUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Wrench className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-wide uppercase">
                {params.entrepriseNom || 'MAISON MP MOTORS'}
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Kinshasa
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-sm">
              {params.adresse}
            </p>
          </div>
        </div>

        {/* Currency rate badge & controls */}
        <div className="flex items-center gap-3">
          {/* Taux USD / CDF */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 shadow-inner">
            <div className="p-1 rounded bg-blue-500/20 text-blue-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-[10px] text-slate-400 font-semibold uppercase leading-tight">
                Taux du jour
              </div>
              <div className="text-xs font-bold text-white font-mono">
                1 USD = <span className="text-emerald-400">{params.tauxUSD_CDF.toLocaleString('fr-FR')} CDF</span>
              </div>
            </div>
          </div>

          {/* Keyboard shortcuts trigger */}
          <button
            onClick={onOpenShortcuts}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 transition-colors"
            title="Afficher les raccourcis clavier [F1]"
          >
            <Keyboard className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Raccourcis</span>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-900 rounded border border-slate-600 font-mono text-slate-300">
              F1
            </kbd>
          </button>

          {/* Active User session & Switcher */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-left transition-all cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-blue-300 border border-slate-600">
                {currentUser.nom.charAt(0)}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <span>{currentUser.nom}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${getRoleBadgeColor(currentUser.role)}`}>
                    {currentUser.role}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Changer de rôle / session
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
            </button>

            {/* Dropdown to test/switch roles */}
            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Changer de session de travail
                </div>
                {allUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleSwitchUser(u)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-800 transition-colors ${
                      currentUser.id === u.id ? 'bg-blue-600/10 text-blue-300' : 'text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{u.nom}</div>
                      <div className="text-[10px] text-slate-400">@{u.identifiant}</div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${getRoleBadgeColor(u.role)}`}>
                      {u.role}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
