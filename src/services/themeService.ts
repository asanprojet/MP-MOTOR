/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Maison MP Motors - Theme, Display Mode & Custom Color Palette Service
 */

export type DisplayMode = 'dark' | 'light' | 'high-contrast' | 'system';
export type DarkAmbiance = 'slate' | 'navy' | 'zinc' | 'oled';
export type UiDensity = 'compact' | 'normal' | 'spacious';
export type UiRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export interface AccentColorPreset {
  id: string;
  name: string;
  hex: string;
  hoverHex: string;
  shadowColor: string;
}

export const ACCENT_PRESETS: AccentColorPreset[] = [
  {
    id: 'blue',
    name: 'Bleu Cobalt (Défaut)',
    hex: '#2563eb',
    hoverHex: '#1d4ed8',
    shadowColor: 'rgba(37, 99, 235, 0.35)',
  },
  {
    id: 'emerald',
    name: 'Émeraude & Vert Menthe',
    hex: '#059669',
    hoverHex: '#047857',
    shadowColor: 'rgba(5, 150, 105, 0.35)',
  },
  {
    id: 'amber',
    name: 'Ambre & Or Impérial',
    hex: '#d97706',
    hoverHex: '#b45309',
    shadowColor: 'rgba(217, 119, 6, 0.35)',
  },
  {
    id: 'purple',
    name: 'Violet Royal & Indigo',
    hex: '#7c3aed',
    hoverHex: '#6d28d9',
    shadowColor: 'rgba(124, 58, 237, 0.35)',
  },
  {
    id: 'ruby',
    name: 'Rose Rubis & Magenta',
    hex: '#e11d48',
    hoverHex: '#be123c',
    shadowColor: 'rgba(225, 29, 72, 0.35)',
  },
  {
    id: 'cyan',
    name: 'Cyan & Océan Turquoise',
    hex: '#0891b2',
    hoverHex: '#0e7490',
    shadowColor: 'rgba(8, 145, 178, 0.35)',
  },
  {
    id: 'orange',
    name: 'Orange Mécanique & Bronze',
    hex: '#ea580c',
    hoverHex: '#c2410c',
    shadowColor: 'rgba(234, 88, 12, 0.35)',
  },
  {
    id: 'red',
    name: 'Rouge Sport Racing',
    hex: '#dc2626',
    hoverHex: '#b91c1c',
    shadowColor: 'rgba(220, 38, 38, 0.35)',
  },
];

export interface ThemeSettings {
  displayMode: DisplayMode;
  darkAmbiance: DarkAmbiance;
  accentColorId: string;
  customAccentHex: string;
  uiDensity: UiDensity;
  uiRadius: UiRadius;
}

const STORAGE_KEY = 'maison_mp_motors_theme_settings';

const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  displayMode: 'dark',
  darkAmbiance: 'slate',
  accentColorId: 'blue',
  customAccentHex: '#2563eb',
  uiDensity: 'normal',
  uiRadius: 'xl',
};

class ThemeService {
  private currentSettings: ThemeSettings;
  private listeners: Array<(settings: ThemeSettings) => void> = [];

  constructor() {
    this.currentSettings = this.loadFromStorage();
    this.applyToDOM(this.currentSettings);
    this.listenToSystemChanges();
  }

