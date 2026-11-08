/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Purchase & Weighted Average Cost (PUMP) Service
 */

import { storage } from './storage';
import { stockService } from './stockService';
import { calculateNewPUMP } from '../shared/money';
import { Achat, AchatLigne, MouvementStock, User } from '../shared/types';
import { hasPermission } from '../shared/permissions';

export interface PurchaseCartItem {
  articleId: string;
  articleCode: string;
  designation: string;
  quantite: number;
  prixAchatUSD: number; // en cents USD
  prixVenteFixeUSD?: number; // en cents USD (optionnel)
}

export const purchaseService = {
  /**
   * Merges cart items if the same article was entered multiple times,
   * calculating a weighted average purchase price.
   */
  mergeCartItems(items: PurchaseCartItem[]): PurchaseCartItem[] {
    const map = new Map<string, PurchaseCartItem>();

    for (const item of items) {
      if (!map.has(item.articleId)) {
        map.set(item.articleId, { ...item });
      } else {
        const existing = map.get(item.articleId)!;
        const totalQty = existing.quantite + item.quantite;
        const totalCostCents = (existing.quantite * existing.prixAchatUSD) + (item.quantite * item.prixAchatUSD);
        const avgPrice = Math.round(totalCostCents / totalQty);

        map.set(item.articleId, {
          ...existing,
          quantite: totalQty,
          prixAchatUSD: avgPrice,
          prixVenteFixeUSD: item.prixVenteFixeUSD ?? existing.prixVenteFixeUSD,
        });
      }
    }

    return Array.from(map.values());
  },

  /**
   * Validates and records a new purchase transaction atomically.
   */
  createPurchase(
    supplierName: string,
    rawCart: PurchaseCartItem[],
    actor: User,
    invoiceRef?: string
  ): { success: boolean; achat?: Achat; message?: string } {
    if (!hasPermission(actor.role, 'canPerformPurchases')) {
      return { success: false, message: "Vous n'avez pas l'autorisation d'enregistrer des achats." };
    }

    if (!supplierName || supplierName.trim().length === 0) {
      return { success: false, message: "Le nom du fournisseur est obligatoire." };
    }

    if (!rawCart || rawCart.length === 0) {
      return { success: false, message: "Le panier d'achat est vide." };
    }

    // Merge duplicate articles in cart
    const mergedCart = this.mergeCartItems(rawCart);

    // 1. Resolve or auto-create supplier
    const supplier = stockService.getOrCreateFournisseurByName(supplierName, actor);

    // 2. Prepare purchase document
    const achatNumber = stockService.getNextAchatNumber();
    let totalUSD = 0;
    const lignes: AchatLigne[] = [];
    const articles = storage.getArticles();

    // 3. Process each line
    for (const item of mergedCart) {
      const article = articles.find(a => a.id === item.articleId);
      if (!article) {
        return { success: false, message: `Article introuvable: ${item.designation}` };
      }

      if (item.quantite <= 0) {
        return { success: false, message: `Quantité invalide pour ${item.designation}` };
      }
      if (item.prixAchatUSD <= 0) {
        return { success: false, message: `Prix d'achat invalide pour ${item.designation}` };
      }

      const lineTotal = item.quantite * item.prixAchatUSD;
      totalUSD += lineTotal;

      lignes.push({
        articleId: article.id,
        articleCode: article.code,
        designation: article.designation,
        quantite: item.quantite,
        prixAchatUSD: item.prixAchatUSD,
        prixVenteFixeUSD: item.prixVenteFixeUSD,
        totalLigneUSD: lineTotal,
      });

      // Calculate new PUMP BEFORE adding new stock
      const oldStock = article.stockActuel;
      const oldCost = article.coutMoyen;
      const newCost = calculateNewPUMP(
        oldStock,
        oldCost,
        item.quantite,
        item.prixAchatUSD
      );

      // Update article stock
      const newStock = oldStock + item.quantite;
      article.stockActuel = newStock;
      article.coutMoyen = newCost;
      article.fournisseurId = supplier.id;
      article.fournisseurNom = supplier.nom;

      // Update fixed price if provided and user is authorized
      if (item.prixVenteFixeUSD && item.prixVenteFixeUSD > 0 && hasPermission(actor.role, 'canFixPrices')) {
        const oldPrice = article.prixVente;
        article.prixVente = item.prixVenteFixeUSD;
        storage.logAction(
          actor,
          'PRIX_VENTE_MODIFIE_ACHAT',
          'ARTICLES',
          article.code,
          `Prix de vente fixé à $ ${(item.prixVenteFixeUSD / 100).toFixed(2)} lors de l'achat ${achatNumber} (ancien: $ ${((oldPrice || 0) / 100).toFixed(2)})`
        );
      }

      storage.saveArticle(article, actor);

      // Record stock movement
      const mvt: MouvementStock = {
        id: `MVT_ACH_${Date.now()}_${article.id}`,
        date: new Date().toISOString(),
        articleId: article.id,
        articleCode: article.code,
        articleDesignation: article.designation,
        type: 'ACHAT',
        referenceDoc: achatNumber,
        quantiteSignee: item.quantite,
        stockApres: newStock,
        coutUnitaireApplique: newCost,
        utilisateurId: actor.id,
        utilisateurNom: actor.nom,
      };
      storage.addMouvement(mvt);
    }

    // Save final purchase document
    const achat: Achat = {
      id: achatNumber,
      numero: achatNumber,
      date: new Date().toISOString(),
      fournisseurId: supplier.id,
      fournisseurNom: supplier.nom,
      referenceFactureFournisseur: invoiceRef?.trim() || undefined,
      totalUSD,
      statut: 'VALIDE',
      utilisateurId: actor.id,
      utilisateurNom: actor.nom,
      lignes,
    };

    storage.saveAchat(achat);
    storage.logAction(
      actor,
      'ACHAT_VALIDE',
      'ACHATS',
      achatNumber,
      `Achat ${achatNumber} auprès de ${supplier.nom} pour un montant de $ ${(totalUSD / 100).toFixed(2)} (${lignes.length} articles).`
    );

    return { success: true, achat };
  },

  /**
   * Cancels a purchase and deducts the stock
   */
  cancelPurchase(
    purchaseNumber: string,
    reason: string,
    actor: User
  ): { success: boolean; message?: string } {
    if (!hasPermission(actor.role, 'canCancelPurchasesDirectly')) {
      return { success: false, message: "Seul un Administrateur ou Superadmin peut annuler un achat." };
    }

    const achats = storage.getAchats();
    const achat = achats.find(a => a.numero === purchaseNumber);
    if (!achat) {
      return { success: false, message: "Bon d'achat introuvable." };
    }
    if (achat.statut === 'ANNULE') {
      return { success: false, message: "Cet achat est déjà annulé." };
    }

    const articles = storage.getArticles();

    // Verify stock is sufficient to deduct
    for (const ligne of achat.lignes) {
      const article = articles.find(a => a.id === ligne.articleId);
      if (article && article.stockActuel < ligne.quantite) {
        return {
          success: false,
          message: `Annulation impossible : le stock actuel de ${article.designation} (${article.stockActuel}) est inférieur à la quantité achetée (${ligne.quantite}). Une partie a déjà été vendue.`,
        };
      }
    }

    // Deduct stock and record cancellation movements
    for (const ligne of achat.lignes) {
      const article = articles.find(a => a.id === ligne.articleId);
      if (article) {
        const newStock = article.stockActuel - ligne.quantite;
        article.stockActuel = newStock;
        storage.saveArticle(article, actor);

        const mvt: MouvementStock = {
          id: `MVT_ANN_ACH_${Date.now()}_${article.id}`,
          date: new Date().toISOString(),
          articleId: article.id,
          articleCode: article.code,
          articleDesignation: article.designation,
          type: 'ANNULATION',
          referenceDoc: `ANNUL-${purchaseNumber}`,
          quantiteSignee: -ligne.quantite,
          stockApres: newStock,
          coutUnitaireApplique: article.coutMoyen,
          motif: `Annulation achat ${purchaseNumber}: ${reason}`,
          utilisateurId: actor.id,
          utilisateurNom: actor.nom,
        };
        storage.addMouvement(mvt);
      }
    }

    achat.statut = 'ANNULE';
    achat.motifAnnulation = reason;
    storage.updateAchatsList(achats);

    storage.logAction(
      actor,
      'ACHAT_ANNULE',
      'ACHATS',
      purchaseNumber,
      `Annulation du bon d'achat ${purchaseNumber}. Motif: ${reason}`
    );

    return { success: true };
  },
};
