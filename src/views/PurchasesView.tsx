/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Purchases & Weighted Average Cost (PUMP) View
 */

import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  Truck,
  FileText,
  DollarSign,
  Calculator,
  History,
  RotateCcw,
} from 'lucide-react';
import { Article, Achat, Fournisseur, User } from '../shared/types';
import { storage } from '../services/storage';
import { purchaseService, PurchaseCartItem } from '../services/purchaseService';
import { calculateNewPUMP, formatUSD, formatDixMilliemeUSD, usdToCents, centsToUSDString } from '../shared/money';
import { hasPermission } from '../shared/permissions';

interface PurchasesViewProps {
  currentUser: User;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({ currentUser }) => {
  const [params, setParams] = useState(storage.getParams());
  const [articles, setArticles] = useState<Article[]>(storage.getArticles());
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>(storage.getFournisseurs());
  const [achats, setAchats] = useState<Achat[]>(storage.getAchats());

  // Purchase Basket input
  const [supplierName, setSupplierName] = useState('CFAO MOBILITY RDC');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [cart, setCart] = useState<PurchaseCartItem[]>([]);

  // Item form states
  const [selectedArticleId, setSelectedArticleId] = useState<string>(articles[0]?.id || '');
  const [itemQty, setItemQty] = useState<string>('5');
  const [itemPurchasePrice, setItemPurchasePrice] = useState<string>('20.00');
  const [itemSellingPrice, setItemSellingPrice] = useState<string>('');

  // Editing cart item state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Status & Detail modal
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [detailAchat, setDetailAchat] = useState<Achat | null>(null);
  const [cancelModalAchat, setCancelModalAchat] = useState<Achat | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const selectedArticle = articles.find(a => a.id === selectedArticleId);

  // Calculate live preview of new PUMP for the selected item
  const parsedQty = parseInt(itemQty, 10) || 0;
  const parsedPurchasePrice = parseFloat(itemPurchasePrice.replace(',', '.')) || 0;
  const purchasePriceCents = usdToCents(parsedPurchasePrice);

  const previewNewPUMP = selectedArticle && parsedQty > 0 && purchasePriceCents > 0
    ? calculateNewPUMP(
        selectedArticle.stockActuel,
        selectedArticle.coutMoyen,
        parsedQty,
        purchasePriceCents
      )
    : selectedArticle?.coutMoyen || 0;

  // Add / Update item in cart
  const handleAddOrUpdateItem = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!selectedArticle) {
      setMessage({ type: 'error', text: "Veuillez sélectionner un article." });
      return;
    }
    if (parsedQty <= 0) {
      setMessage({ type: 'error', text: "La quantité achetée doit être supérieure à 0." });
      return;
    }
    if (purchasePriceCents <= 0) {
      setMessage({ type: 'error', text: "Le prix d'achat doit être supérieur à 0." });
      return;
    }

    const parsedSelling = parseFloat(itemSellingPrice.replace(',', '.'));
    const fixedSellingPriceCents = !isNaN(parsedSelling) && parsedSelling > 0 ? usdToCents(parsedSelling) : undefined;

    const newItem: PurchaseCartItem = {
      articleId: selectedArticle.id,
      articleCode: selectedArticle.code,
      designation: selectedArticle.designation,
      quantite: parsedQty,
      prixAchatUSD: purchasePriceCents,
      prixVenteFixeUSD: fixedSellingPriceCents,
    };

    if (editingIndex !== null) {
      // Update existing item
      const updated = [...cart];
      updated[editingIndex] = newItem;
      setCart(purchaseService.mergeCartItems(updated));
      setEditingIndex(null);
    } else {
      // Add and merge if duplicate
      setCart(purchaseService.mergeCartItems([...cart, newItem]));
    }

