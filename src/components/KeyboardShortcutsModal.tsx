/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Keyboard Shortcuts Modal (F1 - F9)
 */

import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'F1', desc: 'Aide & guide des raccourcis clavier' },
    { key: 'F2', desc: 'Ouvrir la Caisse Rapide au comptoir' },
    { key: 'F3', desc: 'Ouvrir le Catalogue Articles & Stock' },
    { key: 'F4', desc: 'Nouvel Approvisionnement Achat (PUMP)' },
    { key: 'F5', desc: 'Historique des Factures de vente' },
    { key: 'F6', desc: 'Gestion des Crédits & Encaissements clients' },
    { key: 'F7', desc: 'Tableau de bord financier' },
    { key: 'F8', desc: 'Rapports & Arrêt de caisse' },
    { key: 'F9', desc: 'Valider et encaisser la vente en cours' },
    { key: 'Entrée', desc: 'Rechercher ou ajouter via lecteur code-barres' },
    { key: 'Échap', desc: 'Fermer la boîte de dialogue en cours' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm text-white uppercase tracking-wider">
              Raccourcis Clavier Rapides
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Pour une vitesse maximale au comptoir sans souris, utilisez les touches de fonction directes.
        </p>

        <div className="space-y-2">
          {shortcuts.map(s => (
            <div
              key={s.key}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80 border border-slate-750 text-xs"
            >
              <span className="text-slate-300 font-medium">{s.desc}</span>
              <kbd className="px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono font-bold text-blue-300 shadow-inner">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer"
          >
            Compris
          </button>
        </div>
      </div>
    </div>
  );
};
