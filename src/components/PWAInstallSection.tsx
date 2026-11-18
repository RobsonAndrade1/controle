import React, { useState } from 'react';
import { Download, Smartphone, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { triggerHaptic } from '../services/haptics';

export const PWAInstallSection: React.FC<{ soundEnabled: boolean }> = ({ soundEnabled }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    triggerHaptic('medium', soundEnabled);
    setInstalling(true);
    await install();
    setInstalling(false);
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs">
        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>Instalado como aplicativo no dispositivo.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {isInstallable ? (
        <button
          type="button"
          onClick={handleInstall}
          disabled={installing}
          className="w-full py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{installing ? 'Instalando no Android...' : 'Instalar App no Android / Celular'}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light', soundEnabled);
            setShowGuide(!showGuide);
          }}
          className="w-full py-2.5 px-3 rounded-xl bg-black border border-neutral-700 hover:border-neutral-500 text-neutral-200 text-xs flex items-center justify-between transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold">Como instalar no Celular</span>
          </div>
          <span className="text-[10px] text-cyan-400">{showGuide ? 'Ocultar' : 'Ver instruções'}</span>
        </button>
      )}

      {showGuide && (
        <div className="p-3 rounded-xl bg-[#121319] border border-neutral-800 text-[11px] text-neutral-300 space-y-2 leading-relaxed">
          <p className="font-semibold text-white">No Android (Google Chrome):</p>
          <ol className="list-decimal list-inside space-y-1 text-neutral-400 pl-1">
            <li>Toque nos <strong className="text-neutral-200">três pontinhos (⋮)</strong> no topo do Chrome.</li>
            <li>Selecione <strong className="text-cyan-300">"Instalar aplicativo"</strong> ou "Adicionar à tela inicial".</li>
            <li>O app será adicionado com ícone e tela cheia sem barras de navegador.</li>
          </ol>
          {isIOS && (
            <>
              <p className="font-semibold text-white pt-1">No iPhone / iPad (Safari):</p>
              <ol className="list-decimal list-inside space-y-1 text-neutral-400 pl-1">
                <li>Toque no botão de Compartilhar (ícone com quadrado e seta para cima).</li>
                <li>Role e selecione "Adicionar à Tela de Início".</li>
              </ol>
            </>
          )}

        </div>
      )}
    </div>
  );
};
