/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Management Dashboard (Tableau de Bord)
 */

import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Package,
  ShoppingCart,
  Users,
  CreditCard,
  Percent,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';
import { User, Vente, Article, Client } from '../shared/types';
import { storage } from '../services/storage';
import { stockService } from '../services/stockService';
import { formatUSD, formatCDF, centsUSDToCDF } from '../shared/money';

interface DashboardViewProps {
  currentUser: User;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ currentUser, onNavigateToTab }) => {
  const [params] = useState(storage.getParams());
  const [ventes] = useState<Vente[]>(storage.getVentes());
  const [articles] = useState<Article[]>(storage.getArticles());
  const [clients] = useState<Client[]>(storage.getClients());

  const validSales = ventes.filter(v => v.statut === 'VALIDE');

  // Compute Today's sales
  const todayStr = new Date().toISOString().slice(0, 10);
  const salesToday = validSales.filter(v => v.date.startsWith(todayStr));
  const turnoverTodayUSD = salesToday.reduce((sum, v) => sum + v.totalUSD, 0);
  const turnoverTodayCDF = centsUSDToCDF(turnoverTodayUSD, params.tauxUSD_CDF);

  // Compute Month's sales
  const thisMonthPrefix = new Date().toISOString().slice(0, 7);
  const salesMonth = validSales.filter(v => v.date.startsWith(thisMonthPrefix));
  const turnoverMonthUSD = salesMonth.reduce((sum, v) => sum + v.totalUSD, 0);
  const turnoverMonthCDF = centsUSDToCDF(turnoverMonthUSD, params.tauxUSD_CDF);

  // Compute Realized Gross Profit (Marge réelle calculée sur les coûts gelés)
  let totalCostSoldCentsUSD = 0;
  let totalRevenueCentsUSD = 0;
  for (const v of validSales) {
    for (const l of v.lignes) {
      totalRevenueCentsUSD += l.totalLigneUSD;
      // l.coutUnitaireUSD is in dix-millième (10,000), convert to cents
      const lineCostCents = Math.round((l.quantite * l.coutUnitaireUSD) / 100);
      totalCostSoldCentsUSD += lineCostCents;
    }
  }
  const grossProfitCentsUSD = Math.max(0, totalRevenueCentsUSD - totalCostSoldCentsUSD);
  const grossProfitMarginPercent =
    totalRevenueCentsUSD > 0
      ? ((grossProfitCentsUSD / totalRevenueCentsUSD) * 100).toFixed(1)
      : '0.0';

  // Stock status counts
  const stockAlerts = articles.filter(
    a => stockService.getArticleStatus(a, params.seuilAlerteDefaut) === 'ALERTE'
  );
  const stockRuptures = articles.filter(
    a => stockService.getArticleStatus(a, params.seuilAlerteDefaut) === 'RUPTURE'
  );

  // Total customer debt
  const totalDebtUSD = clients.reduce((sum, c) => sum + c.soldeActuelUSD, 0);

  // Top selling parts calculation
  const salesCountByArticle = new Map<string, { code: string; designation: string; qty: number; totalUSD: number }>();
  for (const v of validSales) {
    for (const l of v.lignes) {
      const prev = salesCountByArticle.get(l.articleId) || {
        code: l.articleCode,
        designation: l.designation,
        qty: 0,
        totalUSD: 0,
      };
      salesCountByArticle.set(l.articleId, {
        code: l.articleCode,
        designation: l.designation,
        qty: prev.qty + l.quantite,
        totalUSD: prev.totalUSD + l.totalLigneUSD,
      });
    }
  }

  const topArticles = Array.from(salesCountByArticle.values())
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950 text-slate-100 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <span>Tableau de Bord Commercial & Alertes</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-600/30 text-blue-300 border border-blue-500/30">
              Maison MP Motors
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Données consolidées hors ligne • Chiffre d'affaires • Marges réelles • Alertes de réapprovisionnement
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateToTab('pos')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <span>⚡ Nouvelle Vente Comptoir</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CA du Jour */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>CA AUJOURD'HUI</span>
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {formatUSD(turnoverTodayUSD)}
          </div>
          <div className="text-xs text-emerald-400 font-mono font-semibold">
            {formatCDF(turnoverTodayCDF)}
          </div>
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-800">
            {salesToday.length} facture(s) enregistrée(s) ce jour
          </div>
        </div>

        {/* CA du Mois */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>CA DU MOIS</span>
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {formatUSD(turnoverMonthUSD)}
          </div>
          <div className="text-xs text-emerald-400 font-mono font-semibold">
            {formatCDF(turnoverMonthCDF)}
          </div>
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-800">
            {salesMonth.length} facture(s) ce mois
          </div>
        </div>

        {/* Marge Brute Réalisée */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>MARGE BRUTE RÉELLE</span>
            <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {formatUSD(grossProfitCentsUSD)}
          </div>
          <div className="text-xs text-slate-300 font-semibold">
            Taux de marge moyen : <span className="text-emerald-400 font-bold">{grossProfitMarginPercent}%</span>
          </div>
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-800">
            Calculé sur les prix & coûts unitaires figés
          </div>
        </div>

        {/* Encours Crédits */}
        <div
          onClick={() => onNavigateToTab('credits')}
          className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-pink-500/40 shadow-xl space-y-2 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>CRÉDITS CLIENTS DUS</span>
            <div className="p-2 rounded-xl bg-pink-600/20 text-pink-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-pink-400 font-mono">
            {formatUSD(totalDebtUSD)}
          </div>
          <div className="text-xs text-slate-400">
            {clients.filter(c => c.soldeActuelUSD > 0).length} client(s) ont une dette
          </div>
          <div className="text-[11px] text-blue-400 font-semibold pt-1 border-t border-slate-800 flex items-center justify-between">
            <span>Gérer les encaissements</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Stock Alerts & Top Selling Parts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Stock Alerts & Ruptures */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                Articles en Alerte & Ruptures ({stockAlerts.length + stockRuptures.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigateToTab('articles')}
              className="text-xs text-blue-400 hover:underline font-semibold"
            >
              Voir tout le stock
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {stockRuptures.map(art => (
              <div
                key={art.id}
                className="p-3 rounded-xl bg-red-950/30 border border-red-800/60 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-300">{art.code}</span>
                    <span className="px-1.5 py-0.2 rounded bg-red-600 text-white font-bold text-[10px]">
                      RUPTURE
                    </span>
                  </div>
                  <div className="font-bold text-white mt-1">{art.designation}</div>
                  <div className="text-[10px] text-slate-400">{art.marqueVehicule}</div>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-red-400 font-mono">0</span>
                  <button
                    onClick={() => onNavigateToTab('purchases')}
                    className="block mt-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold"
                  >
                    Commander
                  </button>
                </div>
              </div>
            ))}

            {stockAlerts.map(art => (
              <div
                key={art.id}
                className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/60 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-300">{art.code}</span>
                    <span className="px-1.5 py-0.2 rounded bg-amber-600 text-white font-bold text-[10px]">
                      ALERTE SEUIL
                    </span>
                  </div>
                  <div className="font-bold text-white mt-1">{art.designation}</div>
                  <div className="text-[10px] text-slate-400">
                    Seuil min : {art.seuilAlerte ?? params.seuilAlerteDefaut} pièces
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-base font-extrabold text-amber-400 font-mono">
                    {art.stockActuel} pcs
                  </div>
                  <button
                    onClick={() => onNavigateToTab('purchases')}
                    className="block mt-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold"
                  >
                    Réappro
                  </button>
                </div>
              </div>
            ))}

            {stockAlerts.length === 0 && stockRuptures.length === 0 && (
              <div className="p-8 text-center text-slate-500 text-xs">
                Aucune alerte de stock. Tous les articles sont approvisionnés.
              </div>
            )}
          </div>
        </div>

        {/* Right: Top Selling Auto Parts */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                Pièces Les Plus Vendues (Top Débit)
              </h3>
            </div>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {topArticles.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Effectuez des ventes pour afficher le classement des meilleures pièces.
              </div>
            ) : (
              topArticles.map((item, idx) => (
                <div
                  key={item.code}
                  className="p-3 rounded-xl bg-slate-800/80 border border-slate-750 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-300 font-bold flex items-center justify-center text-xs">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-white">{item.designation}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{item.code}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-white font-mono text-sm">
                      {item.qty} vendus
                    </div>
                    <div className="text-[10px] text-emerald-400 font-mono">
                      {formatUSD(item.totalUSD)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
