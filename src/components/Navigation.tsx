/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Navigation Tabs Component
 */

import React from 'react';
import {
  Zap,
  Package,
  ShoppingCart,
  FileText,
  CreditCard,
  FileCheck2,
  BarChart3,
  FileSpreadsheet,
  Settings,
  ShieldAlert,
  Monitor,
} from 'lucide-react';
import { User } from '../shared/types';
import { hasPermission } from '../shared/permissions';

export type TabKey =
  | 'pos'
  | 'articles'
  | 'purchases'
  | 'sales'
  | 'credits'
  | 'requests'
  | 'dashboard'
  | 'reports'
  | 'import'
  | 'settings'
  | 'desktop_exe'
  | 'audit';

interface NavigationProps {
  currentTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  currentUser: User;
  pendingRequestsCount: number;
  stockAlertsCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  currentUser,
  pendingRequestsCount,
  stockAlertsCount,
}) => {
  const role = currentUser.role;

  const tabs: {
    key: TabKey;
    label: string;
    icon: React.ReactNode;
    shortcut?: string;
    visible: boolean;
    badge?: number;
    badgeColor?: string;
  }[] = [
    {
      key: 'pos',
      label: 'Caisse Rapide',
      icon: <Zap className="w-4 h-4 text-amber-400" />,
      shortcut: 'F2',
      visible: hasPermission(role, 'canPerformSales'),
    },
    {
      key: 'articles',
      label: 'Stock & Articles',
      icon: <Package className="w-4 h-4 text-blue-400" />,
      shortcut: 'F3',
      visible: hasPermission(role, 'canViewArticles'),
      badge: stockAlertsCount > 0 ? stockAlertsCount : undefined,
      badgeColor: 'bg-red-500 text-white',
    },
    {
      key: 'purchases',
      label: 'Achats (PUMP)',
      icon: <ShoppingCart className="w-4 h-4 text-emerald-400" />,
      shortcut: 'F4',
      visible: hasPermission(role, 'canPerformPurchases'),
    },
    {
      key: 'sales',
      label: 'Factures Ventes',
      icon: <FileText className="w-4 h-4 text-indigo-400" />,
      shortcut: 'F5',
      visible: true,
    },
    {
      key: 'credits',
      label: 'Crédits Clients',
      icon: <CreditCard className="w-4 h-4 text-pink-400" />,
      shortcut: 'F6',
      visible: hasPermission(role, 'canManageCustomers'),
    },
    {
      key: 'requests',
      label: 'Demandes',
      icon: <FileCheck2 className="w-4 h-4 text-orange-400" />,
      visible: hasPermission(role, 'canApproveRequests') || hasPermission(role, 'canRequestSalesCancellation'),
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined,
      badgeColor: 'bg-orange-500 text-white',
    },
    {
      key: 'dashboard',
      label: 'Tableau de Bord',
      icon: <BarChart3 className="w-4 h-4 text-sky-400" />,
      shortcut: 'F7',
      visible: hasPermission(role, 'canViewDashboard'),
    },
    {
      key: 'reports',
      label: 'Rapports & Caisse',
      icon: <BarChart3 className="w-4 h-4 text-teal-400" />,
      shortcut: 'F8',
      visible: hasPermission(role, 'canViewReports'),
    },
    {
      key: 'import',
      label: 'Import / Export',
      icon: <FileSpreadsheet className="w-4 h-4 text-green-400" />,
      visible: hasPermission(role, 'canImportExportExcel'),
    },
    {
      key: 'desktop_exe',
      label: 'Exécutable .EXE',
      icon: <Monitor className="w-4 h-4 text-cyan-400" />,
      visible: true,
      badge: 1,
      badgeColor: 'bg-emerald-600 text-white',
    },
    {
      key: 'settings',
      label: 'Paramètres',
      icon: <Settings className="w-4 h-4 text-slate-400" />,
      shortcut: 'F9',
      visible: hasPermission(role, 'canManageSettings'),
    },
    {
      key: 'audit',
      label: 'Journal d\'Audit',
      icon: <ShieldAlert className="w-4 h-4 text-purple-400" />,
      visible: hasPermission(role, 'canViewAuditLog'), // SUPERADMIN only
    },
  ];

  return (
    <nav className="no-print bg-slate-900/90 border-b border-slate-800 px-4 flex items-center gap-1 overflow-x-auto shadow-inner py-1">
      {tabs
        .filter((t) => t.visible)
        .map((tab) => {
          const isActive = currentTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 relative cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>

              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    tab.badgeColor || 'bg-blue-500 text-white'
                  }`}
                >
                  {tab.badge}
                </span>
              )}

              {tab.shortcut && (
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                    isActive
                      ? 'bg-blue-700/80 text-blue-100'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {tab.shortcut}
                </span>
              )}
            </button>
          );
        })}
    </nav>
  );
};
