import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  AlertTriangle,
  Lightbulb,
  ThumbsUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  MessageCircle,
  HelpCircle,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { UserFeedback, FeedbackType, FeedbackStatus } from '../../types/libras';
import { adminService } from '../../services/adminService';
import { audio } from '../../services/audioService';

interface FeedbackViewProps {
  currentUsername: string;
  syncCode?: string;
  onNavigateToTab?: (tab: any) => void;
}

export const FeedbackView: React.FC<FeedbackViewProps> = ({
  currentUsername,
  syncCode,
  onNavigateToTab,
}) => {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('sugestao');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'baixa' | 'media' | 'alta'>('media');
  const [authorName, setAuthorName] = useState(
    currentUsername === 'Você (Aprendiz)' ? '' : currentUsername
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // History of feedbacks from this learner
  const [userFeedbacks, setUserFeedbacks] = useState<UserFeedback[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'todos' | 'pendente' | 'resolvido'>('todos');

  const loadMyFeedbacks = useCallback(async () => {
    const userToFetch = authorName.trim() || currentUsername;
    if (!userToFetch || userToFetch === 'Você (Aprendiz)') return;
    setIsLoadingHistory(true);
    try {
      const list = await adminService.getFeedbacks(userToFetch);
      setUserFeedbacks(list);
    } catch {
      // ignore
    } finally {
      setIsLoadingHistory(false);
    }
  }, [authorName, currentUsername]);

  useEffect(() => {
    loadMyFeedbacks();
  }, [loadMyFeedbacks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    const cleanUser = (authorName.trim() || currentUsername || '').trim();
    if (!cleanUser || cleanUser.length < 2) {
      setSubmitError('Por favor, informe seu nome de usuário antes de enviar.');
      audio.playError();
      return;
    }

    if (!title.trim() || title.trim().length < 3) {
      setSubmitError('Digite um título ou resumo para o seu feedback (mínimo 3 caracteres).');
      audio.playError();
      return;
    }

    if (!description.trim() || description.trim().length < 5) {
      setSubmitError('Descreva seu feedback com mais detalhes (mínimo 5 caracteres).');
      audio.playError();
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await adminService.submitFeedback({
        username: cleanUser,
        syncCode,
        type: feedbackType,
        title: title.trim(),
        description: description.trim(),
        priority,
      });

      if (res.success) {
        audio.playSuccess();
        setSubmitSuccess('Feedback enviado com sucesso ao administrador! Sua mensagem foi gravada no banco.');
        setTitle('');
        setDescription('');
        setPriority('media');
        await loadMyFeedbacks();
      } else {
        audio.playError();
        setSubmitError(res.message || 'Erro ao enviar feedback.');
      }
    } catch {
      audio.playError();
      setSubmitError('Falha ao conectar com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: FeedbackStatus) => {
    switch (status) {
      case 'resolvido':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Resolvido
          </span>
        );
      case 'em_analise':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" /> Em Análise
          </span>
        );
      case 'arquivado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
            Arquivado
          </span>
        );
      case 'pendente':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3 text-amber-400" /> Pendente
          </span>
        );
    }
  };

  const getTypeIcon = (type: FeedbackType) => {
    switch (type) {
      case 'sugestao':
        return <Lightbulb className="w-4 h-4 text-amber-400" />;
      case 'erro':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'reclamacao':
        return <AlertCircle className="w-4 h-4 text-orange-400" />;
      case 'elogio':
        return <ThumbsUp className="w-4 h-4 text-emerald-400" />;
    }
  };

  const filteredFeedbacks = userFeedbacks.filter((fb) => {
    if (activeFilter === 'todos') return true;
    if (activeFilter === 'pendente') return fb.status === 'pendente' || fb.status === 'em_analise';
    if (activeFilter === 'resolvido') return fb.status === 'resolvido';
    return true;
  });

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-28 text-white space-y-6">
      
      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-teal-950/80 via-slate-900 to-indigo-950/80 border border-teal-500/30 shadow-xl flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Canal de Escuta do Aluno
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            Envie seu Feedback ao Administrador
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-md">
            Sua opinião molda o LibrasGo! Envie sugestões de novos sinais, relate erros técnicos na câmera ou deixe sua mensagem para a equipe.
          </p>
        </div>
        <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 items-center justify-center text-3xl">
          💬
        </div>
      </div>

      {/* Main Feedback Form */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
        <h2 className="text-sm font-black uppercase tracking-wider text-teal-400 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Novo Relato / Mensagem
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Tipo de Feedback:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  audio.playClick();
                  setFeedbackType('sugestao');
                }}
                className={`p-2.5 rounded-2xl border text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  feedbackType === 'sugestao'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/20 scale-102'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>Sugestão</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audio.playClick();
                  setFeedbackType('erro');
                }}
                className={`p-2.5 rounded-2xl border text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  feedbackType === 'erro'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-lg shadow-rose-500/20 scale-102'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Erro / Bug</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audio.playClick();
                  setFeedbackType('reclamacao');
                }}
                className={`p-2.5 rounded-2xl border text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  feedbackType === 'reclamacao'
                    ? 'bg-orange-500/20 border-orange-500 text-orange-300 shadow-lg shadow-orange-500/20 scale-102'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <AlertCircle className="w-4 h-4 text-orange-400" />
                <span>Reclamação</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audio.playClick();
                  setFeedbackType('elogio');
                }}
                className={`p-2.5 rounded-2xl border text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  feedbackType === 'elogio'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-500/20 scale-102'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <ThumbsUp className="w-4 h-4 text-emerald-400" />
                <span>Elogio</span>
              </button>
            </div>
          </div>

          {/* Author Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Seu Nome de Usuário (Identificação da Conta Real):
            </label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Ex: João Silva, Ana Beatriz"
              maxLength={25}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold text-xs focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 transition-all placeholder:text-slate-600"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Assunto / Resumo:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Sugestão de sinais de profissões / Câmera travando na lição 3..."
              maxLength={80}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white font-bold text-xs focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 transition-all placeholder:text-slate-600"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Nível de Urgência:
            </label>
            <div className="flex items-center gap-2">
              {(['baixa', 'media', 'alta'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    audio.playClick();
                    setPriority(p);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold capitalize transition-all cursor-pointer ${
                    priority === p
                      ? p === 'alta'
                        ? 'bg-rose-500 text-white font-black'
                        : p === 'media'
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-teal-500 text-slate-950 font-black'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Mensagem Detalhada:
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Conte detalhadamente o que aconteceu, qual lição ou sinal você estava praticando, ou qual melhoria gostaria de ver no aplicativo..."
              maxLength={1000}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs leading-relaxed focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20 transition-all placeholder:text-slate-600 resize-none"
            />
          </div>

          {/* Feedback Messages */}
          {submitSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{submitSuccess}</span>
            </div>
          )}

          {submitError && (
            <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 font-black text-sm shadow-xl shadow-teal-500/25 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Gravando no Banco de Dados...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Enviar Feedback ao Administrador</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-3 border-t border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-teal-400 flex-shrink-0" />
          <span>Todos os relatos são gravados no banco em nuvem e analisados diretamente pelo administrador do LibrasGo.</span>
        </div>
      </div>

      {/* History of Sent Feedbacks */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-teal-400" />
              Seus Feedbacks Enviados
            </h2>
            <p className="text-[11px] text-slate-400">
              Acompanhe as respostas oficiais e a resolução de cada mensagem enviada por você.
            </p>
          </div>
          <button
            type="button"
            onClick={loadMyFeedbacks}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Atualizar respostas"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(['todos', 'pendente', 'resolvido'] as const).map((flt) => (
            <button
              key={flt}
              onClick={() => setActiveFilter(flt)}
              className={`px-3 py-1 rounded-xl text-xs font-extrabold capitalize transition-all cursor-pointer ${
                activeFilter === flt
                  ? 'bg-teal-500 text-slate-950 font-black'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {flt === 'todos' ? 'Todos' : flt === 'pendente' ? 'Em Aberto' : 'Resolvidos'}
            </button>
          ))}
        </div>

        {/* Feedbacks List */}
        {filteredFeedbacks.length > 0 ? (
          <div className="space-y-3">
            {filteredFeedbacks.map((fb) => (
              <div
                key={fb.id}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-teal-500/40 transition-all space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(fb.type)}
                    <span className="text-xs font-black text-white">{fb.title}</span>
                  </div>
                  {getStatusBadge(fb.status)}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed pl-6">
                  {fb.description}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-850 pl-6">
                  <span>Enviado por: <strong className="text-slate-400">{fb.username}</strong></span>
                  <span>{new Date(fb.createdAt).toLocaleDateString('pt-BR')} às {new Date(fb.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {/* Admin Official Response */}
                {fb.adminReply && (
                  <div className="mt-2.5 p-3 rounded-xl bg-teal-950/40 border border-teal-500/30 text-xs space-y-1">
                    <span className="font-black text-teal-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                      Resposta Oficial do Administrador:
                    </span>
                    <p className="text-slate-200 leading-relaxed text-[11px]">
                      {fb.adminReply}
                    </p>
                    {fb.repliedAt && (
                      <span className="text-[10px] text-teal-400/70 block">
                        Respondido em {new Date(fb.repliedAt).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400">
              {isLoadingHistory ? 'Carregando seus feedbacks...' : 'Nenhum feedback registrado ainda.'}
            </p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              Utilize o formulário acima para enviar sugestões ou apontar correções para a equipe de administração.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
