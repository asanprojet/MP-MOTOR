/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Audit Trail & Activity Log (Superadmin Only)
 */

import React, { useState } from 'react';
import { ShieldAlert, Search, ShieldCheck, Filter, Clock, User } from 'lucide-react';
import { JournalActivite, User as AppUser } from '../shared/types';
import { storage } from '../services/storage';

interface AuditLogViewProps {
  currentUser: AppUser;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ currentUser }) => {
  const [logs] = useState<JournalActivite[]>(storage.getJournal());
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');

  if (currentUser.role !== 'SUPERADMIN' && currentUser.role !== 'ARCHITECTE') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-slate-400 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mb-3" />
        <h3 className="text-base font-bold text-white">Accès Réservé à l'Architecte et au Superadmin</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Le journal d'audit contient la traçabilité intégrale de toutes les opérations sensibles et n'est consultable que par l'Architecte ou le Superadmin.
        </p>
      </div>
    );
  }

  const entities = Array.from(new Set(logs.map(l => l.entite)));

  const filteredLogs = logs.filter(l => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      l.action.toLowerCase().includes(term) ||
      l.details.toLowerCase().includes(term) ||
      l.utilisateurNom.toLowerCase().includes(term) ||
      (l.reference && l.reference.toLowerCase().includes(term));

    const matchEntity = entityFilter === 'ALL' || l.entite === entityFilter;
    return matchSearch && matchEntity;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Journal d'Activité & Traçabilité (Audit Log)
            </h2>
            <p className="text-xs text-slate-400">
              {logs.length} événements enregistrés • Sécurité & historique des actions sensibles
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-4 py-3 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher par action, utilisateur, référence..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
          />
        </div>

        <select
          value={entityFilter}
          onChange={e => setEntityFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-purple-500"
        >
          <option value="ALL">Toutes les entités</option>
          {entities.map(e => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="flex-1 overflow-auto p-4">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
              <th className="py-2.5 px-3">Horodatage</th>
              <th className="py-2.5 px-3">Utilisateur</th>
              <th className="py-2.5 px-3">Action</th>
              <th className="py-2.5 px-3">Entité / Réf</th>
              <th className="py-2.5 px-3">Détails de l'opération</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  Aucun événement d'audit ne correspond à cette recherche.
                </td>
              </tr>
            ) : (
              filteredLogs.map(l => (
                <tr key={l.id} className="hover:bg-slate-850/60 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap text-[11px]">
                    {new Date(l.date).toLocaleString('fr-FR')}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap">
                    {l.utilisateurNom}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                      {l.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                    <span className="font-semibold text-blue-400">{l.entite}</span>
                    {l.reference && (
                      <span className="ml-1 font-mono text-slate-400 text-[10px]">[{l.reference}]</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {l.details}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
