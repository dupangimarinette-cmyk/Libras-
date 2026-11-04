import React, { useState } from 'react';
import { Search, Filter, Camera, Volume2, Sparkles, BookOpen, CheckCircle } from 'lucide-react';
import { LIBRAS_SIGNS } from '../../data/signsData';
import { LibrasSign } from '../../types/libras';
import { audio } from '../../services/audioService';
import { LibrasSignIllustration } from '../common/LibrasSignIllustration';

interface LibrasDexViewProps {
  signs?: LibrasSign[];
  onPracticeInAR: (signId: string) => void;
  masteredSignIds?: string[];
}

export const LibrasDexView: React.FC<LibrasDexViewProps> = ({
  signs,
  onPracticeInAR,
  masteredSignIds = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedSign, setSelectedSign] = useState<LibrasSign | null>(null);

  const allSigns = signs && signs.length > 0 ? signs : LIBRAS_SIGNS;

  const categories = [
    { id: 'todos', label: 'Todos os Sinais' },
    { id: 'comunidade', label: '🌟 Comunidade (Ensinados)' },
    { id: 'expressoes_faciais', label: '😊 Expressões Faciais' },
    { id: 'alfabeto', label: 'Alfabeto Manual' },
    { id: 'saudacoes', label: 'Saudações' },
    { id: 'respostas', label: 'Respostas' },
    { id: 'familia', label: 'Família & Pessoas' },
    { id: 'sentimentos', label: 'Sentimentos' },
    { id: 'numeros', label: 'Números' },
    { id: 'cotidiano', label: 'Cotidiano' },
    { id: 'alimentos', label: 'Alimentos' },
    { id: 'cores', label: 'Cores' },
    { id: 'lugares', label: 'Lugares' },
  ];

  const filteredSigns = allSigns.filter((sign) => {
    const matchesSearch =
      sign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sign.meaning.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isCommunity = Boolean(
      sign.isCustom ||
      sign.id.startsWith('taught_') ||
      sign.id.startsWith('face_taught_') ||
      sign.category === ('comunidade' as any) ||
      sign.imageUrl
    );

    const isFacial = Boolean(
      sign.id.startsWith('face_taught_') ||
      sign.parameters?.cm?.includes('Não-Manual') ||
      sign.parameters?.pa === 'Face / Expressão Visual' ||
      sign.parameters?.pa === 'Rosto / Face'
    );

    const matchesCategory =
      selectedCategory === 'todos'
        ? true
        : selectedCategory === 'comunidade'
        ? isCommunity
        : selectedCategory === 'expressoes_faciais'
        ? isFacial
        : sign.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handlePronounce = (name: string) => {
    if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(name);
      utter.lang = 'pt-BR';
      window.speechSynthesis.speak(utter);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 pb-24 text-white">
      
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <h1 className="text-xl sm:text-2xl font-black">LibrasDex: Glossário Interativo</h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-300">
          Consulte os 5 parâmetros gramaticais de cada sinal e pratique qualquer um deles na câmera em Realidade Aumentada.
        </p>
      </div>

      {/* Search & Category Filter */}
      <div className="space-y-3 mb-6">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou significado (ex: Oi, Amor, Letra L, Obrigado)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Categories scrollable pill list */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                audio.playClick();
                setSelectedCategory(cat.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Signs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {filteredSigns.map((sign) => {
          const isMastered = masteredSignIds.includes(sign.id);
          const isCommunity = Boolean(sign.isCustom || sign.id.startsWith('taught_') || sign.imageUrl);

          return (
            <div
              key={sign.id}
              onClick={() => {
                audio.playClick();
                setSelectedSign(sign);
              }}
              className="group p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/60 hover:bg-slate-850 transition-all cursor-pointer shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full ${
                    sign.id.startsWith('face_taught_')
                      ? 'bg-blue-500/20 text-cyan-300 border border-blue-500/40'
                      : isCommunity
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400'
                  }`}>
                    {sign.id.startsWith('face_taught_') ? '😊 Expressão Facial' : isCommunity ? '🌟 Comunidade' : sign.category}
                  </span>
                  {isMastered && (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                      <CheckCircle className="w-3 h-3" /> Dominado
                    </span>
                  )}
                </div>

                <div className="bg-slate-950/80 rounded-xl p-2 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform overflow-hidden min-h-[90px]">
                  {sign.imageUrl ? (
                    <img
                      src={sign.imageUrl}
                      alt={sign.name}
                      className="w-full h-24 object-cover rounded-lg border border-slate-800"
                    />
                  ) : (
                    <LibrasSignIllustration signId={sign.id} size={90} highlightColor="#6366f1" />
                  )}
                </div>

                <h3 className="text-sm font-black text-white group-hover:text-indigo-300 transition-colors">
                  {sign.name}
                </h3>
                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                  {sign.meaning}
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  audio.playClick();
                  onPracticeInAR(sign.id);
                }}
                className="mt-3 w-full py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Treinar em AR</span>
              </button>
            </div>
          );
        })}
      </div>

      {filteredSigns.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm">Nenhum sinal encontrado para "{searchTerm}".</p>
        </div>
      )}

      {/* Sign Detail Modal */}
      {selectedSign && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black">{selectedSign.name}</h2>
                <button
                  onClick={() => handlePronounce(selectedSign.name)}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400"
                  title="Ouvir"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setSelectedSign(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Fechar
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950 p-4 rounded-2xl mb-4 border border-slate-800">
              {selectedSign.imageUrl ? (
                <img
                  src={selectedSign.imageUrl}
                  alt={selectedSign.name}
                  className="w-28 h-28 object-cover rounded-xl border border-slate-700 shadow-md flex-shrink-0"
                />
              ) : (
                <LibrasSignIllustration signId={selectedSign.id} size={120} highlightColor="#6366f1" />
              )}
              <div className="text-center sm:text-left">
                <span className="text-xs uppercase font-extrabold tracking-wider text-indigo-400">
                  {selectedSign.category} • Nível {selectedSign.difficulty || 'iniciante'}
                </span>
                <p className="text-sm font-semibold text-slate-200 mt-1">{selectedSign.meaning}</p>
                <p className="text-xs text-slate-400 mt-2 italic">"{selectedSign.contextSentence || 'Praticando em Libras.'}"</p>
              </div>
            </div>

            {/* 5 Grammatical Parameters Breakdown */}
            <h4 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider mb-2">
              Estrutura Gramatical em Libras:
            </h4>
            <div className="space-y-2 text-xs mb-6">
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <strong className="text-emerald-400 block mb-0.5">Configuração de Mão (CM):</strong>
                <span className="text-slate-300">{selectedSign.parameters?.cm ?? 'Configuração gravada na IA'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <strong className="text-cyan-400 block mb-0.5">Ponto de Articulação (PA):</strong>
                <span className="text-slate-300">{selectedSign.parameters?.pa ?? 'Espaço neutro frontal'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <strong className="text-amber-400 block mb-0.5">Movimento (M):</strong>
                <span className="text-slate-300">{selectedSign.parameters?.m ?? 'Movimento expressivo'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <strong className="text-indigo-400 block mb-0.5">Orientação da Palma (O):</strong>
                <span className="text-slate-300">{selectedSign.parameters?.o ?? 'Orientada para a frente'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <strong className="text-rose-400 block mb-0.5">Expressão Facial / Não-Manual (EF):</strong>
                <span className="text-slate-300">{selectedSign.parameters?.ef ?? 'Expressão facial alinhada'}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedSign(null);
                  onPracticeInAR(selectedSign.id);
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-slate-950 font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/25"
              >
                <Camera className="w-4 h-4" />
                <span>Praticar Este Sinal em AR</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
