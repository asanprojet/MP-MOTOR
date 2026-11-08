/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Role Permissions Matrix
 */

import { Role } from './types';

export interface Permissions {
  canViewDashboard: boolean;
  canViewReports: boolean;
  canViewAuditLog: boolean; // ARCHITECTE, SUPERADMIN
  canManageUsers: boolean; // ARCHITECTE, SUPERADMIN, ADMIN
  canManageSettings: boolean; // ARCHITECTE, SUPERADMIN, ADMIN
  canPerformBackupRestore: boolean; // ARCHITECTE, SUPERADMIN, ADMIN
  canManageLicensing: boolean; // ARCHITECTE only: Définir à vie, prolonger les durées
  
  // Articles & Prices
  canViewArticles: boolean;
  canEditArticles: boolean;
  canFixPrices: boolean; // ARCHITECTE, SUPERADMIN, ADMIN
  canViewPurchaseCosts: boolean; // ARCHITECTE, SUPERADMIN, ADMIN, MAGASINIER, COMPTABLE (CAISSIER must NEVER see costs)

  // Stock
  canPerformStockAdjustments: boolean; // ARCHITECTE, SUPERADMIN, ADMIN, MAGASINIER
  canManageSuppliers: boolean; // ARCHITECTE, SUPERADMIN, ADMIN, MAGASINIER
  
  // Purchases
  canPerformPurchases: boolean; // ARCHITECTE, SUPERADMIN, ADMIN, MAGASINIER
  canCancelPurchasesDirectly: boolean; // ARCHITECTE, SUPERADMIN, ADMIN

  // Sales & POS
  canPerformSales: boolean; // ARCHITECTE, SUPERADMIN, ADMIN, CAISSIER
  canCancelSalesDirectly: boolean; // ARCHITECTE, SUPERADMIN, ADMIN
  canRequestSalesCancellation: boolean; // CAISSIER
  canApproveRequests: boolean; // ARCHITECTE, SUPERADMIN, ADMIN

  // Customers & Credits
  canManageCustomers: boolean;
  canReceiveCreditPayments: boolean; // ARCHITECTE, SUPERADMIN, ADMIN, CAISSIER
  
  // Import / Export
  canImportExportExcel: boolean; // ARCHITECTE, SUPERADMIN, ADMIN
}

export const ROLE_PERMISSIONS: Record<Role, Permissions> = {
  ARCHITECTE: {
    canViewDashboard: true,
    canViewReports: true,
    canViewAuditLog: true,
    canManageUsers: true,
    canManageSettings: true,
    canPerformBackupRestore: true,
    canManageLicensing: true,
    canViewArticles: true,
    canEditArticles: true,
    canFixPrices: true,
    canViewPurchaseCosts: true,
    canPerformStockAdjustments: true,
    canManageSuppliers: true,
    canPerformPurchases: true,
    canCancelPurchasesDirectly: true,
    canPerformSales: true,
    canCancelSalesDirectly: true,
    canRequestSalesCancellation: false,
    canApproveRequests: true,
    canManageCustomers: true,
    canReceiveCreditPayments: true,
    canImportExportExcel: true,
  },
  SUPERADMIN: {
    canViewDashboard: true,
    canViewReports: true,
    canViewAuditLog: true,
    canManageUsers: true,
    canManageSettings: true,
    canPerformBackupRestore: true,
    canManageLicensing: false, // Seul l'Architecte peut modifier les licences globales
    canViewArticles: true,
    canEditArticles: true,
    canFixPrices: true,
    canViewPurchaseCosts: true,
    canPerformStockAdjustments: true,
    canManageSuppliers: true,
    canPerformPurchases: true,
    canCancelPurchasesDirectly: true,
    canPerformSales: true,
    canCancelSalesDirectly: true,
    canRequestSalesCancellation: false,
    canApproveRequests: true,
    canManageCustomers: true,
    canReceiveCreditPayments: true,
    canImportExportExcel: true,
  },
  ADMIN: {
    canViewDashboard: true,
    canViewReports: true,
    canViewAuditLog: false,
    canManageUsers: true,
    canManageSettings: true,
    canPerformBackupRestore: true,
    canManageLicensing: false,
    canViewArticles: true,
    canEditArticles: true,
    canFixPrices: true,
    canViewPurchaseCosts: true,
    canPerformStockAdjustments: true,
    canManageSuppliers: true,
    canPerformPurchases: true,
    canCancelPurchasesDirectly: true,
    canPerformSales: true,
    canCancelSalesDirectly: true,
    canRequestSalesCancellation: false,
    canApproveRequests: true,
    canManageCustomers: true,
    canReceiveCreditPayments: true,
    canImportExportExcel: true,
  },
  MAGASINIER: {
    canViewDashboard: true,
    canViewReports: false,
    canViewAuditLog: false,
    canManageUsers: false,
    canManageSettings: false,
    canPerformBackupRestore: false,
    canManageLicensing: false,
    canViewArticles: true,
    canEditArticles: true,
    canFixPrices: false,
    canViewPurchaseCosts: true,
    canPerformStockAdjustments: true,
    canManageSuppliers: true,
    canPerformPurchases: true,
    canCancelPurchasesDirectly: false,
    canPerformSales: false,
    canCancelSalesDirectly: false,
    canRequestSalesCancellation: false,
    canApproveRequests: false,
    canManageCustomers: false,
    canReceiveCreditPayments: false,
    canImportExportExcel: false,
  },
  CAISSIER: {
    canViewDashboard: true,
    canViewReports: false,
    canViewAuditLog: false,
    canManageUsers: false,
    canManageSettings: false,
    canPerformBackupRestore: false,
    canManageLicensing: false,
    canViewArticles: true,
    canEditArticles: false,
    canFixPrices: false,
    canViewPurchaseCosts: false,
    canPerformStockAdjustments: false,
    canManageSuppliers: false,
    canPerformPurchases: false,
    canCancelPurchasesDirectly: false,
    canPerformSales: true,
    canCancelSalesDirectly: false,
    canRequestSalesCancellation: true,
    canApproveRequests: false,
    canManageCustomers: true,
    canReceiveCreditPayments: true,
    canImportExportExcel: false,
  },
  COMPTABLE: {
    canViewDashboard: true,
    canViewReports: true,
    canViewAuditLog: false,
    canManageUsers: false,
    canManageSettings: false,
    canPerformBackupRestore: false,
    canManageLicensing: false,
    canViewArticles: true,
    canEditArticles: false,
    canFixPrices: false,
    canViewPurchaseCosts: true,
    canPerformStockAdjustments: false,
    canManageSuppliers: false,
    canPerformPurchases: false,
    canCancelPurchasesDirectly: false,
    canPerformSales: false,
    canCancelSalesDirectly: false,
    canRequestSalesCancellation: false,
    canApproveRequests: false,
    canManageCustomers: false,
    canReceiveCreditPayments: false,
    canImportExportExcel: false,
  },
  INVITE: {
    canViewDashboard: true,
    canViewReports: false,
    canViewAuditLog: false,
    canManageUsers: false,
    canManageSettings: false,
    canPerformBackupRestore: false,
    canManageLicensing: false,
    canViewArticles: true,
    canEditArticles: false,
    canFixPrices: false,
    canViewPurchaseCosts: false, // Strict: invité ne voit pas les coûts
    canPerformStockAdjustments: false,
    canManageSuppliers: false,
    canPerformPurchases: false,
    canCancelPurchasesDirectly: false,
    canPerformSales: false,
    canCancelSalesDirectly: false,
    canRequestSalesCancellation: false,
    canApproveRequests: false,
    canManageCustomers: false,
    canReceiveCreditPayments: false,
    canImportExportExcel: false,
  },
};

