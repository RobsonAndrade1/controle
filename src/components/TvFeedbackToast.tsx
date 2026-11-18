import React, { useEffect, useState } from 'react';
import { Tv, Volume2, VolumeX, CheckCircle, Radio } from 'lucide-react';

interface TvFeedbackToastProps {
  message: string | null;
  subMessage?: string;
}

export const TvFeedbackToast: React.FC<TvFeedbackToastProps> = ({ message, subMessage }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!visible || !message) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-in fade-in slide-in-from-top-3 duration-150">
      <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#1e222e]/95 backdrop-blur-md border border-[#38bdf8]/40 shadow-[0_4px_16px_rgba(0,0,0,0.8),0_0_12px_rgba(56,189,248,0.2)] text-white">
        <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
        <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wide">
          <span>{message}</span>
          {subMessage && (
            <span className="text-[10px] text-cyan-300/80 font-normal">({subMessage})</span>
          )}
        </div>
      </div>
    </div>
  );
};
