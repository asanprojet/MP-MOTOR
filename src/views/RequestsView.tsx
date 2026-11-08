/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Modification & Cancellation Requests Approval Workflow
 */

import React, { useState } from 'react';
import {
  FileCheck2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  MessageSquare,
} from 'lucide-react';
import { DemandeModification, User as AppUser } from '../shared/types';
import { storage } from '../services/storage';
import { salesService } from '../services/salesService';
import { hasPermission } from '../shared/permissions';

interface RequestsViewProps {
  currentUser: AppUser;
}

export const RequestsView: React.FC<RequestsViewProps> = ({ currentUser }) => {
  const [demandes, setDemandes] = useState<DemandeModification[]>(storage.getDemandes());
  const [responseComment, setResponseComment] = useState('');
  const [selectedDemande, setSelectedDemande] = useState<DemandeModification | null>(null);
  const [actionType, setActionType] = useState<'APPROUVER' | 'REFUSER'>('APPROUVER');
  const [feedback, setFeedback] = useState<string | null>(null);

  const canApprove = hasPermission(currentUser.role, 'canApproveRequests');

  const pendingDemandes = demandes.filter(d => d.statut === 'EN_ATTENTE');
  const resolvedDemandes = demandes.filter(d => d.statut !== 'EN_ATTENTE');

  const handleProcessRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDemande) return;

    if (actionType === 'APPROUVER') {
      // Execute the underlying action
      if (selectedDemande.type === 'ANNULATION_FACTURE') {
        const cancelRes = salesService.cancelSaleDirect(
          selectedDemande.referenceDoc,
          `Approbation demande par ${currentUser.nom}: ${responseComment || selectedDemande.motif}`,
          currentUser
        );
        if (!cancelRes.success) {
          setFeedback(cancelRes.message || "Erreur lors de l'annulation de la facture.");
          return;
        }
      }

      selectedDemande.statut = 'APPROUVEE';
      selectedDemande.reponseDate = new Date().toISOString();
      selectedDemande.validateurId = currentUser.id;
      selectedDemande.validateurNom = currentUser.nom;
      selectedDemande.commentaireReponse = responseComment.trim() || undefined;

      storage.saveDemande(selectedDemande);
      storage.logAction(
        currentUser,
        'DEMANDE_APPROUVEE',
        'DEMANDES',
        selectedDemande.referenceDoc,
        `Demande d'annulation pour ${selectedDemande.referenceDoc} APPROUVÉE par ${currentUser.nom}`
      );
      setFeedback(`Demande sur ${selectedDemande.referenceDoc} approuvée avec succès.`);
    } else {
      // Rejection
      selectedDemande.statut = 'REFUSEE';
      selectedDemande.reponseDate = new Date().toISOString();
      selectedDemande.validateurId = currentUser.id;
      selectedDemande.validateurNom = currentUser.nom;
      selectedDemande.commentaireReponse = responseComment.trim() || "Demande refusée par la direction.";

      storage.saveDemande(selectedDemande);
      storage.logAction(
        currentUser,
        'DEMANDE_REFUSEE',
        'DEMANDES',
        selectedDemande.referenceDoc,
        `Demande d'annulation pour ${selectedDemande.referenceDoc} REFUSÉE par ${currentUser.nom}. Motif: ${responseComment}`
      );
      setFeedback(`Demande sur ${selectedDemande.referenceDoc} refusée.`);
    }

    setDemandes(storage.getDemandes());
    setSelectedDemande(null);
    setResponseComment('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-600/20 text-orange-400 border border-orange-500/30">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Workflow d'Approbation des Demandes (Caisse & Achats)
            </h2>
            <p className="text-xs text-slate-400">
              Contrôle interne : les caissiers soumettent leurs requêtes, seul l'Admin valide les annulations
            </p>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-blue-950/80 border border-blue-700 text-blue-200 text-xs flex justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="font-bold">×</button>
        </div>
      )}

      {/* Main Split: Pending on Left, Resolved on Right */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 gap-4">
        {/* LEFT: Pending Requests */}
        <div className="w-full lg:w-7/12 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-3 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
            <div className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-400" />
              <span>Demandes En Attente d'Approbation ({pendingDemandes.length})</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {pendingDemandes.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                Aucune demande en attente. Tout est à jour !
              </div>
            ) : (
              pendingDemandes.map(d => (
                <div
                  key={d.id}
                  className="p-4 rounded-xl bg-slate-800/90 border border-orange-500/30 text-xs space-y-2 shadow-md"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono font-bold text-sm text-blue-400">
                        {d.referenceDoc}
                      </span>
                      <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-950 text-orange-400 border border-orange-800">
                        EN ATTENTE
                      </span>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Demandé par : <span className="text-white font-semibold">{d.demandeurNom}</span> • {new Date(d.date).toLocaleString('fr-FR')}
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Motif invoqué par le caissier :
                    </span>
                    <p className="mt-0.5 font-medium">{d.motif}</p>
                  </div>

                  {canApprove ? (
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => {
                          setSelectedDemande(d);
                          setActionType('REFUSER');
                          setResponseComment('');
                        }}
                        className="px-3 py-1.5 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Refuser
                      </button>
                      <button
                        onClick={() => {
                          setSelectedDemande(d);
                          setActionType('APPROUVER');
                          setResponseComment('');
                        }}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer"
                      >
                        Approuver l'annulation
                      </button>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500 italic">
                      Attente de validation par un Gérant ou Superadmin.
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Resolved Requests */}
        <div className="w-full lg:w-5/12 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-3 bg-slate-850 border-b border-slate-800 font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Historique des Décisions ({resolvedDemandes.length})</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {resolvedDemandes.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Aucune demande traitée pour le moment.
              </div>
            ) : (
              resolvedDemandes.map(d => (
                <div
                  key={d.id}
                  className="p-3 rounded-xl bg-slate-800/80 border border-slate-750 text-xs space-y-1.5"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-blue-400">{d.referenceDoc}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        d.statut === 'APPROUVEE'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-red-950 text-red-400 border border-red-800'
                      }`}
                    >
                      {d.statut}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300">
                    <span className="text-slate-500">Motif :</span> {d.motif}
                  </p>

                  <div className="pt-1 border-t border-slate-700/60 text-[10px] text-slate-400">
                    Décision par <span className="text-white">{d.validateurNom}</span> •{' '}
                    {d.reponseDate ? new Date(d.reponseDate).toLocaleDateString('fr-FR') : ''}
                    {d.commentaireReponse && (
                      <p className="italic text-slate-300 mt-0.5">« {d.commentaireReponse} »</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Confirmation for Approve / Reject */}
      {selectedDemande && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form
            onSubmit={handleProcessRequest}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white">
                {actionType === 'APPROUVER'
                  ? `Approuver la demande : ${selectedDemande.referenceDoc}`
                  : `Refuser la demande : ${selectedDemande.referenceDoc}`}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedDemande(null)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-300">
              {actionType === 'APPROUVER'
                ? "L'approbation annulera immédiatement la facture, restituera les articles en rayon et ajustera les crédits."
                : "Le refus maintiendra la facture telle quelle sans modification."}
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Commentaire de décision
              </label>
              <input
                type="text"
                value={responseComment}
                onChange={e => setResponseComment(e.target.value)}
                placeholder="Ex: Validé après vérification du stock physique..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedDemande(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className={`px-4 py-1.5 rounded-lg text-white text-xs font-bold shadow-md cursor-pointer ${
                  actionType === 'APPROUVER'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {actionType === 'APPROUVER' ? "Confirmer l'approbation" : "Confirmer le refus"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