export function hasPermission(role: Role, permission: keyof Permissions): boolean {
  return ROLE_PERMISSIONS[role]?.[permission] ?? false;
}

export interface LicenseStatus {
  estExpire: boolean;
  estIllimite: boolean;
  joursRestants: number;
  label: string;
  badgeColor: string;
  dateExpirationFormatee: string;
}

/**
 * Calcule le statut de licence/validité temporelle d'un utilisateur
 */
export function getUserLicenseStatus(
  user: { role: Role; dateExpiration?: string | null; estAVie?: boolean },
  licenceGlobaleAVie?: boolean
): LicenseStatus {
  // L'architecte a toujours un accès illimité sans limite de temps
  if (user.role === 'ARCHITECTE') {
    return {
      estExpire: false,
      estIllimite: true,
      joursRestants: 99999,
      label: 'Accès Architecte • Illimité à Vie ♾️',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      dateExpirationFormatee: 'Permanent (Sans expiration)',
    };
  }

  // Si l'architecte a défini la licence à vie pour toute l'entreprise ou cet utilisateur
  if (licenceGlobaleAVie || user.estAVie) {
    return {
      estExpire: false,
      estIllimite: true,
      joursRestants: 99999,
      label: 'Licence à Vie ♾️',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      dateExpirationFormatee: 'Permanent (Accordé à vie)',
    };
  }

  // Si aucune date d'expiration n'est définie (défaut selon le rôle)
  if (!user.dateExpiration) {
    return {
      estExpire: false,
      estIllimite: true,
      joursRestants: 99999,
      label: 'Illimité',
      badgeColor: 'bg-slate-700 text-slate-300 border-slate-600',
      dateExpirationFormatee: 'Illimité',
    };
  }

  const expDate = new Date(user.dateExpiration);
  const now = new Date();
  const diffMs = expDate.getTime() - now.getTime();
  const joursRestants = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const dateFormatee = expDate.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  if (joursRestants <= 0) {
    return {
      estExpire: true,
      estIllimite: false,
      joursRestants: 0,
      label: 'Expiré ⚠️',
      badgeColor: 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse',
      dateExpirationFormatee: `Expiré le ${dateFormatee}`,
    };
  }

  if (joursRestants <= 7) {
    return {
      estExpire: false,
      estIllimite: false,
      joursRestants,
      label: `${joursRestants}j restants ⚠️`,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      dateExpirationFormatee: `Expire le ${dateFormatee}`,
    };
  }

  return {
    estExpire: false,
    estIllimite: false,
    joursRestants,
    label: `${joursRestants} jours`,
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    dateExpirationFormatee: `Expire le ${dateFormatee}`,
  };
}
