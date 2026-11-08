/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Counter POS (Caisse Rapide au Comptoir)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Barcode,
  Trash2,
  Plus,
  Minus,
  Check,
  AlertCircle,
  CreditCard,
  Banknote,
  Smartphone,
  ArrowRight,
  User,
  RotateCcw,
  Tag,
  DollarSign,
  Printer,
} from 'lucide-react';
import {
  Article,
  Client,
  Currency,
  PaymentMethod,
  User as AppUser,
  Vente,
} from '../shared/types';
import { storage } from '../services/storage';
import { stockService } from '../services/stockService';
import { salesService, SaleCartItem } from '../services/salesService';
import {
  formatUSD,
  formatCDF,
  centsUSDToCDF,
  computeSellingPriceCents,
  centsToUSDString,
} from '../shared/money';
import { PrintTicketModal } from '../components/PrintTicketModal';

interface PosViewProps {
  currentUser: AppUser;
}

export const PosView: React.FC<PosViewProps> = ({ currentUser }) => {
  const [params, setParams] = useState(storage.getParams());
  const [articles, setArticles] = useState<Article[]>(storage.getArticles());
  const [clients, setClients] = useState<Client[]>(storage.getClients());

  // Search & Cart states
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedClientName, setSelectedClientName] = useState('CLIENT COMPTOIR');
  const [cart, setCart] = useState<SaleCartItem[]>([]);

  // Payment controls
  const [devise, setDevise] = useState<Currency>('USD');
  const [modePaiement, setModePaiement] = useState<PaymentMethod>('ESPECES');
  const [remiseValue, setRemiseValue] = useState<string>('0');
  const [remiseDevise, setRemiseDevise] = useState<Currency>('USD');
  const [montantRecuStr, setMontantRecuStr] = useState<string>('');
  
  // Feedback & Print
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successVente, setSuccessVente] = useState<Vente | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus barcode input on mount for rapid keyboard/scanner workflow
    barcodeInputRef.current?.focus();
  }, []);

  // Filtered catalog
  const filteredArticles = articles.filter(a => {
    const term = searchTerm.toLowerCase();
    return (
      a.designation.toLowerCase().includes(term) ||
      a.code.toLowerCase().includes(term) ||
      (a.codeBarre && a.codeBarre.toLowerCase().includes(term)) ||
      a.categorie.toLowerCase().includes(term) ||
      a.marqueVehicule.toLowerCase().includes(term)
    );
  });

  // Add article to cart
  const addToCart = (art: Article) => {
    setErrorMessage(null);
    if (art.stockActuel <= 0) {
      setErrorMessage(`Impossible : ${art.designation} est en RUPTURE de stock.`);
      return;
    }

    const existingIndex = cart.findIndex(c => c.articleId === art.id);
    const effectivePriceCents = computeSellingPriceCents(
      art.coutMoyen,
      art.prixVente,
      params.margeDefautPourcent
    );

    if (existingIndex >= 0) {
      const currentQty = cart[existingIndex].quantite;
      if (currentQty + 1 > art.stockActuel) {
        setErrorMessage(`Stock insuffisant : vous avez déjà ${currentQty} au panier (stock max : ${art.stockActuel}).`);
        return;
      }
      const updated = [...cart];
      updated[existingIndex].quantite += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          articleId: art.id,
          articleCode: art.code,
          designation: art.designation,
          quantite: 1,
          prixUnitaireUSD: effectivePriceCents,
          coutUnitaireUSD: art.coutMoyen,
        },
      ]);
    }
  };

  // Adjust cart item quantity
  const updateQuantity = (articleId: string, delta: number) => {
    setErrorMessage(null);
    const art = articles.find(a => a.id === articleId);
    if (!art) return;

    setCart(prev =>
      prev
        .map(item => {
          if (item.articleId === articleId) {
            const nextQty = item.quantite + delta;
            if (nextQty <= 0) return null;
            if (nextQty > art.stockActuel) {
              setErrorMessage(`Stock maximum disponible atteint (${art.stockActuel}) pour cet article.`);
              return item;
            }
            return { ...item, quantite: nextQty };
          }
          return item;
        })
        .filter(Boolean) as SaleCartItem[]
    );
  };

  const removeFromCart = (articleId: string) => {
    setCart(prev => prev.filter(c => c.articleId !== articleId));
  };

  const clearCart = () => {
    setCart([]);
    setRemiseValue('0');
    setMontantRecuStr('');
    setErrorMessage(null);
  };

  // Handle barcode reader entry
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = barcodeInput.trim();
    if (!query) return;

    // Look for exact codeBarre or code
    const found = articles.find(
      a =>
        (a.codeBarre && a.codeBarre.toLowerCase() === query.toLowerCase()) ||
        a.code.toLowerCase() === query.toLowerCase()
    );

    if (found) {
      addToCart(found);
      setBarcodeInput('');
    } else {
      setErrorMessage(`Aucun article trouvé pour le code barre ou code : « ${query} »`);
    }
  };

  // Computations
  const sousTotalCentsUSD = cart.reduce(
    (sum, item) => sum + item.quantite * item.prixUnitaireUSD,
    0
  );

  const parsedRemise = parseFloat(remiseValue.replace(',', '.')) || 0;
  const remiseCentsUSD =
    remiseDevise === 'USD'
      ? Math.round(parsedRemise * 100)
      : Math.round((parsedRemise * 100) / params.tauxUSD_CDF);

  const totalCentsUSD = Math.max(0, sousTotalCentsUSD - remiseCentsUSD);
  const totalCDF = centsUSDToCDF(totalCentsUSD, params.tauxUSD_CDF);

  // Received amount parsing
  const montantRecu = parseFloat(montantRecuStr.replace(',', '.')) || 0;
  let monnaieRendue = 0;
  let resteAPayerUSD = 0;

  if (modePaiement === 'CREDIT') {
    let recuUSD = devise === 'USD' ? Math.round(montantRecu * 100) : Math.round((montantRecu * 100) / params.tauxUSD_CDF);
    resteAPayerUSD = Math.max(0, totalCentsUSD - recuUSD);
    monnaieRendue = 0;
  } else {
    if (devise === 'USD') {
      const recuCents = Math.round(montantRecu * 100);
      if (recuCents >= totalCentsUSD) {
        monnaieRendue = (recuCents - totalCentsUSD) / 100;
        resteAPayerUSD = 0;
      } else {
        resteAPayerUSD = totalCentsUSD - recuCents;
      }
    } else {
      const recuCDF = Math.round(montantRecu);
      if (recuCDF >= totalCDF) {
        monnaieRendue = recuCDF - totalCDF;
        resteAPayerUSD = 0;
      } else {
        const diff = totalCDF - recuCDF;
        resteAPayerUSD = Math.round((diff * 100) / params.tauxUSD_CDF);
      }
    }
  }

  // Pre-fill exact amount button
  const handleExactAmount = () => {
    if (devise === 'USD') {
      setMontantRecuStr((totalCentsUSD / 100).toFixed(2));
    } else {
      setMontantRecuStr(totalCDF.toString());
    }
  };

  // Submit sale
  const handleValidateSale = () => {
    setErrorMessage(null);

    if (cart.length === 0) {
      setErrorMessage("Le panier est vide. Veuillez sélectionner des articles.");
      return;
    }

    if (!selectedClientName.trim()) {
      setErrorMessage("Veuillez saisir ou choisir un client.");
      return;
    }

    const effectiveReceived =
      montantRecuStr.trim() === ''
        ? modePaiement === 'CREDIT'
          ? 0
          : devise === 'USD'
          ? totalCentsUSD / 100
          : totalCDF
        : montantRecu;

    const result = salesService.createSale({
      clientName: selectedClientName,
      cart,
      modePaiement,
      devise,
      remiseValue: parsedRemise,
      remiseDevise,
      montantRecu: effectiveReceived,
      actor: currentUser,
    });

    if (result.success && result.vente) {
      setSuccessVente(result.vente);
      // Refresh inventory
      setArticles(storage.getArticles());
      setClients(storage.getClients());
      setCart([]);
      setRemiseValue('0');
      setMontantRecuStr('');
      setSelectedClientName('CLIENT COMPTOIR');
    } else {
      setErrorMessage(result.message || "Erreur lors de la validation de la vente.");
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-slate-950 text-slate-100">
      {/* LEFT PANEL: Product catalog & Fast search */}
      <div className="w-full lg:w-7/12 flex flex-col border-r border-slate-800 bg-slate-900/50">
        {/* Search header & Barcode input */}
        <div className="p-3 bg-slate-900 border-b border-slate-800 space-y-2">
          <div className="flex gap-2">
            {/* Barcode scanner reader */}
            <form onSubmit={handleBarcodeSubmit} className="relative flex-1">
              <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scanner code-barres ou taper référence [Entrée]..."
                value={barcodeInput}
                onChange={e => setBarcodeInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </form>

            {/* Quick text search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher désignation, marque, filtre..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Error banner if any */}
        {errorMessage && (
          <div className="mx-3 mt-2 p-2.5 rounded-lg bg-red-950/80 border border-red-700 text-red-200 text-xs flex items-center justify-between animate-shake">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-white text-xs font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* Articles Table / Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {filteredArticles.map(art => {
              const status = stockService.getArticleStatus(art, params.seuilAlerteDefaut);
              const priceCents = computeSellingPriceCents(
                art.coutMoyen,
                art.prixVente,
                params.margeDefautPourcent
              );
              const priceUSD = (priceCents / 100).toFixed(2);
              const priceCDF = centsUSDToCDF(priceCents, params.tauxUSD_CDF);
              const isRupture = status === 'RUPTURE';

              return (
                <button
                  key={art.id}
                  onClick={() => addToCart(art)}
                  disabled={isRupture}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isRupture
                      ? 'bg-slate-900/40 border-slate-800 opacity-60 cursor-not-allowed'
                      : 'bg-slate-800/90 hover:bg-slate-750 border-slate-700 hover:border-blue-500/60 shadow-sm hover:shadow-blue-900/20 active:scale-[0.98]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                        {art.code}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          status === 'RUPTURE'
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : status === 'ALERTE'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}
                      >
                        {status === 'RUPTURE'
                          ? 'RUPTURE (0)'
                          : status === 'ALERTE'
                          ? `ALERTE (${art.stockActuel})`
                          : `STOCK: ${art.stockActuel}`}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white line-clamp-2 leading-tight">
                      {art.designation}
                    </h4>

                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                      <span>{art.marqueVehicule}</span>
                      <span className="text-slate-600">•</span>
                      <span>{art.categorie}</span>
                    </div>
                  </div>

                  {/* Price display */}
                  <div className="mt-3 pt-2 border-t border-slate-700/60 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-extrabold text-blue-400 font-mono">
                        $ {priceUSD}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {priceCDF.toLocaleString('fr-FR')} FC
                      </div>
                    </div>
                    <div className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shadow-md">
                      + Ajouter
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Live Cart, Totals & Payment Execution */}
      <div className="w-full lg:w-5/12 flex flex-col bg-slate-900 shadow-2xl h-full border-t lg:border-t-0 border-slate-800">
        {/* Cart Header */}
        <div className="p-3 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200">
              Panier En Cours ({cart.reduce((s, i) => s + i.quantite, 0)} articles)
            </h3>
          </div>
          <button
            onClick={clearCart}
            disabled={cart.length === 0}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-400 disabled:opacity-40 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Vider</span>
          </button>
        </div>

        {/* Client selection / auto-suggest */}
        <div className="p-3 bg-slate-900 border-b border-slate-800">
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
            Client (Nom ou Entreprise)
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={selectedClientName}
                onChange={e => setSelectedClientName(e.target.value)}
                placeholder="Ex: Client Comptoir ou nom..."
                list="clients-list"
                className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-none focus:border-blue-500"
              />
              <datalist id="clients-list">
                <option value="CLIENT COMPTOIR" />
                {clients.map(c => (
                  <option key={c.id} value={c.nom}>
                    {c.code} - Solde dû: $ {(c.soldeActuelUSD / 100).toFixed(2)}
                  </option>
                ))}
              </datalist>
            </div>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs py-8">
              <Barcode className="w-10 h-10 mb-2 opacity-30" />
              <p>Le panier est vide.</p>
              <p className="text-[11px] text-slate-600 mt-1">
                Scannez un article ou cliquez sur « + Ajouter »
              </p>
            </div>
          ) : (
            cart.map(item => (
              <div
                key={item.articleId}
                className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/80 flex items-center justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {item.designation}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                    <span>${(item.prixUnitaireUSD / 100).toFixed(2)}/u</span>
                    <span>•</span>
                    <span className="font-bold text-blue-400">
                      Total: ${( (item.quantite * item.prixUnitaireUSD) / 100 ).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.articleId, -1)}
                    className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-7 text-center font-bold font-mono text-xs text-white">
                    {item.quantite}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.articleId, 1)}
                    className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.articleId)}
                    className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors ml-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Discount & Currency Bar */}
        <div className="p-3 bg-slate-850 border-t border-slate-800 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {/* Currency toggle */}
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                Devise de vente
              </span>
              <div className="flex rounded-lg overflow-hidden border border-slate-700 bg-slate-800 p-0.5">
                <button
                  type="button"
                  onClick={() => setDevise('USD')}
                  className={`flex-1 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${
                    devise === 'USD'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => setDevise('CDF')}
                  className={`flex-1 py-1 text-xs font-bold rounded cursor-pointer transition-colors ${
                    devise === 'CDF'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  CDF (Francs)
                </button>
              </div>
            </div>

            {/* Discount */}
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                Remise accordée
              </span>
              <div className="flex gap-1">
                <input
                  type="number"
                  min="0"
                  value={remiseValue}
                  onChange={e => setRemiseValue(e.target.value)}
                  className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs font-mono text-white text-right focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setRemiseDevise(remiseDevise === 'USD' ? 'CDF' : 'USD')}
                  className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-[10px] font-bold"
                >
                  {remiseDevise}
                </button>
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Mode de paiement
            </span>
            <div className="grid grid-cols-3 gap-1 text-[11px]">
              {(
                [
                  { key: 'ESPECES', label: 'Espèces' },
                  { key: 'M_PESA', label: 'M-Pesa' },
                  { key: 'AIRTEL_MONEY', label: 'Airtel' },
                  { key: 'ORANGE_MONEY', label: 'Orange' },
                  { key: 'VIREMENT', label: 'Virement' },
                  { key: 'CREDIT', label: 'Crédit' },
                ] as const
              ).map(m => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setModePaiement(m.key)}
                  className={`py-1.5 px-2 rounded-lg font-bold border transition-colors cursor-pointer text-center truncate ${
                    modePaiement === m.key
                      ? m.key === 'CREDIT'
                        ? 'bg-red-600 text-white border-red-500'
                        : 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount received & quick preset buttons */}
          <div>
            <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 mb-1">
              <span>Montant reçu du client</span>
              <button
                type="button"
                onClick={handleExactAmount}
                className="text-blue-400 hover:underline cursor-pointer"
              >
                [Montant exact]
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={montantRecuStr}
                onChange={e => setMontantRecuStr(e.target.value)}
                placeholder={
                  devise === 'USD'
                    ? (totalCentsUSD / 100).toFixed(2)
                    : totalCDF.toString()
                }
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-mono font-bold text-white focus:outline-none focus:border-blue-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">
                {devise}
              </span>
            </div>
          </div>
        </div>

        {/* TOTALS & CHANGE CALCULATION PANEL */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2">
          {/* Dual Total Display */}
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Net à payer :
            </span>
            <div className="text-right">
              <div className="text-xl font-extrabold text-white font-mono leading-none">
                {formatUSD(totalCentsUSD)}
              </div>
              <div className="text-xs font-bold text-emerald-400 font-mono mt-0.5">
                {formatCDF(totalCDF)}
              </div>
            </div>
          </div>

          {/* Change return or debt */}
          {modePaiement !== 'CREDIT' ? (
            monnaieRendue > 0 && (
              <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-700 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300">
                  Monnaie à rendre :
                </span>
                <span className="text-base font-extrabold text-emerald-400 font-mono">
                  {devise === 'USD'
                    ? `$ ${monnaieRendue.toFixed(2)}`
                    : `${Math.round(monnaieRendue).toLocaleString('fr-FR')} FC`}
                </span>
              </div>
            )
          ) : (
            <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-700 flex items-center justify-between">
              <span className="text-xs font-bold text-red-300">
                Nouveau crédit (Dette) :
              </span>
              <span className="text-base font-extrabold text-red-400 font-mono">
                {formatUSD(resteAPayerUSD)}
              </span>
            </div>
          )}

          {/* Validation Button */}
          <button
            onClick={handleValidateSale}
            disabled={cart.length === 0}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
          >
            <Printer className="w-4 h-4" />
            <span>Valider la Vente et Imprimer le Ticket [F9]</span>
          </button>
        </div>
      </div>

      {/* Print receipt modal */}
      {successVente && (
        <PrintTicketModal
          vente={successVente}
          params={params}
          onClose={() => setSuccessVente(null)}
        />
      )}
    </div>
  );
};
