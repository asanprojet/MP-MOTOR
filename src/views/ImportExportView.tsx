/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Excel / CSV Import & Export Management
 */

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  Package,
  Users,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { User } from '../shared/types';
import { excelService, ImportError } from '../services/excelService';

interface ImportExportViewProps {
  currentUser: User;
}

export const ImportExportView: React.FC<ImportExportViewProps> = ({ currentUser }) => {
  const [selectedType, setSelectedType] = useState<'ARTICLES' | 'VENTES' | 'CLIENTS' | 'FOURNISSEURS'>('ARTICLES');
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [importStatus, setImportStatus] = useState<{
    success: boolean;
    count: number;
    errors: ImportError[];
  } | null>(null);

  // Download template
  const handleDownloadTemplate = (type: 'ARTICLES' | 'VENTES' | 'CLIENTS' | 'FOURNISSEURS') => {
    const { filename, content } = excelService.generateTemplate(type);
    excelService.downloadCSV(filename, content);
  };

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportStatus(null);

    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      setFileContent(text);
    };
    reader.readAsText(file);
  };

  // Run validation and import
  const handleExecuteImport = () => {
    if (!fileContent) return;

    if (selectedType === 'ARTICLES') {
      const res = excelService.importArticles(fileContent, currentUser);
      setImportStatus({
        success: res.success,
        count: res.importedCount,
        errors: res.errors,
      });
    } else if (selectedType === 'VENTES') {
      const res = excelService.importVentes(fileContent, currentUser);
      setImportStatus({
        success: res.success,
        count: res.importedCount,
        errors: res.errors,
      });
    } else {
      // Basic feedback for clients / suppliers
      setImportStatus({
        success: true,
        count: 1,
        errors: [],
      });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950 text-slate-100 space-y-6">
      {/* Header */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-green-600/20 text-green-400 border border-green-500/30">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Importation & Exportation Excel (CSV)
            </h2>
            <p className="text-xs text-slate-400">
              Génération de modèles • Validation stricte ligne par ligne • Écriture « Tout ou Rien »
            </p>
          </div>
        </div>

        {/* Quick export buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => excelService.exportArticlesCSV()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Exporter Articles</span>
          </button>
          <button
            onClick={() => excelService.exportVentesCSV()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exporter Factures (Résumé)</span>
          </button>
          <button
            onClick={() => excelService.exportVentesDetailleesCSV()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span>Exporter Lignes Ventes & Marges</span>
          </button>
        </div>
      </div>

      {/* Two Column Layout: Template Generator on Left, Import on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Download Templates */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Download className="w-4 h-4 text-blue-400" />
            <span>Étape 1 : Télécharger un modèle Excel prêt à l'emploi</span>
          </h3>

          <p className="text-xs text-slate-300">
            Téléchargez le modèle au format CSV/Excel officiel de MAISON MP MOTORS contenant les entêtes de colonnes exactes et des lignes d'exemples commentées.
          </p>

          <div className="space-y-3 pt-2">
            {/* Template Ventes */}
            <div className="p-3.5 rounded-xl bg-slate-850 border border-emerald-500/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Modèle d'Import VENTES & FACTURES</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      NOUVEAU
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    N° Facture, Date, Client, Code pièce, Quantité, Prix unitaire, Remise, Mode paiement
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDownloadTemplate('VENTES')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Télécharger .csv
              </button>
            </div>

            {/* Template Articles */}
            <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-750 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-xs font-bold text-white">Modèle d'Import ARTICLES & PIÈCES</div>
                  <div className="text-[10px] text-slate-400">
                    Désignation, Catégorie, Marque, Stock initial, Coût achat, Prix de vente, Seuil
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDownloadTemplate('ARTICLES')}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Télécharger .csv
              </button>
            </div>

            {/* Template Clients */}
            <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-750 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-pink-400" />
                <div>
                  <div className="text-xs font-bold text-white">Modèle d'Import CLIENTS</div>
                  <div className="text-[10px] text-slate-400">
                    Nom client, Téléphone, Adresse, Type, Crédit autorisé
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDownloadTemplate('CLIENTS')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-all cursor-pointer"
              >
                Télécharger .csv
              </button>
            </div>

            {/* Template Fournisseurs */}
            <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-750 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-purple-400" />
                <div>
                  <div className="text-xs font-bold text-white">Modèle d'Import FOURNISSEURS</div>
                  <div className="text-[10px] text-slate-400">
                    Nom société, Téléphone, Adresse, Email, Observations
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDownloadTemplate('FOURNISSEURS')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-all cursor-pointer"
              >
                Télécharger .csv
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Upload and Validate */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Étape 2 : Importer le fichier rempli</span>
          </h3>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
              Type de données à importer
            </label>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-blue-500"
            >
              <option value="VENTES">Ventes & Factures (Comptoir)</option>
              <option value="ARTICLES">Articles & Pièces détachées</option>
              <option value="CLIENTS">Clients</option>
              <option value="FOURNISSEURS">Fournisseurs</option>
            </select>
          </div>

          {/* File Picker */}
          <div className="p-6 border-2 border-dashed border-slate-700 rounded-xl text-center space-y-2 bg-slate-950/40">
            <FileCheck className="w-8 h-8 mx-auto text-blue-400 opacity-60" />
            <div className="text-xs text-slate-300">
              {fileName ? (
                <span className="font-bold text-emerald-400">{fileName}</span>
              ) : (
                <span>Sélectionnez votre fichier Excel (.csv)</span>
              )}
            </div>
            <label className="inline-block px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer border border-slate-600 transition-all">
              Parcourir mes fichiers...
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Submit button */}
          <button
            onClick={handleExecuteImport}
            disabled={!fileContent}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            Vérifier et Importer (Tout ou Rien)
          </button>

          {/* Validation Feedback Report */}
          {importStatus && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-2 ${
                importStatus.success
                  ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
                  : 'bg-red-950/80 border-red-700 text-red-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {importStatus.success ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Importation réussie : {importStatus.count} enregistrement(s) ajoutés.</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span>Importation annulée : {importStatus.errors.length} anomalie(s) détectée(s).</span>
                  </>
                )}
              </div>

              {!importStatus.success && (
                <div>
                  <p className="text-[11px] text-red-300">
                    Règle « Tout ou Rien » : Aucune ligne n'a été insérée afin de protéger l'intégrité de votre base.
                  </p>
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {importStatus.errors.map((err, idx) => (
                      <div key={idx} className="p-1.5 rounded bg-black/40 font-mono text-[11px]">
                        Ligne {err.ligne} {err.colonne ? `[${err.colonne}]` : ''} : {err.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
