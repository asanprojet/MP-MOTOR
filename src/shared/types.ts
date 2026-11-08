/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Core Types & Data Contracts
 */

export type Role =
  | 'ARCHITECTE'
  | 'SUPERADMIN'
  | 'ADMIN'
  | 'MAGASINIER'
  | 'CAISSIER'
  | 'COMPTABLE'
  | 'INVITE';

export interface User {
  id: string;
  nom: string;
  identifiant: string;
  role: Role;
  actif: boolean;
  pin?: string;
  derniereConnexion?: string;
  echecsConnexion: number;
  creeLe?: string;
  // Gestion temporelle des licences et expirations
  dateExpiration?: string | null; // Date ISO d'expiration (null si illimité / à vie)
  estAVie?: boolean; // True si l'architecte a attribué une licence permanente
  dureeInitialeJours?: number; // 60 (2 mois), 45 (1m15j), 15 (invité)
}

export type PaymentMethod = 
  | 'ESPECES' 
  | 'M_PESA' 
  | 'AIRTEL_MONEY' 
  | 'ORANGE_MONEY' 
  | 'VIREMENT' 
  | 'CREDIT';

export type Currency = 'USD' | 'CDF';

export type ArticleStatus = 'OK' | 'ALERTE' | 'RUPTURE';

export interface Article {
  id: string;
  code: string; // ex: ART0001
  designation: string;
  categorie: string;
  marqueVehicule: string;
  fournisseurId?: string;
  fournisseurNom?: string;
  stockInitial: number;
  stockActuel: number;
  // Stocké en dix-millièmes de USD (ex: 10.2500$ = 102500)
  coutMoyen: number; 
  // Stocké en centièmes de USD (ex: 15.00$ = 1500), nullable si calculé via marge
  prixVente?: number; 
  seuilAlerte?: number;
  observations?: string;
  codeBarre?: string;
  derniereMiseAJour: string;
}

export interface Client {
  id: string;
  code: string; // ex: C0001
  nom: string;
  telephone: string;
  adresse: string;
  type: 'PARTICULIER' | 'GARAGE' | 'SOCIETE' | 'FLOTTE';
  creditAutorise: number; // en cents USD
  soldeActuelUSD: number; // en cents USD (ce que le client doit)
  observations?: string;
  creeLe: string;
}

export interface Fournisseur {
  id: string;
  code: string; // ex: F0001
  nom: string;
  telephone: string;
  adresse: string;
  email?: string;
  observations?: string;
  creeLe: string;
}

export type MovementType = 'ACHAT' | 'VENTE' | 'AJUSTEMENT' | 'ANNULATION';

export interface MouvementStock {
  id: string;
  date: string;
  articleId: string;
  articleDesignation: string;
  articleCode: string;
  type: MovementType;
  referenceDoc: string; // FAC-XXX ou ACH-XXX ou ADJ-XXX
  quantiteSignee: number;
  stockApres: number;
  coutUnitaireApplique: number; // en dix-millièmes USD
  motif?: string;
  utilisateurId: string;
  utilisateurNom: string;
}

export interface VenteLigne {
  articleId: string;
  articleCode: string;
  designation: string;
  quantite: number;
  // Figés à la vente
  prixUnitaireUSD: number; // en cents USD
  coutUnitaireUSD: number; // en dix-millièmes USD (pour marge)
  totalLigneUSD: number; // en cents USD
}

export interface Vente {
  id: string;
  numero: string; // FAC-AAAAMMJJ-0001
  date: string;
  clientId: string;
  clientNom: string;
  modePaiement: PaymentMethod;
  devise: Currency;
  tauxUSD_CDF: number; // Figé à la création (ex: 2850)
  sousTotalUSD: number; // en cents USD
  remiseUSD: number; // en cents USD
  totalUSD: number; // en cents USD
  totalCDF: number; // calculé au taux figé
  montantRecu: number; // Dans la devise sélectionnée
  monnaieRendue: number; // Dans la devise sélectionnée
  resteAPayerUSD: number; // Pour vente à crédit ou acompte
  statut: 'VALIDE' | 'ANNULE';
  motifAnnulation?: string;
  utilisateurId: string;
  utilisateurNom: string;
  lignes: VenteLigne[];
}

export interface AchatLigne {
  articleId: string;
  articleCode: string;
  designation: string;
  quantite: number;
  prixAchatUSD: number; // en cents USD
  prixVenteFixeUSD?: number; // en cents USD si fixé
  totalLigneUSD: number; // en cents USD
}

export interface Achat {
  id: string;
  numero: string; // ACH-AAAAMMJJ-0001
  date: string;
  fournisseurId: string;
  fournisseurNom: string;
  referenceFactureFournisseur?: string;
  totalUSD: number; // en cents USD
  statut: 'VALIDE' | 'ANNULE';
  motifAnnulation?: string;
  utilisateurId: string;
  utilisateurNom: string;
  lignes: AchatLigne[];
}

export interface PaiementCredit {
  id: string;
  date: string;
  clientId: string;
  clientNom: string;
  factureNumero?: string;
  montantUSD: number; // en cents USD
  montantCDF: number;
  devise: Currency;
  tauxUSD_CDF: number;
  modePaiement: PaymentMethod;
  soldeAvantUSD: number;
  soldeApresUSD: number;
  note?: string;
  utilisateurId: string;
  utilisateurNom: string;
}

export interface DemandeModification {
  id: string;
  date: string;
  type: 'ANNULATION_FACTURE' | 'RECTIFICATION_VENTE' | 'ANNULATION_ACHAT';
  referenceDoc: string;
  motif: string;
  demandeurId: string;
  demandeurNom: string;
  statut: 'EN_ATTENTE' | 'APPROUVEE' | 'REFUSEE';
  reponseDate?: string;
  validateurId?: string;
  validateurNom?: string;
  commentaireReponse?: string;
}

export interface JournalActivite {
  id: string;
  date: string;
  utilisateurId: string;
  utilisateurNom: string;
  action: string;
  entite: string;
  reference?: string;
  details: string;
  ancienEtat?: string;
  nouvelEtat?: string;
}

export interface Parametres {
  nomApplication: string;
  entrepriseNom: string;
  adresse: string;
  telephone: string;
  email: string;
  devisePrincipale: Currency;
  tauxUSD_CDF: number; // e.g. 2850
  margeDefautPourcent: number; // e.g. 25%
  seuilAlerteDefaut: number; // e.g. 5
  formatImpression: 'TICKET_80MM' | 'A5' | 'A4';
  bloquerCreditClient: boolean;
  compteurFacture: number;
  compteurAchat: number;
  compteurClient: number;
  compteurFournisseur: number;
  compteurArticle: number;
  delaiInactiviteMinutes: number;
  logoDataUrl?: string;
  modeSombre: boolean;
  licenceGlobaleAVie?: boolean; // Activé par l'Architecte pour autoriser l'application à vie pour tous
}
