/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Stock, Codes & Identification Service
 */

import { storage } from './storage';
import { Article, ArticleStatus, Client, Fournisseur, MouvementStock, User } from '../shared/types';
import { usdToCents } from '../shared/money';

function formatTodayDateNumber(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
}

export const stockService = {
  /**
   * Generates continuous unique invoice number: FAC-AAAAMMJJ-0001
   */
  getNextFactureNumber(): string {
    const params = storage.getParams();
    const nextNum = (params.compteurFacture || 100) + 1;
    storage.updateParams({ compteurFacture: nextNum }, storage.getCurrentUser()!);
    const dateStr = formatTodayDateNumber();
    return `FAC-${dateStr}-${nextNum.toString().padStart(4, '0')}`;
  },

  /**
   * Generates continuous unique purchase number: ACH-AAAAMMJJ-0001
   */
  getNextAchatNumber(): string {
    const params = storage.getParams();
    const nextNum = (params.compteurAchat || 30) + 1;
    storage.updateParams({ compteurAchat: nextNum }, storage.getCurrentUser()!);
    const dateStr = formatTodayDateNumber();
    return `ACH-${dateStr}-${nextNum.toString().padStart(4, '0')}`;
  },

  /**
   * Generates continuous client code: C0001...
   */
  getNextClientCode(): string {
    const params = storage.getParams();
    const nextNum = (params.compteurClient || 10) + 1;
    storage.updateParams({ compteurClient: nextNum }, storage.getCurrentUser()!);
    return `C${nextNum.toString().padStart(4, '0')}`;
  },

  /**
   * Generates continuous supplier code: F0001...
   */
  getNextFournisseurCode(): string {
    const params = storage.getParams();
    const nextNum = (params.compteurFournisseur || 5) + 1;
    storage.updateParams({ compteurFournisseur: nextNum }, storage.getCurrentUser()!);
    return `F${nextNum.toString().padStart(4, '0')}`;
  },

  /**
   * Generates continuous article code: ART0001...
   */
  getNextArticleCode(): string {
    const params = storage.getParams();
    const nextNum = (params.compteurArticle || 10) + 1;
    storage.updateParams({ compteurArticle: nextNum }, storage.getCurrentUser()!);
    return `ART${nextNum.toString().padStart(4, '0')}`;
  },

  /**
   * Gets or automatically creates a client on the fly if not found.
   * Comparison is case-insensitive and ignores superfluous whitespace.
   * Auto-created clients default to PARTICULIER.
   */
  getOrCreateClientByName(rawName: string, actor: User): Client {
    const cleanName = rawName.trim().replace(/\s+/g, ' ');
    const clients = storage.getClients();
    const existing = clients.find(
      c => c.nom.trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (existing) {
      return existing;
    }

    // Auto-create
    const newCode = this.getNextClientCode();
    const newClient: Client = {
      id: newCode,
      code: newCode,
      nom: cleanName.toUpperCase(),
      telephone: '',
      adresse: '',
      type: 'PARTICULIER',
      creditAutorise: usdToCents(200),
      soldeActuelUSD: 0,
      observations: 'Créé automatiquement lors d\'une vente au comptoir',
      creeLe: new Date().toISOString(),
    };

    storage.saveClient(newClient, actor);
    return newClient;
  },

  /**
   * Gets or automatically creates a supplier on the fly if not found.
   */
  getOrCreateFournisseurByName(rawName: string, actor: User): Fournisseur {
    const cleanName = rawName.trim().replace(/\s+/g, ' ');
    const fournisseurs = storage.getFournisseurs();
    const existing = fournisseurs.find(
      f => f.nom.trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (existing) {
      return existing;
    }

    const newCode = this.getNextFournisseurCode();
    const newFournisseur: Fournisseur = {
      id: newCode,
      code: newCode,
      nom: cleanName.toUpperCase(),
      telephone: '',
      adresse: '',
      observations: 'Créé automatiquement lors d\'un bon d\'achat',
      creeLe: new Date().toISOString(),
    };

    storage.saveFournisseur(newFournisseur, actor);
    return newFournisseur;
  },

  /**
   * Computes article stock status:
   * - RUPTURE if stock <= 0
   * - ALERTE if stock <= seuil (article threshold or default threshold)
   * - OK otherwise
   */
  getArticleStatus(article: Article, defaultThreshold: number = 5): ArticleStatus {
    const stock = article.stockActuel ?? 0;
    if (stock <= 0) return 'RUPTURE';
    const threshold = article.seuilAlerte !== undefined && article.seuilAlerte !== null
      ? article.seuilAlerte
      : defaultThreshold;
    if (stock <= threshold) return 'ALERTE';
    return 'OK';
  },

  /**
   * Manually adjust stock with signed quantity and mandatory audit motif
   */
  adjustStock(
    articleId: string,
    deltaQuantity: number,
    motif: string,
    actor: User
  ): { success: boolean; newStock: number; message?: string } {
    if (deltaQuantity === 0) {
      return { success: false, newStock: 0, message: "La quantité d'ajustement ne peut pas être zéro." };
    }
    if (!motif || motif.trim().length < 3) {
      return { success: false, newStock: 0, message: "Un motif explicite est obligatoire pour tout ajustement de stock." };
    }

    const articles = storage.getArticles();
    const article = articles.find(a => a.id === articleId);
    if (!article) {
      return { success: false, newStock: 0, message: "Article introuvable." };
    }

    const oldStock = article.stockActuel;
    const newStock = oldStock + deltaQuantity;
    if (newStock < 0) {
      return { success: false, newStock: oldStock, message: `Stock insuffisant : ajustement impossible (stock actuel: ${oldStock}).` };
    }

    article.stockActuel = newStock;
    storage.saveArticle(article, actor);

    const mvt: MouvementStock = {
      id: `MVT_ADJ_${Date.now()}`,
      date: new Date().toISOString(),
      articleId: article.id,
      articleCode: article.code,
      articleDesignation: article.designation,
      type: 'AJUSTEMENT',
      referenceDoc: `AJUST-${Date.now().toString().slice(-6)}`,
      quantiteSignee: deltaQuantity,
      stockApres: newStock,
      coutUnitaireApplique: article.coutMoyen,
      motif: motif.trim(),
      utilisateurId: actor.id,
      utilisateurNom: actor.nom,
    };
    storage.addMouvement(mvt);

    storage.logAction(
      actor,
      'AJUSTEMENT_STOCK',
      'STOCK',
      article.code,
      `Ajustement ${deltaQuantity > 0 ? '+' : ''}${deltaQuantity} sur ${article.designation}. Ancien stock: ${oldStock}, Nouveau: ${newStock}. Motif: ${motif}`
    );

    return { success: true, newStock };
  },
};
