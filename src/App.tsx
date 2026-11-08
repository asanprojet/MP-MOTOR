/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Main Application Desktop Interface
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User } from './shared/types';
import { storage } from './services/storage';
import { stockService } from './services/stockService';
import { DesktopHeader } from './components/DesktopHeader';
import { Navigation, TabKey } from './components/Navigation';
import { PosView } from './views/PosView';
import { ArticlesView } from './views/ArticlesView';
import { PurchasesView } from './views/PurchasesView';
import { SalesHistoryView } from './views/SalesHistoryView';
import { CreditsView } from './views/CreditsView';
import { RequestsView } from './views/RequestsView';
import { DashboardView } from './views/DashboardView';
import { ReportsView } from './views/ReportsView';
import { ImportExportView } from './views/ImportExportView';
import { SettingsView } from './views/SettingsView';
import { AuditLogView } from './views/AuditLogView';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(() => storage.getCurrentUser());
  const [currentTab, setCurrentTab] = useState<TabKey>('pos');
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  // Dynamic badge counters
  const [stockAlertsCount, setStockAlertsCount] = useState<number>(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);

  const refreshBadges = useCallback(() => {
    const params = storage.getParams();
    const articles = storage.getArticles();
    const alerts = articles.filter(a => {
      const status = stockService.getArticleStatus(a, params.seuilAlerteDefaut);
      return status === 'ALERTE' || status === 'RUPTURE';
    });
    setStockAlertsCount(alerts.length);

    const demandes = storage.getDemandes();
    const pending = demandes.filter(d => d.statut === 'EN_ATTENTE');
    setPendingRequestsCount(pending.length);
  }, []);

  useEffect(() => {
    refreshBadges();
    const interval = setInterval(refreshBadges, 3000);
    return () => clearInterval(interval);
  }, [refreshBadges]);

  // Global Keyboard Shortcuts (F1 - F9, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setShortcutsModalOpen(prev => !prev);
      } else if (e.key === 'F2') {
        e.preventDefault();
        setCurrentTab('pos');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setCurrentTab('articles');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setCurrentTab('purchases');
      } else if (e.key === 'F5') {
        e.preventDefault();
        setCurrentTab('sales');
      } else if (e.key === 'F6') {
        e.preventDefault();
        setCurrentTab('credits');
      } else if (e.key === 'F7') {
        e.preventDefault();
        setCurrentTab('dashboard');
      } else if (e.key === 'F8') {
        e.preventDefault();
        setCurrentTab('reports');
      } else if (e.key === 'F9') {
        // Can be used to focus cashier checkout
        e.preventDefault();
        setCurrentTab('pos');
      } else if (e.key === 'Escape') {
        setShortcutsModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* Top Windows simulated Title bar & Identity */}
      <DesktopHeader
        currentUser={currentUser}
        onUserChange={user => setCurrentUser(user)}
        onOpenShortcuts={() => setShortcutsModalOpen(true)}
      />

      {/* Navigation tabs */}
      <Navigation
        currentTab={currentTab}
        onTabChange={tab => {
          setCurrentTab(tab);
          refreshBadges();
        }}
        currentUser={currentUser}
        pendingRequestsCount={pendingRequestsCount}
        stockAlertsCount={stockAlertsCount}
      />

      {/* Active Tab View */}
      <main className="flex-1 flex overflow-hidden">
        {currentTab === 'pos' && <PosView currentUser={currentUser} />}
        {currentTab === 'articles' && <ArticlesView currentUser={currentUser} />}
        {currentTab === 'purchases' && <PurchasesView currentUser={currentUser} />}
        {currentTab === 'sales' && <SalesHistoryView currentUser={currentUser} />}
        {currentTab === 'credits' && <CreditsView currentUser={currentUser} />}
        {currentTab === 'requests' && <RequestsView currentUser={currentUser} />}
        {currentTab === 'dashboard' && (
          <DashboardView
            currentUser={currentUser}
            onNavigateToTab={tab => {
              setCurrentTab(tab);
              refreshBadges();
            }}
          />
        )}
        {currentTab === 'reports' && <ReportsView currentUser={currentUser} />}
        {currentTab === 'import' && <ImportExportView currentUser={currentUser} />}
        {currentTab === 'settings' && (
          <SettingsView
            currentUser={currentUser}
            onUserListUpdated={() => {
              setCurrentUser(storage.getCurrentUser());
              refreshBadges();
            }}
          />
        )}
        {currentTab === 'audit' && <AuditLogView currentUser={currentUser} />}
      </main>

      {/* Keyboard shortcuts modal */}
      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
    </div>
  );
}
