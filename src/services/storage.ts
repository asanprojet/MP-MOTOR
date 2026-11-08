/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Offline Relational Persistence & State Management
 */

import {
  Article,
  Client,
  Fournisseur,
  Vente,
  Achat,
  MouvementStock,
  PaiementCredit,
  DemandeModification,
  JournalActivite,
  Parametres,
  User,
} from '../shared/types';
import { usdToCents, usdToDixMillieme } from '../shared/money';

const STORAGE_KEYS = {
  USERS: 'mp_motors_users',
  PARAMS: 'mp_motors_params',
  ARTICLES: 'mp_motors_articles',
  CLIENTS: 'mp_motors_clients',
  FOURNISSEURS: 'mp_motors_fournisseurs',
  VENTES: 'mp_motors_ventes',
  ACHATS: 'mp_motors_achats',
  MOUVEMENTS: 'mp_motors_mouvements',
  PAIEMENTS: 'mp_motors_paiements',
  DEMANDES: 'mp_motors_demandes',
  JOURNAL: 'mp_motors_journal',
  CURRENT_USER: 'mp_motors_current_user',
};

export const DEFAULT_PARAMS: Parametres = {
  nomApplication: 'MAISON MP MOTORS',
  entrepriseNom: 'MAISON MP MOTORS SARL',
  adresse: 'Av. du Commerce N° 124, Gombe, Kinshasa, RDC',
  telephone: '+243 81 234 5678 / +243 99 876 5432',
  email: 'contact@maisonmpmotors.cd',
  devisePrincipale: 'USD',
  tauxUSD_CDF: 2850,
  margeDefautPourcent: 25,
  seuilAlerteDefaut: 5,
  formatImpression: 'TICKET_80MM',
  bloquerCreditClient: false,
  compteurFacture: 104,
  compteurAchat: 32,
  compteurClient: 18,
  compteurFournisseur: 8,
  compteurArticle: 15,
  delaiInactiviteMinutes: 30,
  modeSombre: true,
};

export const INITIAL_USERS: User[] = [
  {
    id: 'USR001',
    nom: 'Michel P. (Propriétaire)',
    identifiant: 'superadmin',
    role: 'SUPERADMIN',
    actif: true,
    pin: '1234',
    echecsConnexion: 0,
    derniereConnexion: new Date().toISOString(),
  },
  {
    id: 'USR002',
    nom: 'Paul Kabamba (Gérant)',
    identifiant: 'admin',
    role: 'ADMIN',
    actif: true,
    pin: '1234',
    echecsConnexion: 0,
  },
  {
    id: 'USR003',
    nom: 'Éric Mwamba (Magasinier)',
    identifiant: 'magasinier',
    role: 'MAGASINIER',
    actif: true,
    pin: '1234',
    echecsConnexion: 0,
  },
  {
    id: 'USR004',
    nom: 'Sarah Tshilombo (Caisse 1)',
    identifiant: 'caissier',
    role: 'CAISSIER',
    actif: true,
    pin: '1234',
    echecsConnexion: 0,
  },
  {
    id: 'USR005',
    nom: 'Dieudonné Ilunga (Comptable)',
    identifiant: 'comptable',
    role: 'COMPTABLE',
    actif: true,
    pin: '1234',
    echecsConnexion: 0,
  },
];

