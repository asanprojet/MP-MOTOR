/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Printable Thermal Ticket (80mm) & A4/A5 Invoice Modal
 */

import React, { useRef } from 'react';
import { Printer, X, Download, CheckCircle2 } from 'lucide-react';
import { Vente, Parametres } from '../shared/types';
import { formatUSD, formatCDF } from '../shared/money';

interface PrintTicketModalProps {
  vente: Vente | null;
  params: Parametres;
  onClose: () => void;
}

export const PrintTicketModal: React.FC<PrintTicketModalProps> = ({
  vente,
  params,
  onClose,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!vente) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(vente.date).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="no-print flex items-center justify-between px-5 py-3.5 bg-slate-800 border-b border-slate-700 text-white">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm">
              Vente validée : {vente.numero}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer (80mm / A4)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Ticket Preview Scrollable Area */}
        <div className="overflow-y-auto p-6 bg-slate-950 flex justify-center">
          <div
            ref={printAreaRef}
            className="w-[80mm] max-w-full bg-white text-black p-4 font-mono text-xs shadow-2xl rounded-sm leading-tight border border-slate-200"
          >
            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-gray-400">
              <div className="font-extrabold text-base tracking-wider uppercase">
                {params.entrepriseNom}
              </div>
              <div className="text-[10px] text-gray-700 mt-0.5">
                Quincaillerie de Pièces Automobiles
              </div>
              <div className="text-[10px] text-gray-600 mt-1">
                {params.adresse}
              </div>
              <div className="text-[10px] text-gray-600">
                Tél: {params.telephone}
              </div>
              {params.email && (
                <div className="text-[9px] text-gray-500">
                  {params.email}
                </div>
              )}
            </div>

            {/* Invoice Info */}
            <div className="py-2.5 border-b border-dashed border-gray-400 text-[10px] space-y-1">
              <div className="flex justify-between font-bold text-xs">
                <span>TICKET FACTURE:</span>
                <span>{vente.numero}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Date:</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Client:</span>
                <span className="font-semibold uppercase">{vente.clientNom}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Caissier:</span>
                <span>{vente.utilisateurNom}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Taux appliqué:</span>
                <span>1 USD = {vente.tauxUSD_CDF} CDF</span>
              </div>
            </div>

            {/* Articles Table */}
            <div className="py-2 border-b border-dashed border-gray-400">
              <div className="grid grid-cols-12 text-[9px] font-bold pb-1 text-gray-600 uppercase">
                <span className="col-span-6">Désignation</span>
                <span className="col-span-2 text-center">Qté</span>
                <span className="col-span-2 text-right">P.U</span>
                <span className="col-span-2 text-right">Total</span>
              </div>

              <div className="space-y-1.5 pt-1">
                {vente.lignes.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-12 text-[10px] items-start">
                    <div className="col-span-6 font-medium leading-none">
                      {l.designation}
                    </div>
                    <div className="col-span-2 text-center font-bold">
                      x{l.quantite}
                    </div>
                    <div className="col-span-2 text-right text-gray-700">
                      ${(l.prixUnitaireUSD / 100).toFixed(2)}
                    </div>
                    <div className="col-span-2 text-right font-bold">
                      ${(l.totalLigneUSD / 100).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals & Discounts */}
            <div className="py-2.5 border-b border-dashed border-gray-400 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span>Sous-total:</span>
                <span>{formatUSD(vente.sousTotalUSD)}</span>
              </div>

              {vente.remiseUSD > 0 && (
                <div className="flex justify-between text-[11px] text-red-600 font-semibold">
                  <span>Remise accordée:</span>
                  <span>- {formatUSD(vente.remiseUSD)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-extrabold pt-1 border-t border-gray-300">
                <span>TOTAL USD:</span>
                <span className="text-base">{formatUSD(vente.totalUSD)}</span>
              </div>

              <div className="flex justify-between text-xs font-bold text-gray-800">
                <span>TOTAL CDF:</span>
                <span>{formatCDF(vente.totalCDF)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2 border-b border-dashed border-gray-400 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>Mode de règlement:</span>
                <span className="font-bold">{vente.modePaiement}</span>
              </div>

              {vente.modePaiement !== 'CREDIT' ? (
                <>
                  <div className="flex justify-between">
                    <span>Montant Reçu:</span>
                    <span>
                      {vente.devise === 'USD'
                        ? `$ ${Number(vente.montantRecu).toFixed(2)}`
                        : `${Math.round(vente.montantRecu).toLocaleString('fr-FR')} FC`}
                    </span>
                  </div>
                  {vente.monnaieRendue > 0 && (
                    <div className="flex justify-between font-bold text-xs pt-0.5">
                      <span>Monnaie Rendue:</span>
                      <span className="text-emerald-700">
                        {vente.devise === 'USD'
                          ? `$ ${Number(vente.monnaieRendue).toFixed(2)}`
                          : `${Math.round(vente.monnaieRendue).toLocaleString('fr-FR')} FC`}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex justify-between font-bold text-xs text-red-600 pt-0.5">
                  <span>Reste à payer (Dette):</span>
                  <span>{formatUSD(vente.resteAPayerUSD)}</span>
                </div>
              )}
            </div>

            {/* Footer message */}
            <div className="pt-3 text-center text-[9px] text-gray-600 space-y-1">
              <p className="font-semibold">
                Merci de votre fidélité !
              </p>
              <p>
                Les marchandises vendues ne sont ni reprises ni échangées après sortie du magasin.
              </p>
              <div className="pt-1 text-[8px] text-gray-400">
                Logiciel Maison MP Motors • 100% Hors Ligne
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="no-print p-4 bg-slate-900 border-t border-slate-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Fermer
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/30 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer le ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
};
