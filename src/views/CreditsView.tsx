/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Customer Credits & Partial Settlements
 */

import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  DollarSign,
  Plus,
  CheckCircle,
  AlertCircle,
  History,
  User,
  ArrowDownRight,
  ShieldAlert,
} from 'lucide-react';
import { Client, Currency, PaymentMethod, PaiementCredit, User as AppUser } from '../shared/types';
import { storage } from '../services/storage';
import { salesService } from '../services/salesService';
import { formatUSD, formatCDF, centsUSDToCDF, cdfToCentsUSD, usdToCents } from '../shared/money';

interface CreditsViewProps {
  currentUser: AppUser;
}

export const CreditsView: React.FC<CreditsViewProps> = ({ currentUser }) => {
  const [params] = useState(storage.getParams());
  const [clients, setClients] = useState<Client[]>(storage.getClients());
  const [paiements, setPaiements] = useState<PaiementCredit[]>(storage.getPaiementsCredit());
  const [searchTerm, setSearchTerm] = useState('');

  // Payment modal
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [paymentDevise, setPaymentDevise] = useState<Currency>('USD');
  const [paymentAmountStr, setPaymentAmountStr] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ESPECES');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter clients
  const filteredClients = clients.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      c.nom.toLowerCase().includes(term) ||
      c.code.toLowerCase().includes(term) ||
      c.telephone.toLowerCase().includes(term)
    );
  });

  // Total outstanding debt across all customers in USD
  const totalOutstandingUSD = clients.reduce((sum, c) => sum + c.soldeActuelUSD, 0);

  const handleSettlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    setFeedback(null);

    const rawVal = parseFloat(paymentAmountStr.replace(',', '.'));
    if (isNaN(rawVal) || rawVal <= 0) {
      setFeedback({ type: 'error', text: "Le montant saisi est invalide." });
      return;
    }

    let amountCentsUSD = 0;
    if (paymentDevise === 'USD') {
      amountCentsUSD = usdToCents(rawVal);
    } else {
      amountCentsUSD = cdfToCentsUSD(rawVal, params.tauxUSD_CDF);
    }

    const res = salesService.recordCreditPayment(
      selectedClient.id,
      amountCentsUSD,
      paymentDevise,
      rawVal,
      paymentMethod,
      paymentNote,
      currentUser
    );

    if (res.success && res.paiement) {
      setFeedback({
        type: 'success',
        text: `Versement de $ ${(amountCentsUSD / 100).toFixed(2)} enregistré avec succès pour ${selectedClient.nom}. Nouveau solde : $ ${(res.paiement.soldeApresUSD / 100).toFixed(2)}.`,
      });
      // Refresh
      setClients(storage.getClients());
      setPaiements(storage.getPaiementsCredit());
      setSelectedClient(null);
      setPaymentAmountStr('');
      setPaymentNote('');
    } else {
      setFeedback({ type: 'error', text: res.message || "Erreur lors de l'enregistrement du versement." });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Banner */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-pink-600/20 text-pink-400 border border-pink-500/30">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Gestion des Crédits Clients & Encaissements
            </h2>
            <p className="text-xs text-slate-400">
              Soldes en USD • Règlements en devises USD ou CDF • Historique des versements
            </p>
          </div>
        </div>

        {/* Total Outstanding Card */}
        <div className="px-4 py-2 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold">
              Total Crédits Ouverts (Dettes clients)
            </div>
            <div className="text-base font-extrabold text-white font-mono">
              {formatUSD(totalOutstandingUSD)}
              <span className="text-xs font-normal text-slate-400 ml-2">
                (~ {formatCDF(centsUSDToCDF(totalOutstandingUSD, params.tauxUSD_CDF))})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`mx-4 mt-3 p-3 rounded-xl border text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
              : 'bg-red-950/80 border-red-700 text-red-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="font-bold">
            ×
          </button>
        </div>
      )}

      {/* Main Split: Clients with debts on Left, Recent Payments on Right */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 gap-4">
        {/* LEFT: Clients debts list */}
        <div className="w-full lg:w-7/12 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-3 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
            <div className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-blue-400" />
              <span>Comptes Clients & Encours ({clients.length})</span>
            </div>

            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Filtrer client..."
                className="w-full pl-8 pr-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredClients.map(c => {
              const hasDebt = c.soldeActuelUSD > 0;
              const isOverLimit = c.soldeActuelUSD > c.creditAutorise;

              return (
                <div
                  key={c.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    hasDebt
                      ? isOverLimit
                        ? 'bg-red-950/30 border-red-800/80'
                        : 'bg-slate-800/90 border-slate-700'
                      : 'bg-slate-900/50 border-slate-800 opacity-70'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-blue-400">
                        {c.code}
                      </span>
                      <span className="text-xs font-bold text-white uppercase">
                        {c.nom}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-semibold">
                        {c.type}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                      <span>Tél: {c.telephone || 'Non renseigné'}</span>
                      <span>•</span>
                      <span>Plafond: {formatUSD(c.creditAutorise)}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">
                      Solde Dû
                    </div>
                    <div
                      className={`font-mono font-extrabold text-sm ${
                        hasDebt ? (isOverLimit ? 'text-red-400' : 'text-amber-400') : 'text-emerald-400'
                      }`}
                    >
                      {formatUSD(c.soldeActuelUSD)}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedClient(c);
                        setPaymentAmountStr((c.soldeActuelUSD / 100).toFixed(2));
                      }}
                      className="mt-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer"
                    >
                      Encaisser un versement
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Recent Payment Receipts */}
        <div className="w-full lg:w-5/12 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-3 bg-slate-850 border-b border-slate-800 font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <span>Historique des Versements ({paiements.length})</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {paiements.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Aucun versement de crédit enregistré pour le moment.
              </div>
            ) : (
              paiements.map(p => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-slate-800/80 border border-slate-750 text-xs space-y-1"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-white uppercase">{p.clientNom}</span>
                      <div className="text-[10px] text-slate-400">
                        {new Date(p.date).toLocaleString('fr-FR')} • {p.modePaiement}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-extrabold text-emerald-400 text-sm">
                        + {formatUSD(p.montantUSD)}
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {p.montantCDF.toLocaleString('fr-FR')} FC
                      </div>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-slate-700/60 flex justify-between text-[10px] text-slate-400">
                    <span>
                      Solde : {formatUSD(p.soldeAvantUSD)} →{' '}
                      <span className="text-white font-bold">{formatUSD(p.soldeApresUSD)}</span>
                    </span>
                    <span>Reçu par: {p.utilisateurNom}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Settle Payment */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form
            onSubmit={handleSettlePayment}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Règlement de Crédit : {selectedClient.nom}</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="p-3 bg-slate-850 rounded-xl border border-slate-750 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Dette actuelle totale :</span>
                <span className="font-mono font-bold text-red-400 text-sm">
                  {formatUSD(selectedClient.soldeActuelUSD)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Équivalent CDF (au taux de {params.tauxUSD_CDF}) :</span>
                <span className="font-mono text-slate-300">
                  {formatCDF(centsUSDToCDF(selectedClient.soldeActuelUSD, params.tauxUSD_CDF))}
                </span>
              </div>
            </div>

            {/* Currency switcher for payment */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Devise de versement
                </label>
                <div className="flex rounded-lg overflow-hidden border border-slate-700 bg-slate-800 p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentDevise('USD');
                      setPaymentAmountStr((selectedClient.soldeActuelUSD / 100).toFixed(2));
                    }}
                    className={`flex-1 py-1 text-xs font-bold rounded cursor-pointer ${
                      paymentDevise === 'USD' ? 'bg-blue-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    USD ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentDevise('CDF');
                      setPaymentAmountStr(centsUSDToCDF(selectedClient.soldeActuelUSD, params.tauxUSD_CDF).toString());
                    }}
                    className={`flex-1 py-1 text-xs font-bold rounded cursor-pointer ${
                      paymentDevise === 'CDF' ? 'bg-blue-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    CDF (Francs)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Mode de règlement
                </label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="ESPECES">Espèces</option>
                  <option value="M_PESA">M-Pesa</option>
                  <option value="AIRTEL_MONEY">Airtel Money</option>
                  <option value="ORANGE_MONEY">Orange Money</option>
                  <option value="VIREMENT">Virement bancaire</option>
                </select>
              </div>
            </div>

            {/* Amount input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Montant versé ({paymentDevise})
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                required
                value={paymentAmountStr}
                onChange={e => setPaymentAmountStr(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Référence / Note <span className="text-slate-500 font-normal">(Optionnel)</span>
              </label>
              <input
                type="text"
                value={paymentNote}
                onChange={e => setPaymentNote(e.target.value)}
                placeholder="Ex: Acompte semaine, reçu N° 45..."
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                Enregistrer le versement
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