export const INITIAL_FOURNISSEURS: Fournisseur[] = [
  {
    id: 'F0001',
    code: 'F0001',
    nom: 'CFAO MOBILITY RDC',
    telephone: '+243 81 555 0101',
    adresse: 'Bd Lumumba, Limete, Kinshasa',
    email: 'pieces@cfaomobility.cd',
    creeLe: '2025-01-10T08:00:00Z',
  },
  {
    id: 'F0002',
    code: 'F0002',
    nom: 'DUBAI AUTO EXPORT FZE',
    telephone: '+971 4 888 1234',
    adresse: 'Al Aweer Auto Market, Dubai, EAU',
    email: 'sales@dubaiautoexport.ae',
    creeLe: '2025-01-12T09:30:00Z',
  },
  {
    id: 'F0003',
    code: 'F0003',
    nom: 'SOGACAR KINSHASA',
    telephone: '+243 89 222 3344',
    adresse: 'Av. Kabasele Tshamala, Barumbu',
    email: 'contact@sogacar-rdc.com',
    creeLe: '2025-01-15T10:15:00Z',
  },
];

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'C0001',
    code: 'C0001',
    nom: 'GARAGE CENTRAL GOMBE',
    telephone: '+243 82 111 2233',
    adresse: 'Av. Wagenia N° 45, Gombe',
    type: 'GARAGE',
    creditAutorise: usdToCents(1500),
    soldeActuelUSD: usdToCents(350), // Doit 350$
    observations: 'Client fidèle, règle chaque samedi',
    creeLe: '2025-01-14T11:00:00Z',
  },
  {
    id: 'C0002',
    code: 'C0002',
    nom: 'SOCIÉTÉ TRANS-KATANGA',
    telephone: '+243 97 444 5566',
    adresse: 'Zone Industrielle, Limete',
    type: 'FLOTTE',
    creditAutorise: usdToCents(3000),
    soldeActuelUSD: usdToCents(820),
    observations: 'Flotte de 12 Toyota Hilux',
    creeLe: '2025-01-18T14:20:00Z',
  },
  {
    id: 'C0003',
    code: 'C0003',
    nom: 'M. JEAN BOSCO KALONJI',
    telephone: '+243 81 777 8899',
    adresse: 'Kintambo Magasin',
    type: 'PARTICULIER',
    creditAutorise: usdToCents(100),
    soldeActuelUSD: 0,
    creeLe: '2025-02-01T09:00:00Z',
  },
];

