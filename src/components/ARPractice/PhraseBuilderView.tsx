import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Plus,
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Save,
  Trash2,
  Search,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  FolderHeart,
  Sparkles,
  Pencil,
  Check,
  RotateCcw,
  BookOpen,
  Layers,
  AlertCircle,
  Eye,
  Film,
} from 'lucide-react';
import { LibrasSign, UserStats, SavedPhraseItem } from '../../types/libras';
import { LibrasSignIllustration } from '../common/LibrasSignIllustration';
import { ARCameraView } from './ARCameraView';
import { storageService } from '../../services/storageService';
import { audio } from '../../services/audioService';

const MAX_SIGNS = 12;

interface Props {
  signs?: LibrasSign[];
  userStats?: UserStats;
  onSignCompleted?: (signId: string, accuracy: number) => void;
}

const SignPicture: React.FC<{ sign: LibrasSign; size: number }> = ({ sign, size }) =>
  sign.imageUrl ? (
    <img
      src={sign.imageUrl}
      alt={sign.name}
      style={{ width: size, height: size }}
      className="object-cover rounded-2xl shadow-md border border-white/10"
    />
  ) : (
    <div className="bg-slate-900/90 rounded-2xl p-2 border border-white/10 shadow-inner flex items-center justify-center">
      <LibrasSignIllustration signId={sign.id} size={size} />
    </div>
  );

