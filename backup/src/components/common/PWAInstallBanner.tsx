import React, { useState } from 'react';
import { Download, Share2, PlusSquare, X, Smartphone, CheckCircle, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { audio } from '../../services/audioService';

interface PWAInstallBannerProps {
  compact?: boolean;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // If already installed in standalone mode, don't show the banner
  if (isInstalled || isDismissed) {
    return null;
  }

  // Handle Android / Chromium native install
  const handleAndroidInstall = async () => {
    audio.playClick();
    const success = await install();
    if (success) {
      audio.playSuccess();
    }
  };

  // Compact button for Header or Profile
  if (compact) {
    if (isInstallable) {
      return (
        <button
          onClick={handleAndroidInstall}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 transition-transform active:scale-95 cursor-pointer"
          title="Instalar LibrasGo no seu celular ou computador"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Instalar App</span>
        </button>
      );
    }

    if (isIOS) {
      return (
        <>
          <button
            onClick={() => {
              audio.playClick();
              setShowIOSModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 font-bold text-xs transition-colors cursor-pointer"
            title="Instalar no iPhone / iPad"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Instalar no iOS</span>
          </button>

          {showIOSModal && (
            <IOSInstallModal onClose={() => setShowIOSModal(false)} />
          )}
        </>
      );
    }

    return null;
  }

  // Full-width floating card for users on mobile / web
  return (
    <>
      <div className="w-full rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/60 to-slate-900 border border-emerald-500/30 p-3.5 sm:p-4 shadow-xl flex items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 text-emerald-400">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">
                App Instalável (PWA)
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                iOS & Android
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Instale o LibrasGo na sua tela inicial para acesso rápido em tela cheia e offline!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isInstallable ? (
            <button
              onClick={handleAndroidInstall}
              className="px-3.5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Instalar</span>
            </button>
          ) : isIOS ? (
            <button
              onClick={() => {
                audio.playClick();
                setShowIOSModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-black text-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Como Instalar</span>
            </button>
          ) : (
            <button
              onClick={() => {
                audio.playClick();
                setShowIOSModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>Instalar</span>
            </button>
          )}

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
            title="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showIOSModal && (
        <IOSInstallModal onClose={() => setShowIOSModal(false)} />
      )}
    </>
  );
};

export const IOSInstallModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-emerald-500/40 p-6 shadow-2xl text-white text-center space-y-4">
        
        {/* Header icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/30 text-slate-950">
          <Smartphone className="w-7 h-7 stroke-[2.2]" />
        </div>

        <div>
          <h3 className="text-lg font-black text-white">Instalar no iPhone ou iPad</h3>
          <p className="text-xs text-slate-300 mt-1">
            Tenha a experiência completa do aplicativo nativo no iOS em 3 passos simples:
          </p>
        </div>

        {/* Step-by-step cards */}
        <div className="text-left space-y-2.5 bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800 text-xs text-slate-300">
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
              1
            </span>
            <div>
              No <strong>Safari</strong>, toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta para cima na barra inferior).
              <div className="inline-flex items-center gap-1 ml-1 text-emerald-400 font-bold">
                <Share2 className="w-3.5 h-3.5 inline" />
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
              2
            </span>
            <div>
              Role as opções para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.
              <div className="inline-flex items-center gap-1 ml-1 text-amber-400 font-bold">
                <PlusSquare className="w-3.5 h-3.5 inline" />
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-black flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
              3
            </span>
            <div>
              Confirme tocando em <strong>"Adicionar"</strong> no canto superior direito. Pronto! O LibrasGo estará na sua tela inicial!
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-transform active:scale-95 cursor-pointer"
        >
          Entendi, Vamos Lá!
        </button>
      </div>
    </div>
  );
};
