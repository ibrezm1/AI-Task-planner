import { useEffect } from 'react';

export const THEME_PRESETS = [
  { id: 'dark', name: 'Glassmorphism Dark', dark: true },
  { id: 'cyberpunk', name: 'Midnight Cyberpunk', dark: true },
  { id: 'nordic', name: 'Nordic Light', dark: false },
  { id: 'mint', name: 'Forest Mint', dark: true }
];

export const ACCENT_COLORS = [
  { name: 'Amethyst', value: '#8b5cf6' },
  { name: 'Cyan Glow', value: '#06b6d4' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Rose Petal', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Slate Gray', value: '#475569' }
];

export const applyTheme = (themeId, accentColor, borderRadius) => {
  const root = document.documentElement;
  
  // Clean theme classes
  root.classList.remove('theme-cyberpunk', 'theme-nordic', 'theme-mint');
  
  if (themeId && themeId !== 'dark') {
    root.classList.add(`theme-${themeId}`);
  }
  
  // Update accent color
  if (accentColor) {
    root.style.setProperty('--accent-color', accentColor);
    
    // Parse hex to rgb for rgba transparency layers
    const hex = accentColor.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      root.style.setProperty('--accent-color-rgb', `${r}, ${g}, ${b}`);
      root.style.setProperty('--accent-glow', `rgba(${r}, ${g}, ${b}, 0.25)`);
      
      // Compute hover state color (darken slightly for light, lighten for dark)
      const darken = themeId === 'nordic';
      const factor = darken ? 0.85 : 1.15;
      const hr = Math.min(255, Math.max(0, Math.round(r * factor)));
      const hg = Math.min(255, Math.max(0, Math.round(g * factor)));
      const hb = Math.min(255, Math.max(0, Math.round(b * factor)));
      const hoverHex = `#${((1 << 24) + (hr << 16) + (hg << 8) + hb).toString(16).slice(1)}`;
      root.style.setProperty('--accent-hover', hoverHex);
    }
  }

  // Update border radius
  if (borderRadius !== undefined) {
    root.style.setProperty('--border-radius', `${borderRadius}px`);
  }
};

export default function ThemeManager({ theme, accentColor, borderRadius }) {
  useEffect(() => {
    applyTheme(theme, accentColor, borderRadius);
  }, [theme, accentColor, borderRadius]);

  return null;
}
