/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Stock & Articles Catalog Management
 */

import React, { useState } from 'react';
import {
  Package,
  Search,
  Plus,
  SlidersHorizontal,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Edit,
  History,
  Tag,
  DollarSign,
  Barcode,
  Layers,
} from 'lucide-react';
import { Article, ArticleStatus, User } from '../shared/types';
import { storage } from '../services/storage';
import { stockService } from '../services/stockService';
import { hasPermission } from '../shared/permissions';
import {
  formatUSD,
  formatDixMilliemeUSD,
  computeSellingPriceCents,
  usdToCents,
  usdToDixMillieme,
  centsUSDToCDF,
} from '../shared/money';

interface ArticlesViewProps {
  currentUser: User;
}

export const ArticlesView: React.FC<ArticlesViewProps> = ({ currentUser }) => {
  const [params, setParams] = useState(storage.getParams());
  const [articles, setArticles] = useState<Article[]>(storage.getArticles());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [adjustModalArticle, setAdjustModalArticle] = useState<Article | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(0);
  const [adjustMotif, setAdjustMotif] = useState<string>('');
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const [priceModalArticle, setPriceModalArticle] = useState<Article | null>(null);
  const [newFixedPriceStr, setNewFixedPriceStr] = useState<string>('');

  const [newArticleModalOpen, setNewArticleModalOpen] = useState(false);
  const [newDesignation, setNewDesignation] = useState('');
  const [newCategorie, setNewCategorie] = useState('Freinage');
  const [newMarque, setNewMarque] = useState('Toyota');
  const [newStockInitial, setNewStockInitial] = useState('10');
  const [newCoutAchat, setNewCoutAchat] = useState('20.00');
  const [newPrixVente, setNewPrixVente] = useState('');
  const [newSeuil, setNewSeuil] = useState('5');
  const [newCodeBarre, setNewCodeBarre] = useState('');
  const [newObs, setNewObs] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const canSeeCost = hasPermission(currentUser.role, 'canViewPurchaseCosts');
  const canFixPrices = hasPermission(currentUser.role, 'canFixPrices');
  const canAdjustStock = hasPermission(currentUser.role, 'canPerformStockAdjustments');
  const canEdit = hasPermission(currentUser.role, 'canEditArticles');

  // Categories list
  const categories = Array.from(new Set(articles.map(a => a.categorie)));

  // Filtered articles
  const filtered = articles.filter(a => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      a.designation.toLowerCase().includes(term) ||
      a.code.toLowerCase().includes(term) ||
      (a.codeBarre && a.codeBarre.toLowerCase().includes(term)) ||
      a.marqueVehicule.toLowerCase().includes(term);

    const matchCategory = selectedCategory === 'ALL' || a.categorie === selectedCategory;

    const status = stockService.getArticleStatus(a, params.seuilAlerteDefaut);
    const matchStatus = statusFilter === 'ALL' || status === statusFilter;

    return matchSearch && matchCategory && matchStatus;
  });

  // Handle stock adjustment
  const handleConfirmAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalArticle) return;
    setAdjustError(null);

    const res = stockService.adjustStock(
      adjustModalArticle.id,
      adjustDelta,
      adjustMotif,
      currentUser
    );

    if (res.success) {
      setArticles(storage.getArticles());
      setAdjustModalArticle(null);
      setAdjustDelta(0);
      setAdjustMotif('');
    } else {
      setAdjustError(res.message || "Erreur lors de l'ajustement.");
    }
  };

  // Handle selling price fixing
  const handleConfirmPrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceModalArticle) return;

    const parsedPrice = parseFloat(newFixedPriceStr.replace(',', '.'));
    const newPriceCents = !isNaN(parsedPrice) && parsedPrice > 0 ? usdToCents(parsedPrice) : undefined;

    const updated = { ...priceModalArticle, prixVente: newPriceCents };
    storage.saveArticle(updated, currentUser);
    storage.logAction(
      currentUser,
      'PRIX_VENTE_MODIFIE',
      'ARTICLES',
      priceModalArticle.code,
      `Prix fixé à ${newPriceCents ? '$ ' + (newPriceCents / 100).toFixed(2) : 'Calcul dynamique (marge)'}`
    );

    setArticles(storage.getArticles());
    setPriceModalArticle(null);
    setNewFixedPriceStr('');
  };

  // Handle create article
  const handleCreateArticle = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!newDesignation.trim()) {
      setCreateError("La désignation est obligatoire.");
      return;
    }

    const code = stockService.getNextArticleCode();
    const stock = parseInt(newStockInitial, 10) || 0;
    const coutDec = parseFloat(newCoutAchat.replace(',', '.')) || 0;
    const prixDec = parseFloat(newPrixVente.replace(',', '.'));
    const seuil = parseInt(newSeuil, 10) || 5;

    const newArt: Article = {
      id: code,
      code,
      designation: newDesignation.trim(),
      categorie: newCategorie.trim() || 'Divers',
      marqueVehicule: newMarque.trim() || 'Universel',
      stockInitial: stock,
      stockActuel: stock,
      coutMoyen: usdToDixMillieme(coutDec),
      prixVente: !isNaN(prixDec) && prixDec > 0 ? usdToCents(prixDec) : undefined,
      seuilAlerte: seuil,
      codeBarre: newCodeBarre.trim() || undefined,
      observations: newObs.trim() || undefined,
      derniereMiseAJour: new Date().toISOString(),
    };

    storage.saveArticle(newArt, currentUser);
    setArticles(storage.getArticles());
    setNewArticleModalOpen(false);
    // Reset form
    setNewDesignation('');
    setNewObs('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top action & filter bar */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Catalogue Pièces & Gestion du Stock
            </h2>
            <p className="text-xs text-slate-400">
              {articles.length} références répertoriées • Coût moyen pondéré (PUMP)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => setNewArticleModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvel Article</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="px-4 py-3 bg-slate-900/60 border-b border-slate-800 flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Recherche par désignation, référence, code-barres..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Category filter */}
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="ALL">Toutes les catégories</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Status filter */}
        <div className="flex rounded-lg overflow-hidden border border-slate-700 bg-slate-800 p-0.5 text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
              statusFilter === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tous
          </button>
          <button
            onClick={() => setStatusFilter('OK')}
            className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
              statusFilter === 'OK' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            En stock
          </button>
          <button
            onClick={() => setStatusFilter('ALERTE')}
            className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
              statusFilter === 'ALERTE' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            Alerte
          </button>
          <button
            onClick={() => setStatusFilter('RUPTURE')}
            className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
              statusFilter === 'RUPTURE' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-red-400'
            }`}
          >
            Rupture
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-auto p-4">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider font-semibold">
              <th className="py-2.5 px-3">Code</th>
              <th className="py-2.5 px-3">Désignation</th>
              <th className="py-2.5 px-3">Marque / Catégorie</th>
              <th className="py-2.5 px-3 text-center">Stock</th>
              <th className="py-2.5 px-3 text-center">Statut</th>
              {canSeeCost && <th className="py-2.5 px-3 text-right">Coût PUMP (USD)</th>}
              <th className="py-2.5 px-3 text-right">Prix Vente</th>
              <th className="py-2.5 px-3 text-right">Équiv. CDF</th>
              <th className="py-2.5 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500">
                  Aucun article ne correspond à votre recherche.
                </td>
              </tr>
            ) : (
              filtered.map(art => {
                const status = stockService.getArticleStatus(art, params.seuilAlerteDefaut);
                const priceCents = computeSellingPriceCents(
                  art.coutMoyen,
                  art.prixVente,
                  params.margeDefautPourcent
                );
                const priceCDF = centsUSDToCDF(priceCents, params.tauxUSD_CDF);

                return (
                  <tr key={art.id} className="hover:bg-slate-850/60 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-400">
                      {art.code}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-white text-xs">{art.designation}</div>
                      {art.codeBarre && (
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <Barcode className="w-3 h-3" />
                          <span>{art.codeBarre}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      <div>{art.marqueVehicule}</div>
                      <div className="text-[10px] text-slate-500">{art.categorie}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-extrabold text-sm">
                      {art.stockActuel}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                          status === 'RUPTURE'
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : status === 'ALERTE'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}
                      >
                        {status === 'RUPTURE' ? 'RUPTURE' : status === 'ALERTE' ? 'ALERTE' : 'OK'}
                      </span>
                    </td>

                    {/* Cost PUMP (Hidden from Cashier) */}
                    {canSeeCost && (
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {formatDixMilliemeUSD(art.coutMoyen)}
                      </td>
                    )}

                    {/* Selling price */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                      ${(priceCents / 100).toFixed(2)}
                      {art.prixVente ? (
                        <span className="text-[9px] text-blue-400 block font-sans">Fixé</span>
                      ) : (
                        <span className="text-[9px] text-slate-500 block font-sans">
                          Marge +{params.margeDefautPourcent}%
                        </span>
                      )}
                    </td>

                    {/* Price CDF */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400 text-[11px]">
                      {priceCDF.toLocaleString('fr-FR')} FC
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {canFixPrices && (
                          <button
                            onClick={() => {
                              setPriceModalArticle(art);
                              setNewFixedPriceStr(art.prixVente ? (art.prixVente / 100).toFixed(2) : '');
                            }}
                            title="Modifier / Fixer le prix de vente"
                            className="p-1 rounded bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canAdjustStock && (
                          <button
                            onClick={() => {
                              setAdjustModalArticle(art);
                              setAdjustDelta(0);
                              setAdjustMotif('');
                              setAdjustError(null);
                            }}
                            title="Ajustement de stock manuel"
                            className="p-1 rounded bg-slate-800 hover:bg-amber-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: Stock Adjustment */}
      {adjustModalArticle && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmAdjustment}
            className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <span>Ajustement de Stock : {adjustModalArticle.code}</span>
              </h3>
              <button
                type="button"
                onClick={() => setAdjustModalArticle(null)}
                className="text-slate-400 hover:text-white text-base"
              >
                ×
              </button>
            </div>

            <div className="text-xs text-slate-300">
              <p className="font-semibold text-white">{adjustModalArticle.designation}</p>
              <p className="text-slate-400 mt-1">
                Stock actuel : <span className="font-bold text-white">{adjustModalArticle.stockActuel}</span>
              </p>
            </div>

            {adjustError && (
              <div className="p-2 bg-red-950/80 border border-red-700 rounded text-red-200 text-xs">
                {adjustError}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Variation (+ pour entrée, - pour sortie / casse)
              </label>
              <input
                type="number"
                value={adjustDelta}
                onChange={e => setAdjustDelta(parseInt(e.target.value, 10) || 0)}
                placeholder="Ex: -2 ou +5"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-amber-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Nouveau stock après ajustement :{' '}
                <span className="font-bold text-amber-400">
                  {adjustModalArticle.stockActuel + adjustDelta}
                </span>
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Motif obligatoire de l'ajustement
              </label>
              <input
                type="text"
                value={adjustMotif}
                onChange={e => setAdjustMotif(e.target.value)}
                placeholder="Ex: Inventaire physique, casse en rayon, échantillon..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAdjustModalArticle(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Valider l'ajustement
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Fix Selling Price */}
      {priceModalArticle && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmPrice}
            className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-400" />
                <span>Fixer le Prix de Vente</span>
              </h3>
              <button
                type="button"
                onClick={() => setPriceModalArticle(null)}
                className="text-slate-400 hover:text-white text-base"
              >
                ×
              </button>
            </div>

            <div className="text-xs text-slate-300">
              <p className="font-semibold text-white">{priceModalArticle.designation}</p>
              <p className="text-slate-400 mt-1">
                Coût d'achat moyen (PUMP) :{' '}
                <span className="font-mono text-emerald-400">
                  {formatDixMilliemeUSD(priceModalArticle.coutMoyen)}
                </span>
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Prix de vente fixé (USD)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newFixedPriceStr}
                onChange={e => setNewFixedPriceStr(e.target.value)}
                placeholder="Laisser vide pour appliquer la marge par défaut (+25%)"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-mono text-white focus:outline-none focus:border-blue-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Note : Si le champ est vide, le prix sera calculé automatiquement : PUMP × (1 + {params.margeDefautPourcent}%).
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPriceModalArticle(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Enregistrer le prix
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: New Article */}
      {newArticleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateArticle}
            className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-3"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>Créer une nouvelle pièce / article</span>
              </h3>
              <button
                type="button"
                onClick={() => setNewArticleModalOpen(false)}
                className="text-slate-400 hover:text-white text-base"
              >
                ×
              </button>
            </div>

            {createError && (
              <div className="p-2 bg-red-950/80 border border-red-700 rounded text-red-200 text-xs">
                {createError}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Désignation de la pièce *
              </label>
              <input
                type="text"
                required
                value={newDesignation}
                onChange={e => setNewDesignation(e.target.value)}
                placeholder="Ex: Plaquettes de frein AV Toyota Prado..."
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Catégorie
                </label>
                <input
                  type="text"
                  value={newCategorie}
                  onChange={e => setNewCategorie(e.target.value)}
                  placeholder="Freinage, Filtration, etc."
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Marque / Véhicule
                </label>
                <input
                  type="text"
                  value={newMarque}
                  onChange={e => setNewMarque(e.target.value)}
                  placeholder="Toyota Hilux, Land Cruiser, etc."
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Stock Initial
                </label>
                <input
                  type="number"
                  min="0"
                  value={newStockInitial}
                  onChange={e => setNewStockInitial(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Coût Achat ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newCoutAchat}
                  onChange={e => setNewCoutAchat(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Prix Vente ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newPrixVente}
                  onChange={e => setNewPrixVente(e.target.value)}
                  placeholder="Auto (marge)"
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Seuil d'alerte stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={newSeuil}
                  onChange={e => setNewSeuil(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Code-barres / Réf OEM
                </label>
                <input
                  type="text"
                  value={newCodeBarre}
                  onChange={e => setNewCodeBarre(e.target.value)}
                  placeholder="Ex: 04465-0K090"
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Observations
              </label>
              <input
                type="text"
                value={newObs}
                onChange={e => setNewObs(e.target.value)}
                placeholder="Origine, emplacement magasin, etc."
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setNewArticleModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Créer l'article
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
