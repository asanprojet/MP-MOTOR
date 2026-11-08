/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Excel / CSV Import & Export Service
 * 
 * Rules:
 * - Generates clean downloadable templates with columns and instructions
 * - Strict line-by-line validation
 * - "Tout ou Rien" (All-or-Nothing) import: any error aborts and reports exact line issues
 */

import { storage } from './storage';
import { stockService } from './stockService';
import { Article, Client, Fournisseur, User } from '../shared/types';
import { usdToCents, usdToDixMillieme, formatUSD } from '../shared/money';

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
  generateTemplate(type: 'ARTICLES' | 'CLIENTS' | 'FOURNISSEURS'): { filename: string; content: string } {
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
    } else {
      filename = 'Modele_Import_Fournisseurs_MP_MOTORS.csv';
      const header = 'Nom;Telephone;Adresse;Email;Observations';
      const row1 = 'CFAO MOBILITY RDC;+243815550101;Bd Lumumba Limete;pieces@cfaomobility.cd;Concessionnaire officiel';
      const row2 = 'DUBAI AUTO EXPORT;+97148881234;Al Aweer Market Dubai;sales@dubaiauto.ae;Expedition maritime';
      content = `\uFEFF${header}\n${row1}\n${row2}\n`;
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

    // Detect separator
    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' : ',';

    return lines.map(line => {
      // Split preserving simple CSV
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

    // Check lines from line 2 (skip header)
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

      // Check duplicate designation in file
      if (newArticles.some(a => a.designation.toLowerCase() === designation.toLowerCase())) {
        errors.push({ ligne: lineNum, colonne: 'Designation', message: `Doublon dans le fichier : « ${designation} » existe déjà dans ce même fichier.` });
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

    // TOUT OU RIEN : If any error, reject immediately and do NOT write anything
    if (errors.length > 0) {
      return {
        success: false,
        importedCount: 0,
        errors,
      };
    }

    // Save all
    const allArticles = [...existing, ...newArticles];
    storage.updateArticlesList(allArticles);
    storage.logAction(
      actor,
      'IMPORT_EXCEL_ARTICLES',
      'ARTICLES',
      undefined,
      `Importation réussie de ${newArticles.length} articles par fichier CSV/Excel.`
    );

    return {
      success: true,
      importedCount: newArticles.length,
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
    const rows = articles.map(a => {
      const status = stockService.getArticleStatus(a, params.seuilAlerteDefaut);
      const coutStr = (a.coutMoyen / 10000).toFixed(4);
      const prixStr = a.prixVente ? (a.prixVente / 100).toFixed(2) : 'Calculé auto';
      return `"${a.code}";"${a.designation}";"${a.categorie}";"${a.marqueVehicule}";${a.stockActuel};"${status}";"${coutStr}";"${prixStr}";${a.seuilAlerte ?? params.seuilAlerteDefaut};"${a.fournisseurNom || ''}";"${a.codeBarre || ''}"`;
    }).join('\n');

    this.downloadCSV(`Export_Articles_MP_MOTORS_${Date.now()}.csv`, `\uFEFF${header}${rows}`);
  },

  /**
   * Export sales history as CSV
   */
  exportVentesCSV(): void {
    const ventes = storage.getVentes();
    const header = 'NumeroFacture;Date;Client;ModePaiement;Devise;TauxUSD_CDF;TotalUSD;TotalCDF;ResteAPayerUSD;Statut;Caissier\n';
    const rows = ventes.map(v => {
      const totalUSDStr = (v.totalUSD / 100).toFixed(2);
      const resteUSDStr = (v.resteAPayerUSD / 100).toFixed(2);
      return `"${v.numero}";"${v.date}";"${v.clientNom}";"${v.modePaiement}";"${v.devise}";${v.tauxUSD_CDF};"${totalUSDStr}";${v.totalCDF};"${resteUSDStr}";"${v.statut}";"${v.utilisateurNom}"`;
    }).join('\n');

    this.downloadCSV(`Export_Ventes_MP_MOTORS_${Date.now()}.csv`, `\uFEFF${header}${rows}`);
  },
};
