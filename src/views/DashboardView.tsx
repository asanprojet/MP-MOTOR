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
  BarChart3,
} from 'lucide-react';
import { User, Vente, Article, Client } from '../shared/types';
import { storage } from '../services/storage';
import { stockService } from '../services/stockService';
import { formatUSD, formatCDF, centsUSDToCDF } from '../shared/money';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface DashboardViewProps {
  currentUser: User;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ currentUser, onNavigateToTab }) => {
  const [params] = useState(storage.getParams());
  const [ventes] = useState<Vente[]>(storage.getVentes());
  const [articles] = useState<Article[]>(storage.getArticles());
  const [clients] = useState<Client[]>(storage.getClients());
  const [chartCurrency, setChartCurrency] = useState<'USD' | 'CDF'>('USD');

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

  // Compute 7-day daily sales history (Last 7 days including today)
  const last7DaysData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toISOString().slice(0, 10);

    const dayName = d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
    const shortLabel = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });

    const daySales = validSales.filter(v => v.date.startsWith(dayStr));
    const totalUSDInCents = daySales.reduce((sum, v) => sum + v.totalUSD, 0);
    const totalCDF = centsUSDToCDF(totalUSDInCents, params.tauxUSD_CDF);
    const amountUSD = totalUSDInCents / 100; // in dollars for chart display

    return {
      date: dayStr,
      label: shortLabel,
      fullDate: dayName,
      ventesUSD: Number(amountUSD.toFixed(2)),
      ventesCDF: totalCDF,
      totalCentsUSD: totalUSDInCents,
      count: daySales.length,
    };
  });

  const total7DaysUSDInCents = last7DaysData.reduce((acc, d) => acc + d.totalCentsUSD, 0);
  const total7DaysCDF = centsUSDToCDF(total7DaysUSDInCents, params.tauxUSD_CDF);
  const total7DaysCount = last7DaysData.reduce((acc, d) => acc + d.count, 0);

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

      {/* 7-Day Sales Bar Chart (Recharts) */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                  Ventes Quotidiennes — 7 Derniers Jours
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  {total7DaysCount} facture{total7DaysCount > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Chiffre d'affaires cumulé : <span className="font-bold font-mono text-white">{formatUSD(total7DaysUSDInCents)}</span>
                <span className="text-slate-500 mx-1.5">•</span>
                <span className="font-semibold font-mono text-emerald-400">{formatCDF(total7DaysCDF)}</span>
              </p>
            </div>
          </div>

          {/* Currency Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setChartCurrency('USD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                chartCurrency === 'USD'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              USD ($)
            </button>
            <button
              onClick={() => setChartCurrency('CDF')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                chartCurrency === 'CDF'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              CDF (FC)
            </button>
          </div>
        </div>

        {/* Chart Container */}
        <div className="w-full h-72 pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last7DaysData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) =>
                  chartCurrency === 'USD'
                    ? `$${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`
                    : `${val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
                }
              />
              <Tooltip
                cursor={{ fill: 'rgba(51, 65, 85, 0.3)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[190px]">
                        <div className="font-bold text-white capitalize border-b border-slate-800 pb-1 flex items-center justify-between">
                          <span>{data.fullDate}</span>
                          <span className="text-[10px] font-normal text-slate-400">
                            {data.count} facture{data.count > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="space-y-1 pt-0.5">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Total USD :</span>
                            <span className="font-mono font-bold text-blue-400">
                              {formatUSD(data.totalCentsUSD)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Total CDF :</span>
                            <span className="font-mono font-bold text-emerald-400">
                              {formatCDF(data.ventesCDF)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey={chartCurrency === 'USD' ? 'ventesUSD' : 'ventesCDF'}
                name={chartCurrency === 'USD' ? 'Ventes ($)' : 'Ventes (FC)'}
                fill={chartCurrency === 'USD' ? '#3b82f6' : '#10b981'}
                radius={[6, 6, 0, 0]}
                maxBarSize={52}
              />
            </BarChart>
          </ResponsiveContainer>
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
