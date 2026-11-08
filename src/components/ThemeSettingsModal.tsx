/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Theme, Display Mode & Color Customization Modal
 */

import React, { useState, useEffect } from 'react';
import {
  Palette,
  Sun,
  Moon,
  Eye,
  Monitor,
  Check,
  RotateCcw,
  Sparkles,
  Sliders,
  CheckCircle2,
  Brush,
} from 'lucide-react';
import {
  themeService,
  ThemeSettings,
  DisplayMode,
  DarkAmbiance,
  UiRadius,
  ACCENT_PRESETS,
} from '../services/themeService';

interface ThemeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [settings, setSettings] = useState<ThemeSettings>(() => themeService.getSettings());
  const [customHex, setCustomHex] = useState<string>(settings.customAccentHex || '#2563eb');
  const [isSavedFlash, setIsSavedFlash] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(themeService.getSettings());
      setCustomHex(themeService.getSettings().customAccentHex || '#2563eb');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleModeChange = (mode: DisplayMode) => {
    const updated = themeService.updateSettings({ displayMode: mode });
    setSettings(updated);
    flashSaved();
  };

  const handleAmbianceChange = (ambiance: DarkAmbiance) => {
    const updated = themeService.updateSettings({ darkAmbiance: ambiance });
    setSettings(updated);
    flashSaved();
  };

  const handleAccentChange = (presetId: string) => {
    const updated = themeService.updateSettings({ accentColorId: presetId });
    setSettings(updated);
    flashSaved();
  };

  const handleCustomHexChange = (hex: string) => {
    setCustomHex(hex);
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      const updated = themeService.updateSettings({
        accentColorId: 'custom',
        customAccentHex: hex,
      });
      setSettings(updated);
      flashSaved();
    }
  };

  const handleRadiusChange = (radius: UiRadius) => {
    const updated = themeService.updateSettings({ uiRadius: radius });
    setSettings(updated);
    flashSaved();
  };

  const handleReset = () => {
    const reset = themeService.resetToDefault();
    setSettings(reset);
    setCustomHex(reset.customAccentHex);
    flashSaved();
  };

  const flashSaved = () => {
    setIsSavedFlash(true);
    setTimeout(() => setIsSavedFlash(false), 1200);
  };

  const activeAccent = themeService.getActiveAccentColor();

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md"
              style={{ backgroundColor: activeAccent.hex }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Personnalisation de l'Affichage & Couleurs</span>
                {isSavedFlash && (
                  <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 animate-pulse">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Appliqué en direct
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Mode sombre, mode clair et palette personnalisable selon vos préférences de caisse.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white flex items-center justify-center text-lg font-bold cursor-pointer transition-all"
            title="Fermer"
          >
            ×
          </button>
        </div>

        {/* Section 1: Mode d'affichage principal */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-400" />
            <span>Mode d'Affichage (Thème Global)</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              {
                id: 'dark' as DisplayMode,
                label: 'Sombre Pro',
                desc: 'Reposant & Moderne',
                icon: <Moon className="w-4 h-4 text-indigo-400" />,
              },
              {
                id: 'light' as DisplayMode,
                label: 'Clair Studio',
                desc: 'Lumineux & Net',
                icon: <Sun className="w-4 h-4 text-amber-400" />,
              },
              {
                id: 'high-contrast' as DisplayMode,
                label: 'Contraste Élevé',
                desc: 'Accessibilité Maximale',
                icon: <Eye className="w-4 h-4 text-emerald-400" />,
              },
              {
                id: 'system' as DisplayMode,
                label: 'Automatique',
                desc: 'Suit Windows / Mac',
                icon: <Monitor className="w-4 h-4 text-cyan-400" />,
              },
            ].map((mode) => {
              const isSelected = settings.displayMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => handleModeChange(mode.id)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'border-white bg-slate-800 text-white shadow-md'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`}
                  style={isSelected ? { borderColor: activeAccent.hex } : undefined}
                >
                  <div className="flex items-center justify-between mb-2">
                    {mode.icon}
                    {isSelected && <Check className="w-3.5 h-3.5" style={{ color: activeAccent.hex }} />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{mode.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{mode.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 2: Ambiance de fond sombre (uniquement si mode sombre ou auto) */}
        {settings.displayMode !== 'light' && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Nuance de Fond Sombre</span>
              </span>
              <span className="text-[10px] text-slate-500 font-normal">Pour les environnements de comptoir</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'slate' as DarkAmbiance, label: 'Ardoise (Défaut)', color: '#0f172a' },
                { id: 'navy' as DarkAmbiance, label: 'Nuit Bleue', color: '#070e22' },
                { id: 'zinc' as DarkAmbiance, label: 'Zinc Neutre', color: '#18181b' },
                { id: 'oled' as DarkAmbiance, label: 'Noir Pur OLED', color: '#000000' },
              ].map((amb) => {
                const isSelected = settings.darkAmbiance === amb.id;
                return (
                  <button
                    key={amb.id}
                    type="button"
                    onClick={() => handleAmbianceChange(amb.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                      isSelected
                        ? 'border-white text-white'
                        : 'border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                    style={{
                      backgroundColor: amb.color,
                      borderColor: isSelected ? activeAccent.hex : undefined,
                    }}
                  >
                    <div
                      className="w-3.5 h-3.5 rounded-full border border-slate-600 shrink-0"
                      style={{ backgroundColor: amb.color }}
                    />
                    <span className="truncate">{amb.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 3: Palette de couleurs d'accentuation */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Brush className="w-4 h-4 text-purple-400" />
              <span>Couleur d'Accentuation & Boutons</span>
            </label>
            <span className="text-xs font-mono font-bold" style={{ color: activeAccent.hex }}>
              {activeAccent.hex.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ACCENT_PRESETS.map((preset) => {
              const isSelected = settings.accentColorId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleAccentChange(preset.id)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-white bg-slate-800 text-white shadow-sm'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                  style={isSelected ? { borderColor: preset.hex } : undefined}
                >
                  <div
                    className="w-4 h-4 rounded-full shadow-sm shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: preset.hex }}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <div className="text-[11px] font-semibold truncate leading-tight">
                    {preset.name.split(' (')[0]}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Option Personnalisée avec Sélecteur Libre */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="color"
                  value={customHex}
                  onChange={(e) => handleCustomHexChange(e.target.value)}
                  className="w-9 h-9 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                  title="Sélectionner une couleur sur la roue chromatique"
                />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Couleur Sur-Mesure Libre</div>
                <div className="text-[10px] text-slate-400">
                  Adaptez l'application aux couleurs exactes de votre marque
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customHex}
                maxLength={7}
                placeholder="#2563eb"
                onChange={(e) => handleCustomHexChange(e.target.value)}
                className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs uppercase focus:border-blue-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => handleCustomHexChange(customHex)}
                className="px-3 py-1.5 rounded-lg text-white text-xs font-bold shadow-md cursor-pointer transition-all"
                style={{ backgroundColor: activeAccent.hex }}
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>

        {/* Section 4: Style des Coins & Arrondis */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Forme des Éléments & Boutons</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'xl' as UiRadius, label: 'Moderne Arrondi', radius: 'rounded-xl' },
              { id: 'md' as UiRadius, label: 'Compact Équilibré', radius: 'rounded-md' },
              { id: 'none' as UiRadius, label: 'Industriel Carré', radius: 'rounded-none' },
            ].map((r) => {
              const isSelected = settings.uiRadius === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleRadiusChange(r.id)}
                  className={`p-2.5 rounded-xl border text-center text-xs font-semibold cursor-pointer transition-all ${
                    isSelected
                      ? 'border-white bg-slate-800 text-white'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                  }`}
                  style={isSelected ? { borderColor: activeAccent.hex } : undefined}
                >
                  <div className={`w-8 h-4 mx-auto mb-1.5 border border-slate-500 ${r.radius}`} />
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Aperçu en direct */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Aperçu en Direct des Éléments
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-xl text-white text-xs font-bold shadow-lg flex items-center gap-2"
              style={{
                backgroundColor: activeAccent.hex,
                boxShadow: `0 8px 16px -4px ${activeAccent.shadowColor}`,
              }}
            >
              <span>Valider la Vente [F9]</span>
            </button>
            <span
              className="px-2.5 py-1 rounded-lg text-xs font-semibold border"
              style={{
                borderColor: `${activeAccent.hex}55`,
                backgroundColor: `${activeAccent.hex}15`,
                color: activeAccent.hex,
              }}
            >
              Badge Actif
            </span>
            <span className="text-xs text-slate-300">
              Texte avec mise en valeur <strong style={{ color: activeAccent.hex }}>Maison MP Motors</strong>
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser par Défaut</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-white text-xs font-bold shadow-lg cursor-pointer transition-all"
            style={{
              backgroundColor: activeAccent.hex,
              boxShadow: `0 8px 16px -4px ${activeAccent.shadowColor}`,
            }}
          >
            Fermer & Continuer
          </button>
        </div>
      </div>
    </div>
  );
};
