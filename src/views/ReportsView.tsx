/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Financial Reports & Cash Reconciliation (Caisse)
 */

import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  DollarSign,
  Package,
  CreditCard,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { User, Vente, Achat, Article } from '../shared/types';
import { storage } from '../services/storage';
import { formatUSD, formatCDF, centsUSDToCDF } from '../shared/money';
import { excelService } from '../services/excelService';

interface ReportsViewProps {
  currentUser: User;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ currentUser }) => {
  const [params] = useState(storage.getParams());
  const [ventes] = useState<Vente[]>(storage.getVentes());
  const [achats] = useState<Achat[]>(storage.getAchats());
  const [articles] = useState<Article[]>(storage.getArticles());

  // Date filters (defaults to current month)
  const today = new Date().toISOString().slice(0, 10);
  const firstDayOfMonth = `${today.slice(0, 7)}-01`;
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);

  // Filtered sales
  const filteredSales = ventes.filter(v => {
    const saleDate = v.date.slice(0, 10);
    return v.statut === 'VALIDE' && saleDate >= startDate && saleDate <= endDate;
  });

  // Filtered purchases
  const filteredPurchases = achats.filter(a => {
    const aDate = a.date.slice(0, 10);
    return a.statut === 'VALIDE' && aDate >= startDate && aDate <= endDate;
  });

  // Cash breakdown by payment mode
  const salesByPaymentMode: Record<string, { count: number; totalUSD: number }> = {
    ESPECES: { count: 0, totalUSD: 0 },
    M_PESA: { count: 0, totalUSD: 0 },
    AIRTEL_MONEY: { count: 0, totalUSD: 0 },
    ORANGE_MONEY: { count: 0, totalUSD: 0 },
    VIREMENT: { count: 0, totalUSD: 0 },
    CREDIT: { count: 0, totalUSD: 0 },
  };

  let totalSalesPeriodUSD = 0;
  let totalDiscountsPeriodUSD = 0;
  let totalCostPeriodUSD = 0;

  for (const v of filteredSales) {
    totalSalesPeriodUSD += v.totalUSD;
    totalDiscountsPeriodUSD += v.remiseUSD;
    if (salesByPaymentMode[v.modePaiement]) {
      salesByPaymentMode[v.modePaiement].count += 1;
      salesByPaymentMode[v.modePaiement].totalUSD += v.totalUSD;
    }
    for (const l of v.lignes) {
      // l.coutUnitaireUSD is in dix-millième (10,000)
      const lineCostCents = Math.round((l.quantite * l.coutUnitaireUSD) / 100);
      totalCostPeriodUSD += lineCostCents;
    }
  }

  const grossProfitUSD = Math.max(0, totalSalesPeriodUSD - totalCostPeriodUSD);
  const totalPurchasesPeriodUSD = filteredPurchases.reduce((s, a) => s + a.totalUSD, 0);

  // Total inventory valuation at PUMP
  const totalStockValuationUSD = articles.reduce((sum, a) => {
    const costCents = Math.round((a.coutMoyen * a.stockActuel) / 100);
    return sum + costCents;
  }, 0);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950 text-slate-100 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-600/20 text-teal-400 border border-teal-500/30">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Rapports Financiers, Caisse & Valorisation du Stock
            </h2>
            <p className="text-xs text-slate-400">
              Arrêt de caisse • Marges brutes • Stock valorisé au PUMP • Période personnalisée
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => excelService.exportVentesCSV()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 cursor-pointer"
          >
            <Download className="w-4 h-4 text-green-400" />
            <span>Exporter Ventes (CSV)</span>
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span>Filtrer la période du rapport :</span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Du :</span>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
          />
          <span className="text-slate-400">Au :</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
          />
        </div>

        <div className="text-xs text-slate-400 ml-auto font-mono">
          {filteredSales.length} vente(s) • {filteredPurchases.length} achat(s)
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Ventes Période</span>
          <div className="text-xl font-extrabold text-white font-mono">
            {formatUSD(totalSalesPeriodUSD)}
          </div>
          <div className="text-xs text-emerald-400 font-mono">
            {formatCDF(centsUSDToCDF(totalSalesPeriodUSD, params.tauxUSD_CDF))}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Marge Brute Réalisée</span>
          <div className="text-xl font-extrabold text-emerald-400 font-mono">
            {formatUSD(grossProfitUSD)}
          </div>
          <div className="text-xs text-slate-400">
            Coût marchandises vendues : {formatUSD(totalCostPeriodUSD)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Achats Fournisseurs</span>
          <div className="text-xl font-extrabold text-blue-400 font-mono">
            {formatUSD(totalPurchasesPeriodUSD)}
          </div>
          <div className="text-xs text-slate-400">
            {filteredPurchases.length} bons d'approvisionnement
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Valorisation Stock Actuel (PUMP)</span>
          <div className="text-xl font-extrabold text-purple-400 font-mono">
            {formatUSD(totalStockValuationUSD)}
          </div>
          <div className="text-xs text-slate-400">
            {articles.reduce((s, a) => s + a.stockActuel, 0)} pièces en magasin
          </div>
        </div>
      </div>

      {/* Cash Register Breakdown (Encaissements par canal) */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span>Arrêt de Caisse & Répartition par Mode de Règlement</span>
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(salesByPaymentMode).map(([mode, data]) => (
            <div key={mode} className="p-3 bg-slate-850 border border-slate-750 rounded-xl space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">
                {mode.replace('_', ' ')}
              </span>
              <div className="text-sm font-extrabold text-white font-mono">
                {formatUSD(data.totalUSD)}
              </div>
              <div className="text-[10px] text-slate-400">
                {data.count} transaction(s)
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
