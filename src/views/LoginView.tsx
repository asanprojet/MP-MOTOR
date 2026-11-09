/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Authentification Interface
 */

import React, { useState } from 'react';
import { User, Lock, LogIn, AlertCircle } from 'lucide-react';
import { storage } from '../services/storage';
import { User as UserType } from '../shared/types';

interface LoginViewProps {
  onLogin: (user: UserType) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [identifiant, setIdentifiant] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const users = storage.getUsers();
    const user = users.find(u => u.identifiant === identifiant && u.pin === pin);

    if (user) {
      if (user.actif) {
        storage.setCurrentUser(user);
        onLogin(user);
      } else {
        setError('Compte désactivé. Veuillez contacter l\'Architecte.');
      }
    } else {
      setError('Identifiant ou PIN incorrect.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/30">
            <LogIn className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white uppercase tracking-wider">Maison MP Motors</h1>
          <p className="text-xs text-slate-400">Veuillez vous connecter pour accéder au comptoir.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Identifiant</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-blue-500 outline-hidden"
                placeholder="Ex: caissier"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Code PIN</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:border-blue-500 outline-hidden"
                placeholder="••••"
                required
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-xs font-semibold bg-red-950/30 p-2 rounded-lg border border-red-500/20">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/20 cursor-pointer transition-all"
          >
            Connexion au système
          </button>
        </form>
      </div>
    </div>
  );
};
