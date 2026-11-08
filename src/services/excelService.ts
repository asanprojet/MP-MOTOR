/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Excel / CSV Import & Export Service
 * 
 * Rules:
 * - Generates clean downloadable templates with columns and instructions
 * - Strict line-by-line validation
 * - "Tout ou Rien" (All-or-Nothing) import: any error aborts and reports exact line issues
 * - Full support for Articles, Clients, Fournisseurs and Ventes (Factures)
 */

import { storage } from './storage';
import { stockService } from './stockService';
import {
  Article,
  Client,
  Fournisseur,
  Vente,
  VenteLigne,
  MouvementStock,
  PaymentMethod,
  Currency,
  User,
} from '../shared/types';
import {
  usdToCents,
  usdToDixMillieme,
  centsUSDToCDF,
  cdfToCentsUSD,
  formatUSD,
  computeSellingPriceCents,
} from '../shared/money';

export interface ImportError {
  ligne: number;
  colonne?: string;
  message: string;
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  errors: ImportError[];
}

export const excelService = {
  /**
   * Generates a template CSV string that opens seamlessly in Microsoft Excel
   */
  generateTemplate(type: 'ARTICLES' | 'CLIENTS' | 'FOURNISSEURS' | 'VENTES'): {
    filename: string;
    content: string;
  } {
    let filename = '';
    let content = '';

    if (type === 'ARTICLES') {
      filename = 'Modele_Import_Articles_MP_MOTORS.csv';
      const header = 'Designation;Categorie;MarqueVehicule;StockInitial;CoutAchatUSD;PrixVenteUSD;SeuilAlerte;CodeBarre;Observations';
      const row1 = 'Plaquettes de frein AV Hilux;Freinage;Toyota Hilux;20;25.50;35.00;5;04465-0K090;Origine Japon';
      const row2 = 'Filtre a huile 1HZ;Filtration;Land Cruiser;50;6.80;;10;90915-30002;Prix vente auto calcule';
      content = `\uFEFF${header}\n${row1}\n${row2}\n`;
    } else if (type === 'CLIENTS') {
      filename = 'Modele_Import_Clients_MP_MOTORS.csv';
      const header = 'Nom;Telephone;Adresse;Type;CreditAutoriseUSD;Observations';
      const row1 = 'GARAGE CENTRAL GOMBE;+243812345678;Av. Wagenia 45, Gombe;GARAGE;1500;Client regulier';
      const row2 = 'M. KABEYA ALAIN;+243991234567;Kintambo Magasin;PARTICULIER;200;Paiement comptant';
      content = `\uFEFF${header}\n${row1}\n${row2}\n`;
    } else if (type === 'FOURNISSEURS') {
      filename = 'Modele_Import_Fournisseurs_MP_MOTORS.csv';
      const header = 'Nom;Telephone;Adresse;Email;Observations';
      const row1 = 'CFAO MOBILITY RDC;+243815550101;Bd Lumumba Limete;pieces@cfaomobility.cd;Concessionnaire officiel';
      const row2 = 'DUBAI AUTO EXPORT;+97148881234;Al Aweer Market Dubai;sales@dubaiauto.ae;Expedition maritime';
      content = `\uFEFF${header}\n${row1}\n${row2}\n`;
    } else {
      // VENTES (Factures)
      filename = 'Modele_Import_Ventes_MP_MOTORS.csv';
      const header = 'NumeroFacture;Date;ClientNom;ArticleCode;Quantite;PrixUnitaireUSD;RemiseUSD;ModePaiement;Devise;TauxUSD_CDF';
      const row1 = 'FAC-20250120-0001;2025-01-20 10:30;GARAGE CENTRAL GOMBE;ART0001;2;35.00;0;ESPECES;USD;2850';
      const row2 = 'FAC-20250120-0001;2025-01-20 10:30;GARAGE CENTRAL GOMBE;ART0002;3;12.00;0;ESPECES;USD;2850';
      const row3 = 'FAC-20250120-0002;2025-01-20 14:15;M. JEAN BOSCO;ART0005;1;45.00;5.00;CREDIT;USD;2850';
      content = `\uFEFF${header}\n${row1}\n${row2}\n${row3}\n`;
    }

    return { filename, content };
  },

  /**
   * Download CSV directly in browser
   */
  downloadCSV(filename: string, content: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Parses CSV string, supporting either semicolon (;) or comma (,) separator
   */
  parseCSVRows(csvText: string): string[][] {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) return [];

    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' : ',';

    return lines.map(line => {
      return line.split(separator).map(cell => cell.trim().replace(/^["']|["']$/g, ''));
    });
  },

  /**
   * Import Articles (Tout ou Rien)
   */
  importArticles(csvText: string, actor: User): ImportResult {
    const rows = this.parseCSVRows(csvText);
    const errors: ImportError[] = [];

    if (rows.length <= 1) {
      return {
        success: false,
        importedCount: 0,
        errors: [{ ligne: 1, message: "Le fichier est vide ou ne contient aucune ligne de données." }],
      };
    }

    const newArticles: Article[] = [];
    const existing = storage.getArticles();

    for (let i = 1; i < rows.length; i++) {
      const lineNum = i + 1;
      const cols = rows[i];

      const designation = cols[0] || '';
      const categorie = cols[1] || 'Divers';
      const marqueVehicule = cols[2] || 'Universel';
      const stockStr = cols[3] || '0';
      const coutStr = cols[4] || '0';
      const prixVenteStr = cols[5] || '';
      const seuilStr = cols[6] || '5';
      const codeBarre = cols[7] || '';
      const observations = cols[8] || '';

      if (!designation || designation.trim().length < 2) {
        errors.push({ ligne: lineNum, colonne: 'Designation', message: "La désignation de l'article est obligatoire." });
      }

      const stock = parseInt(stockStr, 10);
      if (isNaN(stock) || stock < 0) {
        errors.push({ ligne: lineNum, colonne: 'StockInitial', message: "Le stock initial doit être un entier positif ou nul." });
      }

      const coutDecimal = parseFloat(coutStr.replace(',', '.'));
      if (isNaN(coutDecimal) || coutDecimal < 0) {
        errors.push({ ligne: lineNum, colonne: 'CoutAchatUSD', message: "Le coût d'achat en USD doit être un nombre positif ou nul." });
      }

      let prixVenteCents: number | undefined = undefined;
      if (prixVenteStr.trim().length > 0) {
        const p = parseFloat(prixVenteStr.replace(',', '.'));
        if (isNaN(p) || p <= 0) {
          errors.push({ ligne: lineNum, colonne: 'PrixVenteUSD', message: "Le prix de vente fixé doit être supérieur à zéro." });
        } else {
          prixVenteCents = usdToCents(p);
        }
      }

      const seuil = parseInt(seuilStr, 10);
      if (isNaN(seuil) || seuil < 0) {
        errors.push({ ligne: lineNum, colonne: 'SeuilAlerte', message: "Le seuil d'alerte doit être un nombre entier positif ou nul." });
      }

      if (newArticles.some(a => a.designation.toLowerCase() === designation.toLowerCase())) {
        errors.push({ ligne: lineNum, colonne: 'Designation', message: `Doublon dans le fichier : « ${designation} » existe déjà dans ce fichier.` });
      }

      if (errors.length === 0) {
        const code = stockService.getNextArticleCode();
        const art: Article = {
          id: code,
          code,
          designation,
          categorie,
          marqueVehicule,
          stockInitial: stock,
          stockActuel: stock,
          coutMoyen: usdToDixMillieme(coutDecimal),
          prixVente: prixVenteCents,
          seuilAlerte: seuil,
          codeBarre: codeBarre || undefined,
          observations: observations || undefined,
          derniereMiseAJour: new Date().toISOString(),
        };
        newArticles.push(art);
      }
    }

    if (errors.length > 0) {
      return { success: false, importedCount: 0, errors };
    }

    const allArticles = [...existing, ...newArticles];
    storage.updateArticlesList(allArticles);
    storage.logAction(
      actor,
      'IMPORT_EXCEL_ARTICLES',
      'ARTICLES',
      undefined,
      `Importation réussie de ${newArticles.length} articles par fichier CSV/Excel.`
    );

    return { success: true, importedCount: newArticles.length, errors: [] };
  },

  /**
   * Import Ventes & Factures (Tout ou Rien)
   * Groups rows with the same NumeroFacture into a single invoice with multiple lines.
   */
  importVentes(csvText: string, actor: User): ImportResult {
    const rows = this.parseCSVRows(csvText);
    const errors: ImportError[] = [];

    if (rows.length <= 1) {
      return {
        success: false,
        importedCount: 0,
        errors: [{ ligne: 1, message: "Le fichier de ventes est vide ou ne contient aucune ligne de données." }],
      };
    }

    const existingVentes = storage.getVentes();
    const articles = storage.getArticles();
    const params = storage.getParams();

    // Map to group rows by invoice number
    // key: invoice number (or fallback)
    interface ParsedInvoiceRow {
      lineNum: number;
      numeroFacture: string;
      dateStr: string;
      clientNom: string;
      articleCode: string;
      article: Article;
      quantite: number;
      prixUnitaireUSD: number; // in cents
      remiseUSD: number; // in cents
      modePaiement: PaymentMethod;
      devise: Currency;
      tauxUSD_CDF: number;
    }

    const parsedRows: ParsedInvoiceRow[] = [];

    const validPaymentModes: PaymentMethod[] = [
      'ESPECES',
      'M_PESA',
      'AIRTEL_MONEY',
      'ORANGE_MONEY',
      'VIREMENT',
      'CREDIT',
    ];

    for (let i = 1; i < rows.length; i++) {
      const lineNum = i + 1;
      const cols = rows[i];

      const numeroFacture = cols[0] || `FAC-IMP-${Date.now().toString().slice(-6)}-${i.toString().padStart(3, '0')}`;
      const dateStr = cols[1] || new Date().toISOString();
      const clientNom = (cols[2] || 'CLIENT COMPTOIR').trim();
      const articleCodeOrName = (cols[3] || '').trim();
      const quantiteStr = cols[4] || '1';
      const prixUnitaireStr = cols[5] || '';
      const remiseStr = cols[6] || '0';
      const rawMode = (cols[7] || 'ESPECES').trim().toUpperCase().replace(/\s+/g, '_');
      const devise = (cols[8] || 'USD').trim().toUpperCase() === 'CDF' ? 'CDF' : 'USD';
      const tauxStr = cols[9] || params.tauxUSD_CDF.toString();

      if (!articleCodeOrName) {
        errors.push({ ligne: lineNum, colonne: 'ArticleCode', message: "Le code ou désignation de l'article est obligatoire." });
        continue;
      }

      // Find article
      const art = articles.find(
        a =>
          a.code.toLowerCase() === articleCodeOrName.toLowerCase() ||
          a.designation.toLowerCase() === articleCodeOrName.toLowerCase() ||
          (a.codeBarre && a.codeBarre.toLowerCase() === articleCodeOrName.toLowerCase())
      );

      if (!art) {
        errors.push({
          ligne: lineNum,
          colonne: 'ArticleCode',
          message: `Article « ${articleCodeOrName} » introuvable dans le catalogue. Veuillez d'abord créer ou importer cet article.`,
        });
        continue;
      }

      const qte = parseInt(quantiteStr, 10);
      if (isNaN(qte) || qte <= 0) {
        errors.push({ ligne: lineNum, colonne: 'Quantite', message: "La quantité vendue doit être un nombre entier supérieur à 0." });
        continue;
      }

      let unitPriceCents = 0;
      if (prixUnitaireStr.trim().length > 0) {
        const p = parseFloat(prixUnitaireStr.replace(',', '.'));
        if (isNaN(p) || p <= 0) {
          errors.push({ ligne: lineNum, colonne: 'PrixUnitaireUSD', message: "Le prix unitaire en USD doit être supérieur à 0." });
          continue;
        }
        unitPriceCents = usdToCents(p);
      } else {
        unitPriceCents = computeSellingPriceCents(art.coutMoyen, art.prixVente, params.margeDefautPourcent);
      }

      const remiseDecimal = parseFloat(remiseStr.replace(',', '.')) || 0;
      const remiseCents = usdToCents(remiseDecimal);

      const modePaiement = validPaymentModes.includes(rawMode as PaymentMethod)
        ? (rawMode as PaymentMethod)
        : 'ESPECES';

      const taux = parseInt(tauxStr, 10) || params.tauxUSD_CDF;

      parsedRows.push({
        lineNum,
        numeroFacture,
        dateStr,
        clientNom,
        articleCode: art.code,
        article: art,
        quantite: qte,
        prixUnitaireUSD: unitPriceCents,
        remiseUSD: remiseCents,
        modePaiement,
        devise,
        tauxUSD_CDF: taux,
      });
    }

    if (errors.length > 0) {
      return { success: false, importedCount: 0, errors };
    }

    // Group rows by invoice number
    const invoiceGroups = new Map<string, ParsedInvoiceRow[]>();
    for (const r of parsedRows) {
      const list = invoiceGroups.get(r.numeroFacture) || [];
      list.push(r);
      invoiceGroups.set(r.numeroFacture, list);
    }

    const newVentes: Vente[] = [];

    // Process each invoice group
    for (const [invoiceNum, rowsInInvoice] of invoiceGroups.entries()) {
      const firstRow = rowsInInvoice[0];
      const client = stockService.getOrCreateClientByName(firstRow.clientNom, actor);

      let sousTotalUSD = 0;
      let totalRemiseUSD = 0;
      const lignes: VenteLigne[] = [];

      for (const row of rowsInInvoice) {
        const lineTotal = row.quantite * row.prixUnitaireUSD;
        sousTotalUSD += lineTotal;
        totalRemiseUSD += row.remiseUSD;

        lignes.push({
          articleId: row.article.id,
          articleCode: row.article.code,
          designation: row.article.designation,
          quantite: row.quantite,
          prixUnitaireUSD: row.prixUnitaireUSD,
          coutUnitaireUSD: row.article.coutMoyen, // Frozen cost
          totalLigneUSD: lineTotal,
        });

        // Deduct stock and record stock movement
        const art = articles.find(a => a.id === row.article.id);
        if (art) {
          const newStock = art.stockActuel - row.quantite;
          art.stockActuel = newStock;
          storage.saveArticle(art, actor);

          const mvt: MouvementStock = {
            id: `MVT_IMP_${Date.now()}_${art.id}_${Math.random().toString(36).substring(7)}`,
            date: row.dateStr,
            articleId: art.id,
            articleCode: art.code,
            articleDesignation: art.designation,
            type: 'VENTE',
            referenceDoc: invoiceNum,
            quantiteSignee: -row.quantite,
            stockApres: newStock,
            coutUnitaireApplique: art.coutMoyen,
            motif: 'Importation historique de ventes Excel',
            utilisateurId: actor.id,
            utilisateurNom: actor.nom,
          };
          storage.addMouvement(mvt);
        }
      }

      const totalUSD = Math.max(0, sousTotalUSD - totalRemiseUSD);
      const totalCDF = centsUSDToCDF(totalUSD, firstRow.tauxUSD_CDF);
      const resteAPayerUSD = firstRow.modePaiement === 'CREDIT' ? totalUSD : 0;

      if (resteAPayerUSD > 0) {
        client.soldeActuelUSD += resteAPayerUSD;
        storage.saveClient(client);
      }

      const vente: Vente = {
        id: invoiceNum,
        numero: invoiceNum,
        date: firstRow.dateStr,
        clientId: client.id,
        clientNom: client.nom,
        modePaiement: firstRow.modePaiement,
        devise: firstRow.devise,
        tauxUSD_CDF: firstRow.tauxUSD_CDF,
        sousTotalUSD,
        remiseUSD: totalRemiseUSD,
        totalUSD,
        totalCDF,
        montantRecu: totalUSD / 100,
        monnaieRendue: 0,
        resteAPayerUSD,
        statut: 'VALIDE',
        utilisateurId: actor.id,
        utilisateurNom: actor.nom,
        lignes,
      };

      newVentes.push(vente);
    }

    // Save all imported invoices
    const allVentes = [...newVentes, ...existingVentes];
    storage.updateVentesList(allVentes);

    storage.logAction(
      actor,
      'IMPORT_EXCEL_VENTES',
      'VENTES',
      undefined,
      `Importation réussie de ${newVentes.length} factures (${parsedRows.length} lignes d'articles).`
    );

    return {
      success: true,
      importedCount: newVentes.length,
      errors: [],
    };
  },

  /**
   * Export all articles as CSV
   */
  exportArticlesCSV(): void {
    const articles = storage.getArticles();
    const params = storage.getParams();
    const header = 'Code;Designation;Categorie;MarqueVehicule;StockActuel;Statut;CoutMoyenUSD;PrixVenteUSD;SeuilAlerte;Fournisseur;CodeBarre\n';
    const rows = articles
      .map(a => {
        const status = stockService.getArticleStatus(a, params.seuilAlerteDefaut);
        const coutStr = (a.coutMoyen / 10000).toFixed(4);
        const prixStr = a.prixVente ? (a.prixVente / 100).toFixed(2) : 'Calculé auto';
        return `"${a.code}";"${a.designation}";"${a.categorie}";"${a.marqueVehicule}";${a.stockActuel};"${status}";"${coutStr}";"${prixStr}";${a.seuilAlerte ?? params.seuilAlerteDefaut};"${a.fournisseurNom || ''}";"${a.codeBarre || ''}"`;
      })
      .join('\n');

    this.downloadCSV(`Export_Articles_MP_MOTORS_${Date.now()}.csv`, `\uFEFF${header}${rows}`);
  },

  /**
   * Export sales summary list as CSV
   */
  exportVentesCSV(): void {
    const ventes = storage.getVentes();
    const header = 'NumeroFacture;Date;Client;ModePaiement;Devise;TauxUSD_CDF;TotalUSD;TotalCDF;ResteAPayerUSD;Statut;Caissier\n';
    const rows = ventes
      .map(v => {
        const totalUSDStr = (v.totalUSD / 100).toFixed(2);
        const resteUSDStr = (v.resteAPayerUSD / 100).toFixed(2);
        return `"${v.numero}";"${v.date}";"${v.clientNom}";"${v.modePaiement}";"${v.devise}";${v.tauxUSD_CDF};"${totalUSDStr}";${v.totalCDF};"${resteUSDStr}";"${v.statut}";"${v.utilisateurNom}"`;
      })
      .join('\n');

    this.downloadCSV(`Export_Ventes_Factures_MP_MOTORS_${Date.now()}.csv`, `\uFEFF${header}${rows}`);
  },

  /**
   * Export detailed sales items breakdown (chaque ligne d'article vendue avec prix, coût et marge)
   */
  exportVentesDetailleesCSV(): void {
    const ventes = storage.getVentes();
    const header = 'NumeroFacture;Date;Client;ArticleCode;Designation;Quantite;PrixUnitaireUSD;TotalLigneUSD;CoutUnitaireUSD;MargeLigneUSD;ModePaiement;Devise;Caissier\n';
    const rows: string[] = [];

    for (const v of ventes) {
      for (const l of v.lignes) {
        const puStr = (l.prixUnitaireUSD / 100).toFixed(2);
        const totalLigneStr = (l.totalLigneUSD / 100).toFixed(2);
        const coutUnitStr = (l.coutUnitaireUSD / 10000).toFixed(4);
        const coutTotalCents = Math.round((l.quantite * l.coutUnitaireUSD) / 100);
        const margeLigneStr = ((l.totalLigneUSD - coutTotalCents) / 100).toFixed(2);

        rows.push(
          `"${v.numero}";"${v.date}";"${v.clientNom}";"${l.articleCode}";"${l.designation}";${l.quantite};"${puStr}";"${totalLigneStr}";"${coutUnitStr}";"${margeLigneStr}";"${v.modePaiement}";"${v.devise}";"${v.utilisateurNom}"`
        );
      }
    }

    this.downloadCSV(
      `Export_Ventes_Lignes_Detaillees_MP_MOTORS_${Date.now()}.csv`,
      `\uFEFF${header}${rows.join('\n')}`
    );
  },
};