export const INITIAL_ARTICLES: Article[] = [
  {
    id: 'ART0001',
    code: 'ART0001',
    designation: 'Plaquettes de frein AV Toyota Hilux / Prado 1KD/2KD',
    categorie: 'Freinage',
    marqueVehicule: 'Toyota Hilux / Fortuner',
    fournisseurId: 'F0001',
    fournisseurNom: 'CFAO MOBILITY RDC',
    stockInitial: 30,
    stockActuel: 18,
    coutMoyen: usdToDixMillieme(24.5000), // 24.50$
    prixVente: usdToCents(35.00), // 35.00$ fixé
    seuilAlerte: 5,
    codeBarre: '04465-0K090',
    observations: 'Origine Japon - Réf OEM 04465-0K090',
    derniereMiseAJour: '2025-02-10T10:00:00Z',
  },
  {
    id: 'ART0002',
    code: 'ART0002',
    designation: 'Filtre à huile Toyota 1HZ / 1HD (Land Cruiser HZJ79/76)',
    categorie: 'Filtration',
    marqueVehicule: 'Toyota Land Cruiser',
    fournisseurId: 'F0001',
    fournisseurNom: 'CFAO MOBILITY RDC',
    stockInitial: 50,
    stockActuel: 34,
    coutMoyen: usdToDixMillieme(7.2000),
    prixVente: usdToCents(12.00),
    seuilAlerte: 10,
    codeBarre: '90915-30002',
    observations: 'Grand modèle pour moteur diesel 1HZ',
    derniereMiseAJour: '2025-02-10T10:00:00Z',
  },
  {
    id: 'ART0003',
    code: 'ART0003',
    designation: 'Bougies d\'allumage NGK Iridium BKR6EIX (Jeu de 4)',
    categorie: 'Allumage',
    marqueVehicule: 'Toyota RAV4 / Corolla',
    fournisseurId: 'F0002',
    fournisseurNom: 'DUBAI AUTO EXPORT FZE',
    stockInitial: 25,
    stockActuel: 3, // En alerte!
    coutMoyen: usdToDixMillieme(18.0000),
    prixVente: usdToCents(28.00),
    seuilAlerte: 5,
    codeBarre: 'NGK-6418',
    observations: 'Vendu par jeu de 4 bougies',
    derniereMiseAJour: '2025-02-12T14:00:00Z',
  },
  {
    id: 'ART0004',
    code: 'ART0004',
    designation: 'Amortisseur AV Droit KYB Excel-G Gaz Toyota RAV4 2006-2012',
    categorie: 'Suspension',
    marqueVehicule: 'Toyota RAV4',
    fournisseurId: 'F0002',
    fournisseurNom: 'DUBAI AUTO EXPORT FZE',
    stockInitial: 8,
    stockActuel: 0, // En RUPTURE!
    coutMoyen: usdToDixMillieme(48.5000),
    prixVente: usdToCents(70.00),
    seuilAlerte: 2,
    codeBarre: 'KYB-339031',
    observations: 'Commande en cours Dubaï',
    derniereMiseAJour: '2025-02-15T09:30:00Z',
  },
  {
    id: 'ART0005',
    code: 'ART0005',
    designation: 'Huile Moteur TOTAL Quartz 9000 5W-40 Synthétique (Bidon 5L)',
    categorie: 'Lubrifiants',
    marqueVehicule: 'Universel Essence/Diesel',
    fournisseurId: 'F0003',
    fournisseurNom: 'SOGACAR KINSHASA',
    stockInitial: 40,
    stockActuel: 22,
    coutMoyen: usdToDixMillieme(32.0000),
    prixVente: usdToCents(45.00),
    seuilAlerte: 8,
    codeBarre: '3425901003403',
    observations: 'Homologué API SN/CF',
    derniereMiseAJour: '2025-02-18T16:00:00Z',
  },
  {
    id: 'ART0006',
    code: 'ART0006',
    designation: 'Kit d\'embrayage complet AISIN Toyota Hiace 2KD D4D (Disque+Mécanisme+Butée)',
    categorie: 'Transmission',
    marqueVehicule: 'Toyota Hiace Bus',
    fournisseurId: 'F0001',
    fournisseurNom: 'CFAO MOBILITY RDC',
    stockInitial: 12,
    stockActuel: 6,
    coutMoyen: usdToDixMillieme(135.0000),
    prixVente: usdToCents(190.00),
    seuilAlerte: 3,
    codeBarre: 'KT-312A',
    observations: 'Pièce forte demande transporteurs',
    derniereMiseAJour: '2025-02-19T11:00:00Z',
  },
  {
    id: 'ART0007',
    code: 'ART0007',
    designation: 'Batterie VARTA Blue Dynamic 12V 70Ah 630A Borne Droite',
    categorie: 'Électricité',
    marqueVehicule: 'Universel SUV / Berline',
    fournisseurId: 'F0003',
    fournisseurNom: 'SOGACAR KINSHASA',
    stockInitial: 15,
    stockActuel: 4, // En alerte
    coutMoyen: usdToDixMillieme(78.0000),
    prixVente: usdToCents(110.00),
    seuilAlerte: 4,
    codeBarre: '570412063',
    observations: 'Garantie 6 mois au comptoir',
    derniereMiseAJour: '2025-02-20T10:00:00Z',
  },
  {
    id: 'ART0008',
    code: 'ART0008',
    designation: 'Disque de frein AV ventilé Nissan Patrol Y61 (Pièce unitaire)',
    categorie: 'Freinage',
    marqueVehicule: 'Nissan Patrol Y61',
    fournisseurId: 'F0002',
    fournisseurNom: 'DUBAI AUTO EXPORT FZE',
    stockInitial: 10,
    stockActuel: 5,
    coutMoyen: usdToDixMillieme(42.0000),
    // Pas de prix fixe : calculé par marge 25% (42$ * 1.25 = 52.50$)
    seuilAlerte: 2,
    codeBarre: '40206-VB000',
    observations: 'Prix calculé dynamiquement avec la marge par défaut',
    derniereMiseAJour: '2025-02-21T08:00:00Z',
  },
];

