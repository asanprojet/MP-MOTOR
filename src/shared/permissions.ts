/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Role Permissions Matrix
 */

import { Role } from './types';

export interface Permissions {
  canViewDashboard: boolean;
  canViewReports: boolean;
  canViewAuditLog: boolean; // SUPERADMIN only
  canManageUsers: boolean; // SUPERADMIN, ADMIN
  canManageSettings: boolean; // SUPERADMIN, ADMIN
  canPerformBackupRestore: boolean; // SUPERADMIN, ADMIN
  
  // Articles & Prices
  canViewArticles: boolean;
  canEditArticles: boolean;
  canFixPrices: boolean; // SUPERADMIN, ADMIN
  canViewPurchaseCosts: boolean; // SUPERADMIN, ADMIN, MAGASINIER, COMPTABLE (CAISSIER must NEVER see costs)

  // Stock
  canPerformStockAdjustments: boolean; // SUPERADMIN, ADMIN, MAGASINIER
  canManageSuppliers: boolean; // SUPERADMIN, ADMIN, MAGASINIER
  
  // Purchases
  canPerformPurchases: boolean; // SUPERADMIN, ADMIN, MAGASINIER
  canCancelPurchasesDirectly: boolean; // SUPERADMIN, ADMIN

  // Sales & POS
  canPerformSales: boolean; // SUPERADMIN, ADMIN, CAISSIER
  canCancelSalesDirectly: boolean; // SUPERADMIN, ADMIN
  canRequestSalesCancellation: boolean; // CAISSIER
  canApproveRequests: boolean; // SUPERADMIN, ADMIN

  // Customers & Credits
  canManageCustomers: boolean;
  canReceiveCreditPayments: boolean; // SUPERADMIN, ADMIN, CAISSIER
  
  // Import / Export
  canImportExportExcel: boolean; // SUPERADMIN, ADMIN
}

export const ROLE_PERMISSIONS: Record<Role, Permissions> = {
  SUPERADMIN: {
    canViewDashboard: true,
    canViewReports: true,
    canViewAuditLog: true,
    canManageUsers: true,
    canManageSettings: true,
    canPerformBackupRestore: true,
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
    canViewAuditLog: false, // Superadmin only
    canManageUsers: true,
    canManageSettings: true,
    canPerformBackupRestore: true,
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
    canViewArticles: true,
    canEditArticles: true,
    canFixPrices: false, // Cannot fix selling prices
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
    canViewArticles: true,
    canEditArticles: false,
    canFixPrices: false,
    canViewPurchaseCosts: false, // STRICT RULE: Caissier never sees purchase cost
    canPerformStockAdjustments: false,
    canManageSuppliers: false,
    canPerformPurchases: false,
    canCancelPurchasesDirectly: false,
    canPerformSales: true,
    canCancelSalesDirectly: false,
    canRequestSalesCancellation: true, // Must submit modification request
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
    canViewArticles: true,
    canEditArticles: false,
    canFixPrices: false,
    canViewPurchaseCosts: true, // Read-only costs for margin verification
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