export const PhraseBuilderView: React.FC<Props> = ({
  signs = [],
  userStats,
  onSignCompleted,
}) => {
  const [subTab, setSubTab] = useState<'builder' | 'saved'>('builder');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('todos');
  const [phrase, setPhrase] = useState<string[]>([]);
  const [customTitle, setCustomTitle] = useState('');
  const [saved, setSaved] = useState<SavedPhraseItem[]>(() => storageService.getSavedPhrases());
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warn' } | null>(null);

  // Edição rápida de título na lista de frases salvas
  const [editingPhraseId, setEditingPhraseId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Prática na câmera
  const [practice, setPractice] = useState<{ step: number; results: (number | null)[] } | null>(null);
  const countedRef = useRef<Set<number>>(new Set());

  // Mapeamento de sinais por ID
  const byId = useMemo(() => new Map(signs.map((s) => [s.id, s])), [signs]);
  const phraseSigns = useMemo(() => phrase.map((id) => byId.get(id)).filter(Boolean) as LibrasSign[], [phrase, byId]);
  const phraseText = useMemo(() => phraseSigns.map((s) => s.name).join(' '), [phraseSigns]);

  // Recarregar frases salvas ao montar ou se o perfil mudar
  useEffect(() => {
    const list = storageService.getSavedPhrases();
    setSaved(list);
  }, [userStats?.username]);

  // Limpa toast após alguns segundos
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Filtros de sinais disponíveis
  const categories = useMemo(() => [
    { id: 'todos', label: 'Todos' },
    { id: 'saudacoes', label: 'Saudações' },
    { id: 'respostas', label: 'Respostas' },
    { id: 'familia', label: 'Família' },
    { id: 'cotidiano', label: 'Cotidiano' },
    { id: 'sentimentos', label: 'Sentimentos' },
    { id: 'alfabeto', label: 'Alfabeto' },
  ], []);

  const filteredSigns = useMemo(() => {
    const q = query.trim().toLowerCase();
    return signs.filter((s) => {
      const matchQuery = !q || s.name.toLowerCase().includes(q) || s.meaning.toLowerCase().includes(q);
      const matchCategory = categoryFilter === 'todos' || s.category === categoryFilter;
      return matchQuery && matchCategory;
    }).slice(0, 80);
  }, [signs, query, categoryFilter]);

  // Reprodução automática: 2,5s por sinal
  useEffect(() => {
    if (!playing) return;
    if (step >= phraseSigns.length) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setStep((s) => s + 1), 2500);
    return () => clearTimeout(t);
  }, [playing, step, phraseSigns.length]);

  const addSign = (id: string) => {
    audio.playClick();
    setPhrase((prev) => (prev.length >= MAX_SIGNS ? prev : [...prev, id]));
  };

  const removeSign = (index: number) => {
    audio.playClick();
    setPhrase((prev) => prev.filter((_, idx) => idx !== index));
    if (step >= phrase.length - 1) {
      setStep(Math.max(0, phrase.length - 2));
    }
  };

  const moveSign = (index: number, direction: -1 | 1) => {
    audio.playClick();
    setPhrase((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  };

  const clearPhrase = () => {
    audio.playClick();
    setPhrase([]);
    setCustomTitle('');
    setPlaying(false);
    setStep(0);
  };

  const playPhrase = () => {
    if (!phraseSigns.length) return;
    audio.playClick();
    setStep(0);
    setPlaying(true);
  };

  // Salvar Frase (Persistente no localStorage + Conta / Firestore)
  const handleSavePhrase = () => {
    if (phrase.length === 0) {
      audio.playError();
      setToastMessage({ text: 'Adicione pelo menos um sinal antes de salvar a frase!', type: 'warn' });
      return;
    }

    const signNames = phraseSigns.map((s) => s.name);
    const resolvedTitle = customTitle.trim() || signNames.join(' ') || 'Minha Frase em Libras';

    try {
      const savedItem = storageService.savePhrase({
        title: resolvedTitle,
        signIds: phrase,
        signNames,
      });

      const updatedList = storageService.getSavedPhrases();
      setSaved(updatedList);
      audio.playSuccess();
      setSaveSuccess(true);
      setToastMessage({ text: `Frase "${resolvedTitle}" salva com sucesso!`, type: 'success' });

      setTimeout(() => {
        setSaveSuccess(false);
      }, 3500);
    } catch (err) {
      console.error('Erro ao salvar frase:', err);
      setToastMessage({ text: 'Erro ao salvar frase. Tente novamente.', type: 'warn' });
    }
  };

  // Carregar frase salva para o editor
  const handleLoadSavedPhrase = (item: SavedPhraseItem) => {
    audio.playClick();
    const validIds = item.signIds.filter((id) => byId.has(id));
    setPhrase(validIds.length > 0 ? validIds : item.signIds);
    setCustomTitle(item.title);
    setStep(0);
    setPlaying(false);
    setSubTab('builder');
    setToastMessage({ text: `Frase "${item.title}" carregada no montador!`, type: 'success' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Excluir frase salva
  const handleDeleteSavedPhrase = (id: string, title: string) => {
    audio.playClick();
    storageService.deletePhrase(id);
    const updated = storageService.getSavedPhrases();
    setSaved(updated);
    setToastMessage({ text: `Frase "${title}" excluída.`, type: 'warn' });
  };

  // Renomear frase
  const handleSaveRenamedTitle = (id: string) => {
    if (!editingTitle.trim()) return;
    storageService.updatePhraseTitle(id, editingTitle.trim());
    setSaved(storageService.getSavedPhrases());
    setEditingPhraseId(null);
    audio.playSuccess();
    setToastMessage({ text: 'Título da frase atualizado!', type: 'success' });
  };

  // Iniciar Prática na Câmera
  const startCameraPractice = (signIdsToPractice?: string[]) => {
    const targetIds = signIdsToPractice || phrase;
    const targetSigns = targetIds.map((id) => byId.get(id)).filter(Boolean) as LibrasSign[];
    if (!targetSigns.length) {
      setToastMessage({ text: 'Monte uma frase com sinais válidos para praticar na câmera.', type: 'warn' });
      return;
    }
    audio.playClick();
    setPlaying(false);
    countedRef.current = new Set();
    setPractice({ step: 0, results: targetSigns.map(() => null) });
  };

  const handlePracticeDone = (signId: string, accuracy: number) => {
    const pos = practice?.step;
    if (pos === undefined || phraseSigns[pos]?.id !== signId || countedRef.current.has(pos)) return;
    countedRef.current.add(pos);
    onSignCompleted?.(signId, accuracy);
    setPractice((cur) => {
      if (!cur || cur.step >= phraseSigns.length || phraseSigns[cur.step]?.id !== signId) return cur;
      if (cur.results[cur.step] !== null) return cur;
      const results = [...cur.results];
      results[cur.step] = Math.round(accuracy);
      return { ...cur, results };
    });
  };

  // Avança sinal da prática após acerto
  useEffect(() => {
    if (!practice || practice.step >= phraseSigns.length) return;
    if (practice.results[practice.step] === null) return;
    const t = setTimeout(() => setPractice((cur) => (cur ? { ...cur, step: cur.step + 1 } : cur)), 1800);
    return () => clearTimeout(t);
  }, [practice, phraseSigns.length]);

  const showingSign = phraseSigns[Math.min(step, phraseSigns.length - 1)];

  // -------------------------------------------------------------
  // MODO CÂMERA AR EM EXECUÇÃO
  // -------------------------------------------------------------
  if (practice) {
    const finished = practice.step >= phraseSigns.length;
    const done = practice.results.filter((r) => r !== null) as number[];
    const avg = done.length ? Math.round(done.reduce((a, b) => a + b, 0) / done.length) : 0;
    const current = phraseSigns[practice.step];

    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-5 pb-24 flex flex-col gap-4 animate-fade-in">
        <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Praticar Frase na Câmera</h2>
              <p className="text-xs text-slate-400">Sinalize cada sinal em sequência diante da IA</p>
            </div>
          </div>
          <button
            onClick={() => {
              audio.playClick();
              setPractice(null);
            }}
            className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" /> Sair
          </button>
        </div>

        <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-3 text-center">
          <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Frase em Prática</span>
          <p className="text-sm sm:text-base font-bold text-emerald-300 italic">"{phraseText}"</p>
        </div>

        {/* Marcadores de progresso dos sinais */}
        <ol className="flex flex-wrap gap-2 justify-center">
          {phraseSigns.map((sg, i) => {
            const r = practice.results[i];
            const isCurrent = !finished && i === practice.step;
            return (
              <li
                key={`${sg.id}-${i}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  r !== null
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-sm shadow-emerald-500/20'
                    : isCurrent
                    ? 'bg-sky-500/25 border-sky-400 text-sky-200 ring-2 ring-sky-500/40 animate-pulse'
                    : 'bg-slate-900 border-white/10 text-slate-400'
                }`}
              >
                {r !== null ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <span className="text-[10px] text-slate-500">{i + 1}.</span>}
                <span>{sg.name}</span>
                {r !== null && <span className="text-[10px] bg-emerald-950/80 px-1.5 py-0.5 rounded-md font-mono text-emerald-300">{r}%</span>}
              </li>
            );
          })}
        </ol>

        {finished ? (
          <div className="bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-6 text-center flex flex-col items-center gap-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl">
              🎉
            </div>
            <div>
              <p className="text-xl font-black text-white">Parabéns! Frase Concluída!</p>
              <p className="text-xs text-slate-400 mt-1">Você sinalizou todos os {phraseSigns.length} sinais da frase.</p>
            </div>
            <div className="bg-slate-950 px-4 py-2.5 rounded-2xl border border-emerald-500/20 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-300" />
              <span className="text-sm font-black text-slate-200">Precisão Média: <span className="text-emerald-400">{avg}%</span></span>
            </div>
            <div className="flex flex-wrap gap-2.5 justify-center mt-2">
              <button
                onClick={() => startCameraPractice()}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/30 hover:brightness-110 transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Praticar Novamente
              </button>
              <button
                onClick={() => setPractice(null)}
                className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black transition-all"
              >
                Voltar para o Montador
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="bg-sky-950/60 border border-sky-800/80 rounded-2xl px-4 py-2.5 text-center flex items-center justify-between">
              <span className="text-xs text-sky-200 font-bold">
                Sinal {practice.step + 1} de {phraseSigns.length}: faça <strong className="text-white underline underline-offset-2">"{current?.name}"</strong>
              </span>
              <button
                onClick={() => setPractice((cur) => (cur ? { ...cur, step: cur.step + 1 } : cur))}
                className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-colors"
              >
                Pular sinal
              </button>
            </div>
            <ARCameraView
              key={`${practice.step}-${current?.id}`}
              initialSignId={current?.id}
              signs={current ? [current] : undefined}
              isStandalone={false}
              onSignCompleted={handlePracticeDone}
            />
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // TELA PRINCIPAL (SUB-ABAS: MONTAR FRASE vs FRASES SALVAS)
  // -------------------------------------------------------------
  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 py-4 pb-28 flex flex-col gap-4 animate-fade-in">
      {/* Toast de Notificação */}
      {toastMessage && (
        <div
          className={`fixed top-16 right-4 z-50 px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-2 text-xs sm:text-sm font-bold animate-bounce-short ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500 text-emerald-200 shadow-emerald-900/50'
              : 'bg-amber-950/95 border-amber-500 text-amber-200 shadow-amber-900/50'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header com Navegação de Sub-Abas */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                Libras Conectada
              </span>
              <span className="text-[10px] text-slate-400 font-bold">
                Gramática e Expressão
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
              Montar Frases em Libras
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Escolha os sinais, monte frases completas, assista à reprodução e pratique na câmera.
            </p>
          </div>

          {/* Botões de Alternância entre Montador e Frases Salvas */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-white/10 self-start sm:self-auto">
            <button
              onClick={() => {
                audio.playClick();
                setSubTab('builder');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                subTab === 'builder'
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Montar Frase</span>
            </button>

            <button
              onClick={() => {
                audio.playClick();
                setSubTab('saved');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                subTab === 'saved'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FolderHeart className="w-3.5 h-3.5 text-pink-300" />
              <span>Frases Salvas</span>
              {saved.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-pink-500/30 text-pink-200 border border-pink-400/30">
                  {saved.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ABA 1: CONSTRUTOR DE FRASES (BUILDER) */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'builder' && (
        <div className="flex flex-col gap-4">
          {/* Caixa da Frase em Construção */}
          <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-sm font-black text-white">
                  Sua Frase Atual ({phrase.length}/{MAX_SIGNS})
                </h2>
              </div>
              {phrase.length > 0 && (
                <button
                  onClick={clearPhrase}
                  className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-800 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Limpar
                </button>
              )}
            </div>

            {phrase.length === 0 ? (
              <div className="text-center py-6 px-4 bg-slate-950/60 rounded-2xl border border-dashed border-slate-800 flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-400">
                  <Plus className="w-6 h-6 text-sky-400" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-300">
                  Sua frase está vazia.
                </p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Escolha os sinais no catálogo abaixo para montar sua frase em Libras.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Lista de Sinais em Sequência */}
                <ol className="flex flex-wrap gap-2 items-center">
                  {phraseSigns.map((s, i) => (
                    <li
                      key={`${s.id}-${i}`}
                      className="flex items-center gap-1 bg-gradient-to-r from-slate-800 to-slate-850 border border-slate-700/80 rounded-2xl pl-2.5 pr-1.5 py-1.5 text-xs font-bold text-white shadow-md hover:border-sky-500/50 transition-all"
                    >
                      <span className="text-[10px] text-sky-400 font-mono mr-0.5">{i + 1}.</span>
                      <span className="font-black text-slate-100">{s.name}</span>
                      <div className="flex items-center gap-0.5 ml-1 border-l border-slate-700 pl-1">
                        <button
                          onClick={() => moveSign(i, -1)}
                          disabled={i === 0}
                          title="Mover para trás"
                          className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                        >
                          <ArrowLeft className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => moveSign(i, 1)}
                          disabled={i === phraseSigns.length - 1}
                          title="Mover para frente"
                          className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
                        >
                          <ArrowRight className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeSign(i)}
                          title={`Remover ${s.name}`}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>

                {/* Tradução Contextual / Frase em Texto */}
                <div className="bg-slate-950/70 border border-white/5 rounded-2xl p-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-emerald-300 italic truncate">
                    "{phraseText}"
                  </p>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap ml-2">
                    {phrase.length} {phrase.length === 1 ? 'sinal' : 'sinais'}
                  </span>
                </div>

                {/* Player Visual do Sinal Atual */}
                {showingSign && (
                  <div className="flex flex-col items-center gap-3 bg-slate-950/90 rounded-2xl p-4 border border-white/10 shadow-inner">
                    <SignPicture sign={showingSign} size={140} />
                    <div className="text-center">
                      <p className="text-base font-black text-white">{showingSign.name}</p>
                      <p className="text-[11px] text-slate-400 max-w-sm mt-0.5">
                        {[showingSign.parameters?.cm, showingSign.parameters?.pa, showingSign.parameters?.m]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <p className="text-[11px] text-sky-400 font-bold mt-1">
                        Sinal {Math.min(step, phraseSigns.length - 1) + 1} de {phraseSigns.length}
                      </p>
                    </div>

                    {/* Controles de Reprodução */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          audio.playClick();
                          setPlaying(false);
                          setStep((s) => Math.max(0, s - 1));
                        }}
                        aria-label="Sinal anterior"
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                      >
                        <SkipBack className="w-4 h-4" />
                      </button>

                      {playing ? (
                        <button
                          onClick={() => {
                            audio.playClick();
                            setPlaying(false);
                          }}
                          className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md transition-all"
                        >
                          <Pause className="w-4 h-4" /> Pausar
                        </button>
                      ) : (
                        <button
                          onClick={playPhrase}
                          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
                        >
                          <Play className="w-4 h-4" /> Ver Frase em Ação
                        </button>
                      )}

                      <button
                        onClick={() => {
                          audio.playClick();
                          setPlaying(false);
                          setStep((s) => Math.min(phraseSigns.length - 1, s + 1));
                        }}
                        aria-label="Próximo sinal"
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Campo de Título da Frase e Botões de Ação */}
                <div className="pt-2 border-t border-slate-800 flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-400">
                      Nome da Frase (opcional):
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder={`Ex: ${phraseText || 'Minha frase'}`}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500 transition-colors"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {/* Botão Salvar Frase com Feedback Visual Instantâneo */}
                    <button
                      onClick={handleSavePhrase}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                        saveSuccess
                          ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/40 ring-2 ring-emerald-400 scale-102'
                          : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-indigo-500/25 hover:scale-102'
                      }`}
                    >
                      {saveSuccess ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Frase Salva com Sucesso!</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Salvar Frase</span>
                        </>
                      )}
                    </button>

                    {/* Botão Praticar na Câmera AR */}
                    <button
                      onClick={() => startCameraPractice()}
                      className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-sky-500/20 hover:scale-102 transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Praticar na Câmera</span>
                    </button>

                    {/* Atalho para Ver Frases Salvas se houver */}
                    {saved.length > 0 && (
                      <button
                        onClick={() => {
                          audio.playClick();
                          setSubTab('saved');
                        }}
                        className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
                      >
                        <FolderHeart className="w-3.5 h-3.5 text-pink-400" />
                        <span>Ver Salvas ({saved.length})</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Atalho rápido para frases salvas recentemente (aparece acima do catálogo de sinais para ficar sempre visível!) */}
          {saved.length > 0 && (
            <div className="bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900 border border-purple-500/20 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center flex-shrink-0">
                  <FolderHeart className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-white truncate">
                    Você tem {saved.length} {saved.length === 1 ? 'frase salva' : 'frases salvas'}
                  </p>
                  <p className="text-[11px] text-purple-300/80 truncate">
                    Última: "{saved[0].title}"
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleLoadSavedPhrase(saved[0])}
                  className="px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-black transition-colors"
                >
                  Carregar Última
                </button>
                <button
                  onClick={() => {
                    audio.playClick();
                    setSubTab('saved');
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition-colors"
                >
                  Ver Todas
                </button>
              </div>
            </div>
          )}

          {/* Catálogo de Sinais para Adicionar */}
          <section className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col gap-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white">Escolher Sinais para Adicionar</h3>
                <p className="text-xs text-slate-400">Clique nos sinais para incluí-los na sequência da frase</p>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {filteredSigns.length} disponíveis
              </span>
            </div>

            {/* Barra de Busca */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar sinal por nome ou significado (ex: oi, obrigado, comer...)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Chips de Categoria */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    audio.playClick();
                    setCategoryFilter(cat.id);
                  }}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                    categoryFilter === cat.id
                      ? 'bg-sky-500 text-slate-950 shadow-sm shadow-sky-500/20'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Grade de Sinais */}
            {filteredSigns.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Nenhum sinal encontrado para esta busca ou categoria.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[380px] overflow-y-auto pr-1">
                {filteredSigns.map((s) => {
                  const isInPhrase = phrase.includes(s.id);
                  const isMax = phrase.length >= MAX_SIGNS;

                  return (
                    <button
                      key={s.id}
                      onClick={() => addSign(s.id)}
                      disabled={isMax}
                      className={`flex items-center gap-2 p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        isInPhrase
                          ? 'bg-slate-850 border-sky-500/40 text-sky-200'
                          : 'bg-slate-950/70 hover:bg-slate-850 border-slate-800 text-slate-200 hover:border-slate-700'
                      } ${isMax ? 'opacity-40 cursor-not-allowed' : 'hover:scale-[1.01]'}`}
                    >
                      <div className="w-7 h-7 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center flex-shrink-0 text-emerald-400">
                        <Plus className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-black block truncate">{s.name}</span>
                        <span className="text-[10px] text-slate-500 block truncate capitalize">
                          {s.category}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ABA 2: MINHAS FRASES SALVAS */}
      {/* ------------------------------------------------------------- */}
      {subTab === 'saved' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderHeart className="w-5 h-5 text-pink-400" />
                <h2 className="text-sm font-black text-white">
                  Frases Salvas na sua Conta ({saved.length})
                </h2>
              </div>
              <button
                onClick={() => {
                  audio.playClick();
                  setSubTab('builder');
                }}
                className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Nova Frase
              </button>
            </div>

            {saved.length === 0 ? (
              <div className="text-center py-10 px-4 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-3xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center">
                  <FolderHeart className="w-7 h-7" />
                </div>
                <p className="text-sm font-black text-slate-200">
                  Nenhuma frase salva ainda
                </p>
                <p className="text-xs text-slate-400 max-w-sm">
                  Crie frases na aba <strong>"Montar Frase"</strong> e clique em <strong>"Salvar Frase"</strong> para guardá-las e praticar quando quiser.
                </p>
                <button
                  onClick={() => {
                    audio.playClick();
                    setSubTab('builder');
                  }}
                  className="mt-2 px-5 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black transition-all shadow-md shadow-sky-500/20 cursor-pointer"
                >
                  Começar a Montar Agora
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {saved.map((item) => {
                  const resolvedNames = item.signIds
                    .map((id) => byId.get(id)?.name)
                    .filter(Boolean) as string[];
                  const namesText = resolvedNames.length > 0 ? resolvedNames.join(' ') : (item.signNames?.join(' ') || item.title);
                  const isEditing = editingPhraseId === item.id;
                  const dateStr = new Date(item.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={item.id}
                      className="bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-3.5 flex flex-col gap-3 transition-all shadow-sm"
                    >
                      {/* Cabeçalho do Card da Frase */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                className="bg-slate-900 border border-sky-500 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none flex-1"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveRenamedTitle(item.id)}
                                className="p-1 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                                title="Salvar título"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingPhraseId(null)}
                                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                                title="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs sm:text-sm font-black text-white truncate">
                                {item.title}
                              </h4>
                              <button
                                onClick={() => {
                                  setEditingPhraseId(item.id);
                                  setEditingTitle(item.title);
                                }}
                                className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
                                title="Renomear frase"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                            Salva em {dateStr} · {item.signIds.length} sinais
                          </span>
                        </div>

                        {/* Botão de Excluir */}
                        <button
                          onClick={() => handleDeleteSavedPhrase(item.id, item.title)}
                          className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                          title="Excluir frase"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Lista de Sinais em Sequência (Tags) */}
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {item.signIds.map((id, idx) => {
                          const sg = byId.get(id);
                          const name = sg?.name || (item.signNames && item.signNames[idx]) || id;
                          return (
                            <span
                              key={`${id}-${idx}`}
                              className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300"
                            >
                              {name}
                            </span>
                          );
                        })}
                      </div>

                      {/* Botões de Ação do Card */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-900">
                        <button
                          onClick={() => handleLoadSavedPhrase(item)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Film className="w-3.5 h-3.5 text-sky-400" />
                          <span>Carregar no Player</span>
                        </button>

                        <button
                          onClick={() => {
                            handleLoadSavedPhrase(item);
                            startCameraPractice(item.signIds);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Praticar na Câmera</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