  private loadFromStorage(): ThemeSettings {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_THEME_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load theme settings from storage:', e);
    }
    return DEFAULT_THEME_SETTINGS;
  }

  public getSettings(): ThemeSettings {
    return { ...this.currentSettings };
  }

  public updateSettings(updates: Partial<ThemeSettings>): ThemeSettings {
    this.currentSettings = { ...this.currentSettings, ...updates };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentSettings));
    } catch (e) {
      console.error('Failed to save theme settings:', e);
    }
    this.applyToDOM(this.currentSettings);
    this.notifyListeners();
    return this.currentSettings;
  }

  public resetToDefault(): ThemeSettings {
    return this.updateSettings(DEFAULT_THEME_SETTINGS);
  }

  public subscribe(listener: (settings: ThemeSettings) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentSettings);
      } catch (e) {
        console.error('Theme listener error:', e);
      }
    }
  }

  private listenToSystemChanges(): void {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        if (this.currentSettings.displayMode === 'system') {
          this.applyToDOM(this.currentSettings);
        }
      });
    } catch {
      // Ignore in non-browser environments
    }
  }

  public getEffectiveDisplayMode(mode = this.currentSettings.displayMode): 'dark' | 'light' | 'high-contrast' {
    if (mode === 'system') {
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
      return 'dark';
    }
    return mode;
  }

  public getActiveAccentColor(): { hex: string; hoverHex: string; shadowColor: string } {
    if (this.currentSettings.accentColorId === 'custom') {
      const hex = this.currentSettings.customAccentHex || '#2563eb';
      return {
        hex,
        hoverHex: this.darkenHex(hex, 15),
        shadowColor: this.hexToRgba(hex, 0.35),
      };
    }
    const preset = ACCENT_PRESETS.find(p => p.id === this.currentSettings.accentColorId);
    if (preset) {
      return {
        hex: preset.hex,
        hoverHex: preset.hoverHex,
        shadowColor: preset.shadowColor,
      };
    }
    return {
      hex: '#2563eb',
      hoverHex: '#1d4ed8',
      shadowColor: 'rgba(37, 99, 235, 0.35)',
    };
  }

  public applyToDOM(settings = this.currentSettings): void {
    if (typeof document === 'undefined') return;

    const html = document.documentElement;
    const effectiveMode = this.getEffectiveDisplayMode(settings.displayMode);

    // Set attributes for CSS selectors
    html.setAttribute('data-theme', effectiveMode);
    html.setAttribute('data-ambiance', settings.darkAmbiance);
    html.setAttribute('data-density', settings.uiDensity);
    html.setAttribute('data-radius', settings.uiRadius);

    // Toggle classes
    if (effectiveMode === 'light') {
      html.classList.remove('dark', 'high-contrast');
      html.classList.add('light');
    } else if (effectiveMode === 'high-contrast') {
      html.classList.remove('light');
      html.classList.add('dark', 'high-contrast');
    } else {
      html.classList.remove('light', 'high-contrast');
      html.classList.add('dark');
    }

    // Custom CSS Variables for Accent Color
    const accent = this.getActiveAccentColor();
    html.style.setProperty('--color-accent', accent.hex);
    html.style.setProperty('--color-accent-hover', accent.hoverHex);
    html.style.setProperty('--color-accent-shadow', accent.shadowColor);
    html.style.setProperty('--color-accent-rgb', this.hexToRgbValues(accent.hex));

    // Dynamic style block injection to ensure complete deep theme coverage
    this.injectDynamicStyles(effectiveMode, settings.darkAmbiance, accent);
  }

  private injectDynamicStyles(
    effectiveMode: 'dark' | 'light' | 'high-contrast',
    ambiance: DarkAmbiance,
    accent: { hex: string; hoverHex: string; shadowColor: string }
  ): void {
    const styleId = 'mp-motors-dynamic-theme-style';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    let css = `
      :root {
        --color-accent: ${accent.hex};
        --color-accent-hover: ${accent.hoverHex};
        --color-accent-shadow: ${accent.shadowColor};
      }
      .bg-blue-600 {
        background-color: ${accent.hex} !important;
      }
      .hover\\:bg-blue-500:hover {
        background-color: ${accent.hoverHex} !important;
      }
      .text-blue-400, .text-blue-500 {
        color: ${accent.hex} !important;
      }
      .border-blue-500, .border-blue-600 {
        border-color: ${accent.hex} !important;
      }
      .shadow-blue-600\\/30, .shadow-blue-600\\/20 {
        box-shadow: 0 10px 15px -3px ${accent.shadowColor} !important;
      }
    `;

    if (effectiveMode === 'light') {
      css += `
        /* Light Theme Overrides */
        body {
          background-color: #f1f5f9 !important;
          color: #0f172a !important;
        }
        .bg-slate-950 {
          background-color: #f8fafc !important;
          color: #0f172a !important;
        }
        .bg-slate-900, .bg-slate-900\\/90, .bg-slate-900\\/95 {
          background-color: #ffffff !important;
          color: #0f172a !important;
        }
        .bg-slate-800, .bg-slate-800\\/80, .bg-slate-800\\/40 {
          background-color: #f1f5f9 !important;
          color: #1e293b !important;
        }
        .hover\\:bg-slate-800:hover, .hover\\:bg-slate-750:hover, .hover\\:bg-slate-700:hover {
          background-color: #e2e8f0 !important;
        }
        .border-slate-800, .border-slate-800\\/40, .border-slate-800\\/60 {
          border-color: #e2e8f0 !important;
        }
        .border-slate-700, .border-slate-700\\/60 {
          border-color: #cbd5e1 !important;
        }
        .text-slate-100 {
          color: #0f172a !important;
        }
        .text-slate-200 {
          color: #1e293b !important;
        }
        .text-slate-300 {
          color: #334155 !important;
        }
        .text-slate-400 {
          color: #64748b !important;
        }
        .text-slate-500 {
          color: #94a3b8 !important;
        }
        /* Keep white text on solid buttons like Valider, Primary Accent */
        .bg-blue-600, .bg-emerald-600, .bg-amber-600, .bg-red-600, .bg-indigo-600 {
          color: #ffffff !important;
        }
        .bg-blue-600 *, .bg-emerald-600 *, .bg-amber-600 *, .bg-red-600 *, .bg-indigo-600 * {
          color: #ffffff !important;
        }
        /* Select dropdowns and input fields in light mode */
        input:not([type="checkbox"]):not([type="radio"]), select, textarea {
          background-color: #ffffff !important;
          color: #0f172a !important;
          border-color: #cbd5e1 !important;
        }
        /* Custom scrollbar in light mode */
        ::-webkit-scrollbar-track {
          background: rgba(226, 232, 240, 0.8) !important;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.6) !important;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.9) !important;
        }
      `;
    } else if (effectiveMode === 'high-contrast') {
      css += `
        /* High Contrast Mode Overrides */
        body, .bg-slate-950, .bg-slate-900 {
          background-color: #000000 !important;
          color: #ffffff !important;
        }
        .bg-slate-800 {
          background-color: #111111 !important;
          color: #ffffff !important;
        }
        .border-slate-800, .border-slate-700 {
          border-color: #ffffff !important;
          border-width: 1.5px !important;
        }
        .text-slate-100, .text-slate-200, .text-slate-300, .text-slate-400 {
          color: #ffffff !important;
        }
      `;
    } else {
      // Dark mode variations based on ambiance
      if (ambiance === 'navy') {
        css += `
          body { background-color: #070e22 !important; }
          .bg-slate-950 { background-color: #070e22 !important; }
          .bg-slate-900 { background-color: #0d1a38 !important; }
          .bg-slate-800 { background-color: #14254f !important; }
          .border-slate-800 { border-color: #1b3164 !important; }
        `;
      } else if (ambiance === 'zinc') {
        css += `
          body { background-color: #09090b !important; }
          .bg-slate-950 { background-color: #09090b !important; }
          .bg-slate-900 { background-color: #18181b !important; }
          .bg-slate-800 { background-color: #27272a !important; }
          .border-slate-800 { border-color: #3f3f46 !important; }
        `;
      } else if (ambiance === 'oled') {
        css += `
          body { background-color: #000000 !important; }
          .bg-slate-950 { background-color: #000000 !important; }
          .bg-slate-900 { background-color: #080808 !important; }
          .bg-slate-800 { background-color: #121212 !important; }
          .border-slate-800 { border-color: #222222 !important; }
        `;
      }
    }

    styleEl.textContent = css;
  }

  private hexToRgbValues(hex: string): string {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `${r}, ${g}, ${b}`;
  }

  private hexToRgba(hex: string, alpha: number): string {
    return `rgba(${this.hexToRgbValues(hex)}, ${alpha})`;
  }

  private darkenHex(hex: string, percent: number): string {
    const clean = hex.replace('#', '');
    let num = parseInt(clean, 16);
    let r = (num >> 16) & 255;
    let g = (num >> 8) & 255;
    let b = num & 255;

    r = Math.max(0, Math.min(255, Math.floor(r * (1 - percent / 100))));
    g = Math.max(0, Math.min(255, Math.floor(g * (1 - percent / 100))));
    b = Math.max(0, Math.min(255, Math.floor(b * (1 - percent / 100))));

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
}

export const themeService = new ThemeService();
