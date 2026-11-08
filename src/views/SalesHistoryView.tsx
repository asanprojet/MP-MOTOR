/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Sales Invoices History & Reprint
 */

import React, { useState } from 'react';
import {
  FileText,
  Search,
  Printer,
  XCircle,
  CheckCircle,
  AlertCircle,
  Calendar,
  DollarSign,
  Send,
  Eye,
} from 'lucide-react';
import { Vente, User } from '../shared/types';
import { storage } from '../services/storage';
import { salesService } from '../services/salesService';
import { hasPermission } from '../shared/permissions';
import { formatUSD, formatCDF } from '../shared/money';
import { PrintTicketModal } from '../components/PrintTicketModal';

interface SalesHistoryViewProps {
  currentUser: User;
}

export const SalesHistoryView: React.FC<SalesHistoryViewProps> = ({ currentUser }) => {
  const [params] = useState(storage.getParams());
  const [ventes, setVentes] = useState<Vente[]>(storage.getVentes());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VALIDE' | 'ANNULE'>('ALL');

  // Print modal
  const [printModalVente, setPrintModalVente] = useState<Vente | null>(null);

  // Cancellation modal
  const [cancelModalVente, setCancelModalVente] = useState<Vente | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const canCancelDirect = hasPermission(currentUser.role, 'canCancelSalesDirectly');
  const canRequestCancel = hasPermission(currentUser.role, 'canRequestSalesCancellation');

  // Filtered sales
  const filtered = ventes.filter(v => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      v.numero.toLowerCase().includes(term) ||
      v.clientNom.toLowerCase().includes(term) ||
      v.utilisateurNom.toLowerCase().includes(term) ||
      v.lignes.some(l => l.designation.toLowerCase().includes(term));

    const matchStatus = statusFilter === 'ALL' || v.statut === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCancelOrRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalVente) return;
    setFeedbackMessage(null);

    if (canCancelDirect) {
      // Direct cancellation (Admin)
      const res = salesService.cancelSaleDirect(
        cancelModalVente.numero,
        cancelReason,
        currentUser
      );
      if (res.success) {
        setVentes(storage.getVentes());
        setFeedbackMessage({
          type: 'success',
          text: `Facture ${cancelModalVente.numero} annulée avec succès et stocks remis en rayon.`,
        });
        setCancelModalVente(null);
        setCancelReason('');
      } else {
        setFeedbackMessage({ type: 'error', text: res.message || "Erreur lors de l'annulation." });
      }
    } else if (canRequestCancel) {
      // Submit modification request (Cashier)
      const res = salesService.requestSaleCancellation(
        cancelModalVente.numero,
        cancelReason,
        currentUser
      );
      if (res.success) {
        setFeedbackMessage({
          type: 'success',
          text: res.message || "Demande d'annulation soumise à la direction.",
        });
        setCancelModalVente(null);
        setCancelReason('');
      } else {
        setFeedbackMessage({ type: 'error', text: res.message || "Erreur lors de la soumission." });
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Historique des Factures & Ventes au Comptoir
            </h2>
            <p className="text-xs text-slate-400">
              Taux figés sur chaque facture • Réimpression tickets 80mm & factures A4 • Traçabilité
            </p>
          </div>
        </div>
      </div>

      {/* Feedback banner */}
      {feedbackMessage && (
        <div
          className={`mx-4 mt-3 p-3 rounded-xl border text-xs flex items-center justify-between ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
              : 'bg-red-950/80 border-red-700 text-red-200'
          }`}
        >
          <span>{feedbackMessage.text}</span>
          <button onClick={() => setFeedbackMessage(null)} className="font-bold">
            ×
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="px-4 py-3 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Rechercher par N° facture (ex: FAC-...), client, caissier, pièce..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex rounded-lg overflow-hidden border border-slate-700 bg-slate-800 p-0.5 text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded font-semibold transition-colors cursor-pointer ${
              statusFilter === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Toutes ({ventes.length})
          </button>
          <button
            onClick={() => setStatusFilter('VALIDE')}
            className={`px-3 py-1 rounded font-semibold transition-colors cursor-pointer ${
              statusFilter === 'VALIDE' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            Validées
          </button>
          <button
            onClick={() => setStatusFilter('ANNULE')}
            className={`px-3 py-1 rounded font-semibold transition-colors cursor-pointer ${
              statusFilter === 'ANNULE' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-red-400'
            }`}
          >
            Annulées
          </button>
        </div>
      </div>

      {/* Sales Invoices List */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            Aucune facture ne correspond à ces critères.
          </div>
        ) : (
          filtered.map(v => (
            <div
              key={v.id}
              className={`p-4 rounded-xl border transition-all ${
                v.statut === 'ANNULE'
                  ? 'bg-slate-900/40 border-red-900/30 opacity-70'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700 shadow-md'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Left Invoice Info */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-blue-400">
                      {v.numero}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        v.statut === 'ANNULE'
                          ? 'bg-red-950 text-red-400 border border-red-800'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      }`}
                    >
                      {v.statut === 'ANNULE' ? 'FACTURE ANNULÉE' : 'VALIDÉE'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                      {v.modePaiement}
                    </span>
                  </div>

                  <div className="text-xs text-white font-bold mt-1">
                    Client : <span className="uppercase text-blue-300">{v.clientNom}</span>
                  </div>

                  <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                    <span>{new Date(v.date).toLocaleString('fr-FR')}</span>
                    <span>•</span>
                    <span>Caissier: {v.utilisateurNom}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-300">
                      Taux figé: 1 USD = {v.tauxUSD_CDF} CDF
                    </span>
                  </div>

                  {/* Summary of items in invoice */}
                  <div className="mt-2 text-xs text-slate-300">
                    <span className="text-slate-500">Articles : </span>
                    {v.lignes.map(l => `${l.quantite}x ${l.designation}`).join(' • ')}
                  </div>
                </div>

                {/* Right Total & Actions */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-2 md:pt-0 border-slate-800">
                  <div className="text-right">
                    <div className="font-mono font-extrabold text-base text-white">
                      {formatUSD(v.totalUSD)}
                    </div>
                    <div className="font-mono text-xs text-emerald-400">
                      {formatCDF(v.totalCDF)}
                    </div>
                    {v.remiseUSD > 0 && (
                      <div className="text-[10px] text-red-400 font-semibold">
                        Remise: -{formatUSD(v.remiseUSD)}
                      </div>
                    )}
                    {v.resteAPayerUSD > 0 && (
                      <div className="text-[10px] text-amber-400 font-bold">
                        Crédit dû: {formatUSD(v.resteAPayerUSD)}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => setPrintModalVente(v)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Imprimer</span>
                    </button>

                    {v.statut !== 'ANNULE' && (canCancelDirect || canRequestCancel) && (
                      <button
                        onClick={() => {
                          setCancelModalVente(v);
                          setCancelReason('');
                        }}
                        className="px-2.5 py-1.5 bg-red-950/80 hover:bg-red-800 text-red-300 border border-red-800/80 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                      >
                        {canCancelDirect ? 'Annuler facture' : 'Demander annulation'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Print modal */}
      {printModalVente && (
        <PrintTicketModal
          vente={printModalVente}
          params={params}
          onClose={() => setPrintModalVente(null)}
        />
      )}

      {/* Cancellation / Request Modal */}
      {cancelModalVente && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form
            onSubmit={handleCancelOrRequest}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>
                  {canCancelDirect
                    ? `Annuler la Facture ${cancelModalVente.numero}`
                    : `Demande d'annulation : ${cancelModalVente.numero}`}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setCancelModalVente(null)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-300">
              {canCancelDirect
                ? "L'annulation remettra immédiatement les articles en rayon et ajustera le solde crédit du client s'il y a lieu."
                : "En tant que caissier, cette action transmettra une demande officielle au Gérant pour approbation avant annulation."}
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Motif explicite obligatoire *
              </label>
              <input
                type="text"
                required
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Ex: Erreur de référence, client désisté, double saisie..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCancelModalVente(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Fermer
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                {canCancelDirect ? "Confirmer l'annulation" : "Envoyer la demande"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
