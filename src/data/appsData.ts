import { AppItem } from '../types';

export const ALL_AVAILABLE_APPS: AppItem[] = [
  { id: 'netflix', name: 'Netflix', color: '#e50914', category: 'Streaming', badge: 'N' },
  { id: 'primeVideo', name: 'Prime Video', color: '#00a8e1', category: 'Streaming', badge: 'prime' },
  { id: 'youtube', name: 'YouTube', color: '#ff0000', category: 'Streaming', badge: 'YT' },
  { id: 'disney', name: 'Disney+', color: '#113ccf', category: 'Streaming', badge: 'D+' },
  { id: 'globoplay', name: 'Globoplay', color: '#ff5500', category: 'Streaming', badge: 'Globo' },
  { id: 'max', name: 'Max (HBO)', color: '#002be7', category: 'Streaming', badge: 'MAX' },
  { id: 'appletv', name: 'Apple TV+', color: '#1c1c1e', category: 'Streaming', badge: 'tv+' },
  { id: 'spotify', name: 'Spotify', color: '#1db954', category: 'Música', badge: 'SP' },
  { id: 'twitch', name: 'Twitch', color: '#9146ff', category: 'Streaming', badge: 'TW' },
  { id: 'crunchyroll', name: 'Crunchyroll', color: '#f47521', category: 'Streaming', badge: 'CR' },
  { id: 'liveTv', name: 'TV ao Vivo', color: '#06b6d4', category: 'Canais', badge: 'TV' },
  { id: 'browser', name: 'Navegador Web', color: '#8b5cf6', category: 'Sistema', badge: 'WEB' },
];

export const DEFAULT_SHORTCUT_IDS: string[] = ['primeVideo', 'netflix', 'youtube'];

export const getSavedShortcuts = (): AppItem[] => {
  try {
    const saved = localStorage.getItem('lg_custom_shortcuts');
    if (saved) {
      const parsedIds: string[] = JSON.parse(saved);
      if (Array.isArray(parsedIds) && parsedIds.length === 3) {
        const found = parsedIds
          .map((id) => ALL_AVAILABLE_APPS.find((app) => app.id === id))
          .filter((app): app is AppItem => app !== undefined);
        if (found.length === 3) {
          return found;
        }
      }
    }
  } catch {
    // Retornar default se falhar
  }

  return DEFAULT_SHORTCUT_IDS.map((id) => ALL_AVAILABLE_APPS.find((a) => a.id === id)!);
};

export const saveCustomShortcuts = (shortcuts: AppItem[]) => {
  try {
    const ids = shortcuts.map((s) => s.id);
    localStorage.setItem('lg_custom_shortcuts', JSON.stringify(ids));
  } catch {
    // ignore
  }
};
