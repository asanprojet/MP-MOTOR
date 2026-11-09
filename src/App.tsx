/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Main Application Desktop Interface
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User } from './shared/types';
import { storage } from './services/storage';
import { stockService } from './services/stockService';
import { getUserLicenseStatus } from './shared/permissions';
import { Clock, ShieldAlert, Crown, ArrowRight, Lock } from 'lucide-react';
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
import { DesktopBuildView } from './views/DesktopBuildView';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { DatabaseSetupModal } from './components/DatabaseSetupModal';
import { ThemeSettingsModal } from './components/ThemeSettingsModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(() => storage.getCurrentUser());
  const [params, setParams] = useState(() => storage.getParams());
  const [currentTab, setCurrentTab] = useState<TabKey>('pos');
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [dbSetupModalOpen, setDbSetupModalOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);

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
        onOpenDbConfig={() => setDbSetupModalOpen(true)}
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
        {(() => {
          const licenseStatus = getUserLicenseStatus(currentUser, params.licenceGlobaleAVie);
          if (licenseStatus.estExpire && currentUser.role !== 'ARCHITECTE' && currentTab !== 'desktop_exe') {
            return (
              <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100 text-center">
                <div className="max-w-md w-full p-8 rounded-2xl bg-slate-900 border-2 border-red-500/50 shadow-2xl space-y-5">
                  <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center mx-auto animate-pulse">
                    <Lock className="w-8 h-8" />
                  </div>

                  <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-wider">
                      Période d'Accès Expirée
                    </h2>
                    <p className="text-xs text-red-300 font-semibold mt-1">
                      {licenseStatus.dateExpirationFormatee}
                    </p>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    La durée de validité autorisée pour le compte <strong>{currentUser.nom}</strong> ({currentUser.role}) est arrivée à son terme.
                    L'accès aux modules comptoir et de gestion est verrouillé.
                  </p>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
                    <div className="font-bold text-slate-300">Procédure de déverrouillage :</div>
                    <p>Veuillez contacter l'<strong>Architecte Système</strong> pour prolonger votre période d'utilisation ou débloquer la licence définitive à vie de l'application.</p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                    <button
                      onClick={() => {
                        const architectUser = storage.getUsers().find(u => u.role === 'ARCHITECTE');
                        if (architectUser) {
                          storage.setCurrentUser(architectUser);
                          setCurrentUser(architectUser);
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Crown className="w-4 h-4" />
                      <span>Basculer sur Compte Architecte</span>
                    </button>

                    <button
                      onClick={() => setCurrentTab('desktop_exe')}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 cursor-pointer"
                    >
                      Générateur .EXE
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <>
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
                    setParams(storage.getParams());
                    refreshBadges();
                  }}
                  onOpenDbConfig={() => setDbSetupModalOpen(true)}
                />
              )}
              {currentTab === 'desktop_exe' && <DesktopBuildView />}
              {currentTab === 'audit' && <AuditLogView currentUser={currentUser} />}
            </>
          );
        })()}
      </main>

      {/* Keyboard shortcuts modal */}
      <KeyboardShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      {/* Database Setup & Automated CRUD Provisioning Modal */}
      <DatabaseSetupModal
        isOpen={dbSetupModalOpen}
        onClose={() => setDbSetupModalOpen(false)}
        onConfigApplied={() => {
          setDbSetupModalOpen(false);
        }}
      />
    </div>
  );
}
