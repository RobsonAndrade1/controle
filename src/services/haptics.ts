import { Haptics, ImpactStyle } from '@capacitor/haptics';

/**
 * Utilitário de feedback tátil (Haptic) e clique sonoro para simular controle físico
 * Utiliza o plugin nativo @capacitor/haptics para vibrar no hardware do Android
 * com fallback para a API navigator.vibrate
 */

let audioCtx: AudioContext | null = null;

export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'selection' = 'light', soundEnabled = true) => {
  // 1. Vibração via hardware nativo do Android através do Capacitor
  try {
    if (type === 'light') {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {
        Haptics.vibrate({ duration: 30 }).catch(() => {});
      });
    } else if (type === 'medium') {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {
        Haptics.vibrate({ duration: 50 }).catch(() => {});
      });
    } else if (type === 'heavy') {
      Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {
        Haptics.vibrate({ duration: 80 }).catch(() => {});
      });
    } else if (type === 'selection') {
      Haptics.selectionStart()
        .then(() => Haptics.selectionChanged())
        .catch(() => {
          Haptics.vibrate({ duration: 30 }).catch(() => {});
        });
    }
  } catch {
    // Falha silenciosa no Capacitor
  }

  // Fallback web standard navigator.vibrate para navegadores Android Chrome / WebView
  if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
    try {
      switch (type) {
        case 'light':
          navigator.vibrate(30);
          break;
        case 'medium':
          navigator.vibrate(55);
          break;
        case 'heavy':
          navigator.vibrate([60, 40, 60]);
          break;
        case 'selection':
          navigator.vibrate(35);
          break;
      }
    } catch {
      // Ignora caso o navegador bloqueie ou exija interação
    }
  }

  // 2. Clique de áudio tátil sintetizado
  if (soundEnabled && typeof window !== 'undefined') {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        if (!audioCtx) {
          audioCtx = new AudioContextClass();
        }
        if (audioCtx.state === 'suspended') {
          audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        const now = audioCtx.currentTime;
        const freq = type === 'light' ? 420 : type === 'medium' ? 320 : 220;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.04);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.045);
      }
    } catch {
      // Ignorar caso o contexto de áudio não possa ser iniciado
    }
  }
};