    // Reset item fields
    setItemQty('1');
    setItemSellingPrice('');
  };

  const handleEditCartItem = (index: number) => {
    const item = cart[index];
    setSelectedArticleId(item.articleId);
    setItemQty(item.quantite.toString());
    setItemPurchasePrice((item.prixAchatUSD / 100).toFixed(2));
    setItemSellingPrice(item.prixVenteFixeUSD ? (item.prixVenteFixeUSD / 100).toFixed(2) : '');
    setEditingIndex(index);
  };

  const handleRemoveCartItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  // Total cart amount
  const totalCartCentsUSD = cart.reduce(
    (sum, item) => sum + item.quantite * item.prixAchatUSD,
    0
  );

  // Validate entire purchase
  const handleValidatePurchase = () => {
    setMessage(null);
    const res = purchaseService.createPurchase(
      supplierName,
      cart,
      currentUser,
      invoiceRef
    );

    if (res.success && res.achat) {
      setMessage({
        type: 'success',
        text: `Bon d'achat ${res.achat.numero} enregistré avec succès ! Coûts moyens pondérés (PUMP) et stocks mis à jour.`,
      });
      // Refresh state
      setArticles(storage.getArticles());
      setFournisseurs(storage.getFournisseurs());
      setAchats(storage.getAchats());
      setCart([]);
      setInvoiceRef('');
    } else {
      setMessage({ type: 'error', text: res.message || "Erreur lors de l'enregistrement de l'achat." });
    }
  };

  // Cancel purchase
  const handleConfirmCancelPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalAchat) return;

    const res = purchaseService.cancelPurchase(
      cancelModalAchat.numero,
      cancelReason,
      currentUser
    );

    if (res.success) {
      setAchats(storage.getAchats());
      setArticles(storage.getArticles());
      setCancelModalAchat(null);
      setCancelReason('');
      setMessage({ type: 'success', text: `Bon d'achat annulé et stocks déduits avec succès.` });
    } else {
      setMessage({ type: 'error', text: res.message || "Erreur lors de l'annulation." });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Banner */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Approvisionnements & Calcul du Coût Moyen Pondéré (PUMP)
            </h2>
            <p className="text-xs text-slate-400">
              Formule officielle : (Stock avant × Coût avant + Qté × Prix Achat) ÷ (Stock avant + Qté)
            </p>
          </div>
        </div>
      </div>

      {/* Message feedback */}
      {message && (
        <div
          className={`mx-4 mt-3 p-3 rounded-xl border text-xs flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
              : 'bg-red-950/80 border-red-700 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs font-bold hover:underline">
            ×
          </button>
        </div>
      )}

      {/* Main Content: Split into New Purchase Panier & Recent Purchases */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 gap-4">
        {/* LEFT: Saisie du bon d'achat & Panier */}
        <div className="w-full lg:w-7/12 flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-3 bg-slate-850 border-b border-slate-800 font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-400" />
            <span>Nouveau Bon d'Achat (Entrée de Stock)</span>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            {/* Supplier & Invoice info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Fournisseur (Saisie ou suggestion) *
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={e => setSupplierName(e.target.value)}
                  placeholder="Ex: CFAO, DUBAI AUTO..."
                  list="suppliers-list"
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-blue-500"
                />
                <datalist id="suppliers-list">
                  {fournisseurs.map(f => (
                    <option key={f.id} value={f.nom} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Réf. Facture / BL Fournisseur
                </label>
                <input
                  type="text"
                  value={invoiceRef}
                  onChange={e => setInvoiceRef(e.target.value)}
                  placeholder="Ex: INV-2025-0891"
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Line Item Entry Form */}
            <form onSubmit={handleAddOrUpdateItem} className="p-3 rounded-xl bg-slate-850 border border-slate-750 space-y-3">
              <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wide flex items-center justify-between">
                <span>{editingIndex !== null ? 'Modifier la ligne' : 'Ajouter un article au panier'}</span>
                {editingIndex !== null && (
                  <button
                    type="button"
                    onClick={() => setEditingIndex(null)}
                    className="text-slate-400 hover:text-white text-[10px]"
                  >
                    Annuler modification
                  </button>
                )}
              </div>

              {/* Article selector */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Article</label>
                <select
                  value={selectedArticleId}
                  onChange={e => {
                    setSelectedArticleId(e.target.value);
                    const art = articles.find(a => a.id === e.target.value);
                    if (art) {
                      setItemPurchasePrice((art.coutMoyen / 10000).toFixed(2));
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-blue-500"
                >
                  {articles.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.designation} (Stock: {a.stockActuel})
                    </option>
                  ))}
                </select>
              </div>

              {/* Live stock & current cost info */}
              {selectedArticle && (
                <div className="grid grid-cols-3 gap-2 text-[11px] p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-500 block">Stock actuel :</span>
                    <span className="font-bold text-white font-mono">{selectedArticle.stockActuel} pièces</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Coût PUMP actuel :</span>
                    <span className="font-bold text-amber-400 font-mono">
                      {formatDixMilliemeUSD(selectedArticle.coutMoyen)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Nouveau PUMP prévu :</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      {formatDixMilliemeUSD(previewNewPUMP)}
                    </span>
                  </div>
                </div>
              )}

              {/* Qty, Purchase Price, Fixed Selling Price */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Quantité *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={itemQty}
                    onChange={e => setItemQty(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Prix Achat ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={itemPurchasePrice}
                    onChange={e => setItemPurchasePrice(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Prix Vente Fixé ($) <span className="text-slate-500 font-normal">(Optionnel)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemSellingPrice}
                    onChange={e => setItemSellingPrice(e.target.value)}
                    placeholder="Laisser vide (marge)"
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{editingIndex !== null ? 'Mettre à jour la ligne' : 'Ajouter à la liste'}</span>
                </button>
              </div>
            </form>

            {/* Cart Items List */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                Lignes d'achat ({cart.length})
              </div>

              {cart.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                  Aucun article dans ce bon d'achat pour le moment.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {cart.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/80 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white truncate">{item.designation}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                          <span>{item.quantite} pcs</span>
                          <span>•</span>
                          <span>P.A: ${(item.prixAchatUSD / 100).toFixed(2)}</span>
                          {item.prixVenteFixeUSD && (
                            <>
                              <span>•</span>
                              <span className="text-blue-300">P.V: ${(item.prixVenteFixeUSD / 100).toFixed(2)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right font-mono font-bold text-white text-xs mr-2">
                        ${((item.quantite * item.prixAchatUSD) / 100).toFixed(2)}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditCartItem(idx)}
                          className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveCartItem(idx)}
                          className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart Bottom Summary & Validation */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold">Total Achats :</span>
              <div className="text-xl font-extrabold text-emerald-400 font-mono">
                {formatUSD(totalCartCentsUSD)}
              </div>
            </div>

            <button
              onClick={handleValidatePurchase}
              disabled={cart.length === 0}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Valider et Enregistrer l'Achat</span>
            </button>
          </div>
        </div>

        {/* RIGHT: Historique des Bons d'Achat */}
        <div className="w-full lg:w-5/12 flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-3 bg-slate-850 border-b border-slate-800 font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <span>Historique des Achats Enregistrés ({achats.length})</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {achats.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Aucun bon d'achat pour le moment.
              </div>
            ) : (
              achats.map(a => (
                <div
                  key={a.id}
                  className={`p-3 rounded-xl border transition-all ${
                    a.statut === 'ANNULE'
                      ? 'bg-slate-950/60 border-red-900/40 opacity-70'
                      : 'bg-slate-800/80 border-slate-750 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-blue-400">
                          {a.numero}
                        </span>
                        {a.statut === 'ANNULE' ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-950 text-red-400 border border-red-800">
                            ANNULÉ
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                            VALIDÉ
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-white mt-1">
                        {a.fournisseurNom}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(a.date).toLocaleString('fr-FR')} • {a.lignes.length} articles
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-sm text-emerald-400">
                        {formatUSD(a.totalUSD)}
                      </div>
                      <div className="flex items-center gap-1 mt-2 justify-end">
                        <button
                          onClick={() => setDetailAchat(a)}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px] font-semibold"
                        >
                          Détails
                        </button>
                        {a.statut !== 'ANNULE' && hasPermission(currentUser.role, 'canCancelPurchasesDirectly') && (
                          <button
                            onClick={() => {
                              setCancelModalAchat(a);
                              setCancelReason('');
                            }}
                            className="px-2 py-1 bg-red-950 hover:bg-red-800 text-red-300 rounded text-[10px] font-semibold border border-red-800"
                          >
                            Annuler
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Detail Achat */}
      {detailAchat && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white font-mono">
                Détail du Bon d'Achat : {detailAchat.numero}
              </h3>
              <button onClick={() => setDetailAchat(null)} className="text-slate-400 hover:text-white">
                ×
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              <p>Fournisseur : <span className="font-bold text-white">{detailAchat.fournisseurNom}</span></p>
              <p>Date : {new Date(detailAchat.date).toLocaleString('fr-FR')}</p>
              {detailAchat.referenceFactureFournisseur && (
                <p>Réf. BL/Facture : {detailAchat.referenceFactureFournisseur}</p>
              )}
            </div>

            <div className="border border-slate-800 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-800 text-slate-400 text-[10px] uppercase">
                  <tr>
                    <th className="p-2">Désignation</th>
                    <th className="p-2 text-center">Qté</th>
                    <th className="p-2 text-right">P.A (USD)</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {detailAchat.lignes.map((l, i) => (
                    <tr key={i} className="hover:bg-slate-850">
                      <td className="p-2 text-white font-medium">{l.designation}</td>
                      <td className="p-2 text-center font-mono font-bold">{l.quantite}</td>
                      <td className="p-2 text-right font-mono">${(l.prixAchatUSD / 100).toFixed(2)}</td>
                      <td className="p-2 text-right font-mono font-bold">${(l.totalLigneUSD / 100).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase">Total Bon d'Achat :</span>
              <span className="text-base font-extrabold text-emerald-400 font-mono">
                {formatUSD(detailAchat.totalUSD)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Cancel Achat */}
      {cancelModalAchat && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmCancelPurchase}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>Annuler le Bon d'Achat {cancelModalAchat.numero}</span>
              </h3>
              <button
                type="button"
                onClick={() => setCancelModalAchat(null)}
                className="text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Attention : L'annulation va déduire immédiatement les quantités entrées du stock. Si certains articles ont déjà été vendus et que le stock est insuffisant, l'annulation sera refusée.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Motif obligatoire d'annulation
              </label>
              <input
                type="text"
                required
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Ex: Erreur de saisie fournisseur, marchandise refusée..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCancelModalAchat(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Retour
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Confirmer l'annulation
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
