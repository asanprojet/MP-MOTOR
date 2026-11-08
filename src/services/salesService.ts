/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Counter POS Sales, Credit & Invoice Service
 */

import { storage } from './storage';
import { stockService } from './stockService';
import {
  Currency,
  PaymentMethod,
  Vente,
  VenteLigne,
  MouvementStock,
  User,
  PaiementCredit,
  DemandeModification,
} from '../shared/types';
import {
  centsUSDToCDF,
  cdfToCentsUSD,
  computeSellingPriceCents,
} from '../shared/money';
import { hasPermission } from '../shared/permissions';

export interface SaleCartItem {
  articleId: string;
  articleCode: string;
  designation: string;
  quantite: number;
  prixUnitaireUSD: number; // en cents USD
  coutUnitaireUSD: number; // en dix-millièmes USD (gelé)
}

export interface CreateSaleInput {
  clientName: string;
  cart: SaleCartItem[];
  modePaiement: PaymentMethod;
  devise: Currency;
  remiseValue: number; // montant brut de remise saisi par l'utilisateur
  remiseDevise: Currency; // Devise de la remise saisie
  montantRecu: number; // Montant saisi reçu du client dans la devise de paiement
  actor: User;
}

export const salesService = {
  /**
   * Validates and executes a counter sale transaction atomically.
   */
  createSale(input: CreateSaleInput): {
    success: boolean;
    vente?: Vente;
    message?: string;
  } {
    const { clientName, cart, modePaiement, devise, remiseValue, remiseDevise, montantRecu, actor } = input;

    if (!hasPermission(actor.role, 'canPerformSales')) {
      return { success: false, message: "Vous n'avez pas l'autorisation d'effectuer des ventes." };
    }

    if (!clientName || clientName.trim().length === 0) {
      return { success: false, message: "Le nom du client est requis pour la vente." };
    }

    if (!cart || cart.length === 0) {
      return { success: false, message: "Le panier de vente est vide." };
    }

    const params = storage.getParams();
    const rate = params.tauxUSD_CDF;
    const articles = storage.getArticles();

    // 1. Verify stock availability for each item (and sum up duplicates if any)
    const demandPerArticle = new Map<string, number>();
    for (const item of cart) {
      if (item.quantite <= 0) {
        return { success: false, message: `Quantité invalide (<= 0) pour ${item.designation}` };
      }
      const prev = demandPerArticle.get(item.articleId) || 0;
      demandPerArticle.set(item.articleId, prev + item.quantite);
    }

    for (const [articleId, totalRequested] of demandPerArticle.entries()) {
      const art = articles.find(a => a.id === articleId);
      if (!art) {
        return { success: false, message: "Article introuvable dans la base." };
      }
      if (art.stockActuel < totalRequested) {
        return {
          success: false,
          message: `Vente refusée : Stock insuffisant pour « ${art.designation} ». Demandé: ${totalRequested}, Disponible: ${art.stockActuel}.`,
        };
      }
    }

    // 2. Resolve client (auto-creates if non-existent, case-insensitive)
    const client = stockService.getOrCreateClientByName(clientName, actor);

    // 3. Compute Totals in USD cents
    let sousTotalUSD = 0;
    const lignes: VenteLigne[] = [];

    for (const item of cart) {
      const art = articles.find(a => a.id === item.articleId)!;
      // Effective selling price: fixed price or computed via margin
      const unitPriceCents = computeSellingPriceCents(
        art.coutMoyen,
        art.prixVente,
        params.margeDefautPourcent
      );
      const lineTotalUSD = item.quantite * unitPriceCents;
      sousTotalUSD += lineTotalUSD;

      lignes.push({
        articleId: art.id,
        articleCode: art.code,
        designation: art.designation,
        quantite: item.quantite,
        prixUnitaireUSD: unitPriceCents,
        coutUnitaireUSD: art.coutMoyen, // Frozen at moment of sale
        totalLigneUSD: lineTotalUSD,
      });
    }

    // Remise conversion to USD cents
    let remiseCentsUSD = 0;
    if (remiseValue > 0) {
      if (remiseDevise === 'USD') {
        remiseCentsUSD = Math.round(remiseValue * 100);
      } else {
        // Remise in CDF converted to USD cents
        remiseCentsUSD = cdfToCentsUSD(remiseValue, rate);
      }
    }

    // Ensure discount does not exceed subtotal
    remiseCentsUSD = Math.min(remiseCentsUSD, sousTotalUSD);
    const totalUSD = Math.max(0, sousTotalUSD - remiseCentsUSD);
    const totalCDF = centsUSDToCDF(totalUSD, rate);

    // 4. Payment & Change / Balance Calculation
    let monnaieRendue = 0;
    let resteAPayerUSD = 0;

    if (modePaiement === 'CREDIT') {
      // Entire amount to credit, or partial if montantRecu > 0
      let receivedCentsUSD = 0;
      if (montantRecu > 0) {
        receivedCentsUSD = devise === 'USD' ? Math.round(montantRecu * 100) : cdfToCentsUSD(montantRecu, rate);
      }
      resteAPayerUSD = Math.max(0, totalUSD - receivedCentsUSD);
      monnaieRendue = 0;

      // Check credit limit if parameter is blocking
      if (params.bloquerCreditClient) {
        const potentialDebt = client.soldeActuelUSD + resteAPayerUSD;
        if (potentialDebt > client.creditAutorise) {
          const limitStr = (client.creditAutorise / 100).toFixed(2);
          const currentDebtStr = (client.soldeActuelUSD / 100).toFixed(2);
          return {
            success: false,
            message: `Crédit bloqué : Dépassement du plafond autorisé ($ ${limitStr}). Dette actuelle: $ ${currentDebtStr}.`,
          };
        }
      }
    } else {
      // Cash / Electronic payment
      if (devise === 'USD') {
        const receivedCents = Math.round((montantRecu || 0) * 100);
        if (receivedCents >= totalUSD) {
          monnaieRendue = (receivedCents - totalUSD) / 100;
          resteAPayerUSD = 0;
        } else {
          // Partial payment
          resteAPayerUSD = totalUSD - receivedCents;
          monnaieRendue = 0;
        }
      } else {
        // Devise CDF
        const receivedCDF = Math.round(montantRecu || 0);
        if (receivedCDF >= totalCDF) {
          monnaieRendue = receivedCDF - totalCDF;
          resteAPayerUSD = 0;
        } else {
          const missingCDF = totalCDF - receivedCDF;
          resteAPayerUSD = cdfToCentsUSD(missingCDF, rate);
          monnaieRendue = 0;
        }
      }
    }

    // 5. Generate Invoice Number
    const invoiceNumber = stockService.getNextFactureNumber();

    // 6. Deduct stock & create stock movements
    for (const ligne of lignes) {
      const art = articles.find(a => a.id === ligne.articleId)!;
      const oldStock = art.stockActuel;
      const newStock = oldStock - ligne.quantite;
      art.stockActuel = newStock;
      storage.saveArticle(art, actor);

      const mvt: MouvementStock = {
        id: `MVT_VTE_${Date.now()}_${art.id}`,
        date: new Date().toISOString(),
        articleId: art.id,
        articleCode: art.code,
        articleDesignation: art.designation,
        type: 'VENTE',
        referenceDoc: invoiceNumber,
        quantiteSignee: -ligne.quantite,
        stockApres: newStock,
        coutUnitaireApplique: ligne.coutUnitaireUSD,
        utilisateurId: actor.id,
        utilisateurNom: actor.nom,
      };
      storage.addMouvement(mvt);
    }

    // 7. Update client credit balance if there is a remaining debt
    if (resteAPayerUSD > 0) {
      client.soldeActuelUSD += resteAPayerUSD;
      storage.saveClient(client);
    }

    // 8. Create Vente record
    const vente: Vente = {
      id: invoiceNumber,
      numero: invoiceNumber,
      date: new Date().toISOString(),
      clientId: client.id,
      clientNom: client.nom,
      modePaiement,
      devise,
      tauxUSD_CDF: rate, // FROZEN FOR HISTORY
      sousTotalUSD,
      remiseUSD: remiseCentsUSD,
      totalUSD,
      totalCDF,
      montantRecu,
      monnaieRendue,
      resteAPayerUSD,
      statut: 'VALIDE',
      utilisateurId: actor.id,
      utilisateurNom: actor.nom,
      lignes,
    };

    storage.saveVente(vente);
    storage.logAction(
      actor,
      'VENTE_VALIDEE',
      'VENTES',
      invoiceNumber,
      `Vente ${invoiceNumber} au client ${client.nom} : Total $ ${(totalUSD / 100).toFixed(2)} (${totalCDF.toLocaleString('fr-FR')} FC) [${modePaiement}]`
    );

    return { success: true, vente };
  },

  /**
   * Cancel an invoice directly (Admin / Superadmin)
   */
  cancelSaleDirect(
    invoiceNumber: string,
    reason: string,
    actor: User
  ): { success: boolean; message?: string } {
    if (!hasPermission(actor.role, 'canCancelSalesDirectly')) {
      return { success: false, message: "Vous n'avez pas le droit d'annuler directement une facture." };
    }

    const ventes = storage.getVentes();
    const vente = ventes.find(v => v.numero === invoiceNumber);
    if (!vente) {
      return { success: false, message: "Facture introuvable." };
    }
    if (vente.statut === 'ANNULE') {
      return { success: false, message: "Cette facture est déjà annulée." };
    }

    const articles = storage.getArticles();

    // 1. Restore stock for each line
    for (const ligne of vente.lignes) {
      const art = articles.find(a => a.id === ligne.articleId);
      if (art) {
        const newStock = art.stockActuel + ligne.quantite;
        art.stockActuel = newStock;
        storage.saveArticle(art, actor);

        const mvt: MouvementStock = {
          id: `MVT_ANN_VTE_${Date.now()}_${art.id}`,
          date: new Date().toISOString(),
          articleId: art.id,
          articleCode: art.code,
          articleDesignation: art.designation,
          type: 'ANNULATION',
          referenceDoc: `ANNUL-${invoiceNumber}`,
          quantiteSignee: +ligne.quantite,
          stockApres: newStock,
          coutUnitaireApplique: ligne.coutUnitaireUSD,
          motif: `Annulation vente ${invoiceNumber}: ${reason}`,
          utilisateurId: actor.id,
          utilisateurNom: actor.nom,
        };
        storage.addMouvement(mvt);
      }
    }

    // 2. Reverse customer debt if there was remaining balance
    if (vente.resteAPayerUSD > 0) {
      const clients = storage.getClients();
      const client = clients.find(c => c.id === vente.clientId);
      if (client) {
        client.soldeActuelUSD = Math.max(0, client.soldeActuelUSD - vente.resteAPayerUSD);
        storage.saveClient(client);
      }
    }

    vente.statut = 'ANNULE';
    vente.motifAnnulation = reason;
    storage.updateVentesList(ventes);

    storage.logAction(
      actor,
      'VENTE_ANNULEE',
      'VENTES',
      invoiceNumber,
      `Annulation de la facture ${invoiceNumber}. Motif: ${reason}`
    );

    return { success: true };
  },

  /**
   * Caissier requests an invoice cancellation or modification
   */
  requestSaleCancellation(
    invoiceNumber: string,
    reason: string,
    actor: User
  ): { success: boolean; message?: string } {
    const ventes = storage.getVentes();
    const vente = ventes.find(v => v.numero === invoiceNumber);
    if (!vente) {
      return { success: false, message: "Facture introuvable." };
    }
    if (vente.statut === 'ANNULE') {
      return { success: false, message: "Cette facture est déjà annulée." };
    }

    const demande: DemandeModification = {
      id: `DEM_${Date.now()}`,
      date: new Date().toISOString(),
      type: 'ANNULATION_FACTURE',
      referenceDoc: invoiceNumber,
      motif: reason,
      demandeurId: actor.id,
      demandeurNom: actor.nom,
      statut: 'EN_ATTENTE',
    };

    storage.saveDemande(demande);
    storage.logAction(
      actor,
      'DEMANDE_ANNULATION_SOUMISE',
      'DEMANDES',
      invoiceNumber,
      `Demande d'annulation soumise pour la facture ${invoiceNumber} par ${actor.nom}. Motif: ${reason}`
    );

    return { success: true, message: "Demande transmise au Gérant pour approbation." };
  },

  /**
   * Process a customer credit payment (Encaissement partiel ou total)
   */
  recordCreditPayment(
    clientId: string,
    amountUSD: number, // en cents USD
    devise: Currency,
    amountRaw: number,
    modePaiement: PaymentMethod,
    note: string,
    actor: User
  ): { success: boolean; paiement?: PaiementCredit; message?: string } {
    if (!hasPermission(actor.role, 'canReceiveCreditPayments')) {
      return { success: false, message: "Vous n'avez pas l'autorisation d'encaisser des paiements de crédit." };
    }

    const clients = storage.getClients();
    const client = clients.find(c => c.id === clientId);
    if (!client) {
      return { success: false, message: "Client introuvable." };
    }

    if (amountUSD <= 0) {
      return { success: false, message: "Le montant du versement doit être supérieur à zéro." };
    }

    const params = storage.getParams();
    const rate = params.tauxUSD_CDF;
    const soldeAvant = client.soldeActuelUSD;
    const soldeApres = Math.max(0, soldeAvant - amountUSD);

    client.soldeActuelUSD = soldeApres;
    storage.saveClient(client);

    const montantCDF = centsUSDToCDF(amountUSD, rate);

    const paiement: PaiementCredit = {
      id: `PAY_${Date.now()}`,
      date: new Date().toISOString(),
      clientId: client.id,
      clientNom: client.nom,
      montantUSD: amountUSD,
      montantCDF,
      devise,
      tauxUSD_CDF: rate,
      modePaiement,
      soldeAvantUSD: soldeAvant,
      soldeApresUSD: soldeApres,
      note: note.trim() || undefined,
      utilisateurId: actor.id,
      utilisateurNom: actor.nom,
    };

    storage.addPaiementCredit(paiement);
    storage.logAction(
      actor,
      'PAIEMENT_CREDIT_ENCAISSE',
      'CREDITS',
      client.code,
      `Encaissement crédit de $ ${(amountUSD / 100).toFixed(2)} pour ${client.nom} [${modePaiement}]. Nouveau solde: $ ${(soldeApres / 100).toFixed(2)}`
    );

    return { success: true, paiement };
  },
};
