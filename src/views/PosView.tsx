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
  ShoppingCart,
  Package,
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
  
  // Small screen & responsive view control
  const [mobileTab, setMobileTab] = useState<'CATALOG' | 'CART'>('CATALOG');
  
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

    const receivedValue = parseFloat(montantRecuStr.replace(',', '.')) || 0;
    
    // Default to total if empty
    const effectiveReceived =
      montantRecuStr.trim() === ''
        ? modePaiement === 'CREDIT'
          ? 0
          : devise === 'USD'
          ? totalCentsUSD / 100
          : totalCDF
        : receivedValue;

    // Block payment if insufficient for non-credit sales
    if (modePaiement !== 'CREDIT') {
        const recuCents = devise === 'USD' ? Math.round(effectiveReceived * 100) : Math.round((effectiveReceived * 100) / params.tauxUSD_CDF);
        if (recuCents < totalCentsUSD) {
            setErrorMessage("Le montant reçu est insuffisant pour finaliser cette vente.");
            return;
        }
    }

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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 text-slate-100">
      {/* Responsive View Switcher for Small Screens (11", 12", laptops/tablets) */}
      <div className="lg:hidden flex items-center bg-slate-900 border-b border-slate-800 p-1.5 gap-1 shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('CATALOG')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            mobileTab === 'CATALOG'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-white bg-slate-800/60'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Catalogue Pièces ({filteredArticles.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('CART')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer relative ${
            mobileTab === 'CART'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white bg-slate-800/60'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Panier & Caisse</span>
          {cart.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-emerald-900 font-extrabold ml-1">
              {cart.reduce((s, i) => s + i.quantite, 0)} • {formatUSD(totalCentsUSD)}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
        {/* LEFT PANEL: Product catalog & Fast search */}
        <div className={`w-full lg:w-7/12 flex-col border-r border-slate-800 bg-slate-900/50 ${
          mobileTab === 'CATALOG' ? 'flex flex-1 h-full' : 'hidden lg:flex'
        }`}>
          {/* Search header & Barcode input */}
          <div className="p-3 bg-slate-900 border-b border-slate-800 space-y-2 shrink-0">
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Barcode scanner reader */}
              <form onSubmit={handleBarcodeSubmit} className="relative flex-1">
                <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Scanner code-barres ou référence [Entrée]..."
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                  className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Error banner if any */}
          {errorMessage && (
            <div className="mx-3 mt-2 p-2.5 rounded-lg bg-red-950/80 border border-red-700 text-red-200 text-xs flex items-center justify-between animate-shake shrink-0">
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
          <div className="flex-1 overflow-y-auto p-2.5 sm:p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                    onClick={() => {
                      addToCart(art);
                      // If on mobile/small screen, optionally let user see cart easily
                    }}
                    disabled={isRupture}
                    className={`p-2.5 sm:p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
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
                          className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            status === 'RUPTURE'
                              ? 'bg-red-950 text-red-400 border border-red-800'
                              : status === 'ALERTE'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          }`}
                        >
                          {status === 'RUPTURE'
                            ? 'RUPTURE'
                            : status === 'ALERTE'
                            ? `ALERTE (${art.stockActuel})`
                            : `STOCK: ${art.stockActuel}`}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white line-clamp-2 leading-tight">
                        {art.designation}
                      </h4>

                      <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                        <span>{art.marqueVehicule}</span>
                        <span className="text-slate-600">•</span>
                        <span>{art.categorie}</span>
                      </div>
                    </div>

                    {/* Price display */}
                    <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center justify-between">
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
        <div className={`w-full lg:w-5/12 flex-col bg-slate-900 shadow-2xl h-full border-t lg:border-t-0 border-slate-800 ${
          mobileTab === 'CART' ? 'flex flex-1 h-full' : 'hidden lg:flex'
        }`}>
          {/* Cart Header */}
          <div className="p-2.5 sm:p-3 bg-slate-850 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                Panier ({cart.reduce((s, i) => s + i.quantite, 0)} pièces)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearCart}
                disabled={cart.length === 0}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-red-400 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Vider</span>
              </button>
            </div>
          </div>

          {/* Client selection / auto-suggest */}
          <div className="p-2.5 sm:p-3 bg-slate-900 border-b border-slate-800 shrink-0">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Client Comptoir / Facturation
            </label>
            <div className="relative">
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

          {/* Cart Items List - Scrollable */}
          <div className="flex-1 min-h-[100px] overflow-y-auto p-2.5 sm:p-3 space-y-1.5">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs py-6">
                <Barcode className="w-8 h-8 mb-2 opacity-30" />
                <p>Le panier est vide.</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Scannez ou cliquez sur « + Ajouter »
                </p>
                {/* On small screen, prompt back to catalog */}
                <button
                  type="button"
                  onClick={() => setMobileTab('CATALOG')}
                  className="lg:hidden mt-3 px-3 py-1 rounded bg-blue-600/30 text-blue-300 text-xs font-semibold"
                >
                  Ouvrir le Catalogue Articles
                </button>
              </div>
            ) : (
              cart.map(item => (
                <div
                  key={item.articleId}
                  className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/80 flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {item.designation}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                      <span>${(item.prixUnitaireUSD / 100).toFixed(2)}</span>
                      <span>×</span>
                      <span className="font-bold text-white">{item.quantite}</span>
                      <span>=</span>
                      <span className="font-bold text-blue-400">
                        ${( (item.quantite * item.prixUnitaireUSD) / 100 ).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.articleId, -1)}
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center cursor-pointer text-xs"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold font-mono text-xs text-white">
                      {item.quantite}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.articleId, 1)}
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center cursor-pointer text-xs"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.articleId)}
                      className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors ml-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Compact Dropdown Bar: Devise Vente & Mode de Paiement (Space Saving) */}
          <div className="p-2.5 sm:p-3 bg-slate-850 border-t border-slate-800 space-y-2 shrink-0">
            {/* ROW 1: Devise (Dropdown) & Mode de Paiement (Dropdown) */}
            <div className="grid grid-cols-2 gap-2">
              {/* Devise Dropdown */}
              <div>
                <label htmlFor="selectDevise" className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5 flex items-center justify-between">
                  <span>Devise Vente</span>
                  <span className="text-emerald-400 font-mono text-[9px]">{params.tauxUSD_CDF} FC/$</span>
                </label>
                <select
                  id="selectDevise"
                  value={devise}
                  onChange={e => setDevise(e.target.value as Currency)}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm"
                >
                  <option value="USD">💵 USD ($) - Dollar</option>
                  <option value="CDF">🇨🇩 CDF (FC) - Franc Congolais</option>
                </select>
              </div>

              {/* Mode de Paiement Dropdown */}
              <div>
                <label htmlFor="selectPayment" className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                  Mode de Paiement
                </label>
                <select
                  id="selectPayment"
                  value={modePaiement}
                  onChange={e => setModePaiement(e.target.value as PaymentMethod)}
                  className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-bold focus:outline-none cursor-pointer shadow-sm ${
                    modePaiement === 'CREDIT'
                      ? 'bg-red-950 text-red-200 border-red-600'
                      : 'bg-slate-800 text-white border-slate-700 focus:border-blue-500'
                  }`}
                >
                  <option value="ESPECES">💵 Espèces (Cash)</option>
                  <option value="M_PESA">📱 M-Pesa (Vodacom)</option>
                  <option value="AIRTEL_MONEY">📱 Airtel Money</option>
                  <option value="ORANGE_MONEY">📱 Orange Money</option>
                  <option value="VIREMENT">🏦 Virement Bancaire</option>
                  <option value="CREDIT">💳 Vente à Crédit (Dette)</option>
                </select>
              </div>
            </div>

            {/* ROW 2: Remise & Montant Reçu */}
            <div className="grid grid-cols-2 gap-2">
              {/* Discount */}
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                  Remise
                </span>
                <div className="flex gap-1">
                  <input
                    type="number"
                    min="0"
                    value={remiseValue}
                    onChange={e => setRemiseValue(e.target.value)}
                    placeholder="0"
                    className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white text-right focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setRemiseDevise(remiseDevise === 'USD' ? 'CDF' : 'USD')}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-[10px] font-bold cursor-pointer"
                  >
                    {remiseDevise}
                  </button>
                </div>
              </div>

              {/* Amount received */}
              <div>
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                  <span>Montant reçu</span>
                  <button
                    type="button"
                    onClick={handleExactAmount}
                    className="text-blue-400 hover:underline cursor-pointer text-[9px]"
                  >
                    [Exact]
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
                    className="w-full px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono font-bold text-white focus:outline-none focus:border-blue-500 pr-9"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 font-bold text-[10px] text-slate-400">
                    {devise}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* TOTALS & CHANGE CALCULATION PANEL - ALWAYS VISIBLE STICKY FOOTER */}
          <div className="p-2.5 sm:p-3 bg-slate-950 border-t border-slate-800 space-y-2 shrink-0">
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
                <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-700 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300">
                    Monnaie à rendre :
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-emerald-400 font-mono">
                    {devise === 'USD'
                      ? `$ ${monnaieRendue.toFixed(2)}`
                      : `${Math.round(monnaieRendue).toLocaleString('fr-FR')} FC`}
                  </span>
                </div>
              )
            ) : (
              <div className="p-2 rounded-lg bg-red-950/80 border border-red-700 flex items-center justify-between">
                <span className="text-xs font-bold text-red-300">
                  Dette créditée au client :
                </span>
                <span className="text-sm sm:text-base font-extrabold text-red-400 font-mono">
                  {formatUSD(resteAPayerUSD)}
                </span>
              </div>
            )}

            {/* Validation Button - Anchored and prominent */}
            <button
              onClick={handleValidateSale}
              disabled={cart.length === 0}
              className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Valider la Vente et Imprimer Ticket [F9]</span>
            </button>
          </div>
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