export const INITIAL_JOURNAL: JournalActivite[] = [
  {
    id: 'LOG001',
    date: '2025-01-10T08:00:00Z',
    utilisateurId: 'USR001',
    utilisateurNom: 'Michel P. (Propriétaire)',
    action: 'INITIALISATION',
    entite: 'SYSTEME',
    details: 'Initialisation de la base locale MAISON MP MOTORS et création du compte Superadmin.',
  },
  {
    id: 'LOG002',
    date: '2025-02-10T10:00:00Z',
    utilisateurId: 'USR002',
    utilisateurNom: 'Paul Kabamba (Gérant)',
    action: 'PRIX_FIXE',
    entite: 'ARTICLES',
    reference: 'ART0001',
    details: 'Fixation du prix de vente à $ 35.00 pour les plaquettes Hilux.',
  },
];

class StorageService {
  private get<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      if (!data) return defaultValue;
      return JSON.parse(data) as T;
    } catch (e) {
      console.error(`Error reading ${key} from storage:`, e);
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error writing ${key} to storage:`, e);
    }
  }

  // --- Initialize database on boot ---
  public initDatabase(): void {
    if (!localStorage.getItem(STORAGE_KEYS.PARAMS)) {
      this.set(STORAGE_KEYS.PARAMS, DEFAULT_PARAMS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      this.set(STORAGE_KEYS.USERS, INITIAL_USERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.FOURNISSEURS)) {
      this.set(STORAGE_KEYS.FOURNISSEURS, INITIAL_FOURNISSEURS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CLIENTS)) {
      this.set(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ARTICLES)) {
      this.set(STORAGE_KEYS.ARTICLES, INITIAL_ARTICLES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.VENTES)) {
      this.set(STORAGE_KEYS.VENTES, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ACHATS)) {
      this.set(STORAGE_KEYS.ACHATS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.MOUVEMENTS)) {
      this.set(STORAGE_KEYS.MOUVEMENTS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.PAIEMENTS)) {
      this.set(STORAGE_KEYS.PAIEMENTS, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.DEMANDES)) {
      this.set(STORAGE_KEYS.DEMANDES, []);
    }
    if (!localStorage.getItem(STORAGE_KEYS.JOURNAL)) {
      this.set(STORAGE_KEYS.JOURNAL, INITIAL_JOURNAL);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
      // Default to Superadmin for initial convenience, can be switched anytime
      this.set(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[0]);
    }
  }

  // --- Session & Current User ---
  public getCurrentUser(): User {
    const user = this.get<User | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (!user) {
      const users = this.getUsers();
      const defaultUser = users[0] || INITIAL_USERS[0];
      this.setCurrentUser(defaultUser);
      return defaultUser;
    }
    return user;
  }

  public setCurrentUser(user: User): void {
    this.set(STORAGE_KEYS.CURRENT_USER, user);
  }

  // --- Parameters ---
  public getParams(): Parametres {
    return this.get<Parametres>(STORAGE_KEYS.PARAMS, DEFAULT_PARAMS);
  }

  public updateParams(updates: Partial<Parametres>, user: User): Parametres {
    const current = this.getParams();
    const updated = { ...current, ...updates };
    this.set(STORAGE_KEYS.PARAMS, updated);
    this.logAction(user, 'PARAMETRES_MODIFIES', 'PARAMETRES', undefined, 'Mise à jour des paramètres système.');
    return updated;
  }

  // --- Users ---
  public getUsers(): User[] {
    return this.get<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  }

  public saveUser(userToSave: User, currentActor: User): void {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === userToSave.id);
    if (index >= 0) {
      users[index] = userToSave;
    } else {
      users.push(userToSave);
    }
    this.set(STORAGE_KEYS.USERS, users);
    this.logAction(currentActor, 'UTILISATEUR_ENREGISTRE', 'UTILISATEURS', userToSave.identifiant, `Enregistrement du compte ${userToSave.nom} (${userToSave.role})`);
  }

  // --- Articles ---
  public getArticles(): Article[] {
    return this.get<Article[]>(STORAGE_KEYS.ARTICLES, INITIAL_ARTICLES);
  }

  public saveArticle(article: Article, user: User): void {
    const articles = this.getArticles();
    const index = articles.findIndex(a => a.id === article.id);
    if (index >= 0) {
      articles[index] = { ...article, derniereMiseAJour: new Date().toISOString() };
    } else {
      articles.push({ ...article, derniereMiseAJour: new Date().toISOString() });
    }
    this.set(STORAGE_KEYS.ARTICLES, articles);
    this.logAction(user, 'ARTICLE_ENREGISTRE', 'ARTICLES', article.code, `Sauvegarde article: ${article.designation}`);
  }

  public updateArticlesList(articles: Article[]): void {
    this.set(STORAGE_KEYS.ARTICLES, articles);
  }

  // --- Clients ---
  public getClients(): Client[] {
    return this.get<Client[]>(STORAGE_KEYS.CLIENTS, INITIAL_CLIENTS);
  }

  public saveClient(client: Client, user?: User): void {
    const clients = this.getClients();
    const index = clients.findIndex(c => c.id === client.id);
    if (index >= 0) {
      clients[index] = client;
    } else {
      clients.push(client);
    }
    this.set(STORAGE_KEYS.CLIENTS, clients);
    if (user) {
      this.logAction(user, 'CLIENT_ENREGISTRE', 'CLIENTS', client.code, `Client ${client.nom} enregistré.`);
    }
  }

  public updateClientsList(clients: Client[]): void {
    this.set(STORAGE_KEYS.CLIENTS, clients);
  }

  // --- Fournisseurs ---
  public getFournisseurs(): Fournisseur[] {
    return this.get<Fournisseur[]>(STORAGE_KEYS.FOURNISSEURS, INITIAL_FOURNISSEURS);
  }

  public saveFournisseur(fournisseur: Fournisseur, user?: User): void {
    const list = this.getFournisseurs();
    const index = list.findIndex(f => f.id === fournisseur.id);
    if (index >= 0) {
      list[index] = fournisseur;
    } else {
      list.push(fournisseur);
    }
    this.set(STORAGE_KEYS.FOURNISSEURS, list);
    if (user) {
      this.logAction(user, 'FOURNISSEUR_ENREGISTRE', 'FOURNISSEURS', fournisseur.code, `Fournisseur ${fournisseur.nom} enregistré.`);
    }
  }

  // --- Ventes ---
  public getVentes(): Vente[] {
    return this.get<Vente[]>(STORAGE_KEYS.VENTES, []);
  }

  public saveVente(vente: Vente): void {
    const ventes = this.getVentes();
    ventes.unshift(vente);
    this.set(STORAGE_KEYS.VENTES, ventes);
  }

  public updateVentesList(ventes: Vente[]): void {
    this.set(STORAGE_KEYS.VENTES, ventes);
  }

  // --- Achats ---
  public getAchats(): Achat[] {
    return this.get<Achat[]>(STORAGE_KEYS.ACHATS, []);
  }

  public saveAchat(achat: Achat): void {
    const achats = this.getAchats();
    achats.unshift(achat);
    this.set(STORAGE_KEYS.ACHATS, achats);
  }

  public updateAchatsList(achats: Achat[]): void {
    this.set(STORAGE_KEYS.ACHATS, achats);
  }

  // --- Mouvements de stock ---
  public getMouvements(): MouvementStock[] {
    return this.get<MouvementStock[]>(STORAGE_KEYS.MOUVEMENTS, []);
  }

  public addMouvement(mvt: MouvementStock): void {
    const list = this.getMouvements();
    list.unshift(mvt);
    this.set(STORAGE_KEYS.MOUVEMENTS, list);
  }

  // --- Paiements crédit ---
  public getPaiementsCredit(): PaiementCredit[] {
    return this.get<PaiementCredit[]>(STORAGE_KEYS.PAIEMENTS, []);
  }

  public addPaiementCredit(paiement: PaiementCredit): void {
    const list = this.getPaiementsCredit();
    list.unshift(paiement);
    this.set(STORAGE_KEYS.PAIEMENTS, list);
  }

  // --- Demandes de modification ---
  public getDemandes(): DemandeModification[] {
    return this.get<DemandeModification[]>(STORAGE_KEYS.DEMANDES, []);
  }

  public saveDemande(demande: DemandeModification): void {
    const list = this.getDemandes();
    const index = list.findIndex(d => d.id === demande.id);
    if (index >= 0) {
      list[index] = demande;
    } else {
      list.unshift(demande);
    }
    this.set(STORAGE_KEYS.DEMANDES, list);
  }

  // --- Journal d'audit ---
  public getJournal(): JournalActivite[] {
    return this.get<JournalActivite[]>(STORAGE_KEYS.JOURNAL, INITIAL_JOURNAL);
  }

  public logAction(
    user: User,
    action: string,
    entite: string,
    reference?: string,
    details: string = '',
    ancienEtat?: string,
    nouvelEtat?: string
  ): void {
    const logs = this.getJournal();
    const newEntry: JournalActivite = {
      id: `LOG_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      date: new Date().toISOString(),
      utilisateurId: user.id,
      utilisateurNom: user.nom,
      action,
      entite,
      reference,
      details,
      ancienEtat,
      nouvelEtat,
    };
    logs.unshift(newEntry);
    // Keep max 2000 log entries
    if (logs.length > 2000) logs.pop();
    this.set(STORAGE_KEYS.JOURNAL, logs);
  }

  // --- Backup & Restore ---
  public exportFullBackup(): string {
    const data = {
      version: '2.1',
      dateExport: new Date().toISOString(),
      params: this.getParams(),
      users: this.getUsers(),
      articles: this.getArticles(),
      clients: this.getClients(),
      fournisseurs: this.getFournisseurs(),
      ventes: this.getVentes(),
      achats: this.getAchats(),
      mouvements: this.getMouvements(),
      paiementsCredit: this.getPaiementsCredit(),
      demandes: this.getDemandes(),
      journal: this.getJournal(),
    };
    return JSON.stringify(data, null, 2);
  }

  public importFullBackup(jsonContent: string, actor: User): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonContent);
      if (!data.params || !data.articles || !data.users) {
        return { success: false, message: "Fichier de sauvegarde invalide (sections obligatoires manquantes)." };
      }
      this.set(STORAGE_KEYS.PARAMS, data.params);
      this.set(STORAGE_KEYS.USERS, data.users);
      this.set(STORAGE_KEYS.ARTICLES, data.articles);
      this.set(STORAGE_KEYS.CLIENTS, data.clients || []);
      this.set(STORAGE_KEYS.FOURNISSEURS, data.fournisseurs || []);
      this.set(STORAGE_KEYS.VENTES, data.ventes || []);
      this.set(STORAGE_KEYS.ACHATS, data.achats || []);
      this.set(STORAGE_KEYS.MOUVEMENTS, data.mouvements || []);
      this.set(STORAGE_KEYS.PAIEMENTS, data.paiementsCredit || []);
      this.set(STORAGE_KEYS.DEMANDES, data.demandes || []);
      this.set(STORAGE_KEYS.JOURNAL, data.journal || []);

      this.logAction(actor, 'RESTAURATION_SAUVEGARDE', 'SYSTEME', undefined, 'Restauration complète de la base de données effectuée.');
      return { success: true, message: "Base de données restaurée avec succès." };
    } catch (err: any) {
      return { success: false, message: `Erreur lors de l'analyse du fichier : ${err.message}` };
    }
  }

  public resetToFactory(actor: User): void {
    localStorage.clear();
    this.initDatabase();
    this.logAction(actor, 'REINITIALISATION_USINE', 'SYSTEME', undefined, 'Réinitialisation complète aux données d\'origine.');
  }
}

export const storage = new StorageService();
// Initialize storage immediately
storage.initDatabase();
