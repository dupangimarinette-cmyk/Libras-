import React, { useState } from 'react';
import {
  Info,
  Sparkles,
  ShieldCheck,
  Heart,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  BookOpen,
  Users,
  Award,
  ExternalLink,
  Camera,
  CheckCircle2
} from 'lucide-react';
import { LibrinhaMascot } from '../Mascot/LibrinhaMascot';
import { audio } from '../../services/audioService';

interface AboutViewProps {
  onStartLearning: () => void;
  onOpenARStudio: () => void;
  onOpenWelcome?: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({
  onStartLearning,
  onOpenARStudio,
  onOpenWelcome,
}) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    audio.playClick();
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const faqs = [
    {
      q: 'A LIBRAS é uma língua universal?',
      a: 'Não! Cada país possui sua própria língua de sinais natural desenvolvida por sua comunidade surda. No Brasil temos a LIBRAS (Língua Brasileira de Sinais), nos Estados Unidos a ASL, em Portugal a LGP, etc. A LIBRAS possui gramática, sintaxe e vocabulário próprios e completos.',
    },
    {
      q: 'A câmera grava meus vídeos ou envia imagens para servidores?',
      a: 'Não! Toda a Inteligência Artificial de Visão Computacional (MediaPipe Hands) é executada 100% de forma local no seu próprio navegador e dispositivo. Nenhuma imagem ou vídeo de câmera é armazenado ou transmitido pela internet, garantindo privacidade total.',
    },
    {
      q: 'Por que a expressão facial é tão importante em Libras?',
      a: 'Em Libras, a Expressão Não-Manual (facial e corporal) é um parâmetro gramatical oficial e obrigatório. Ela desempenha o mesmo papel da entonação na fala: define se a frase é uma pergunta, exclamação, ironia, dúvida ou intensidade emocional.',
    },
    {
      q: 'O que acontece se eu perder minha Ofensiva (Streak)?',
      a: 'A cada dia consecutivo de treino você ganha +1 dia de ofensiva e bônus de XP. Se você possuir um "Bloqueio de Ofensiva" (Streak Freeze) equipado na Loja, sua sequência será salva automaticamente mesmo se passar 1 dia sem praticar.',
    },
    {
      q: 'Quem tem o direito de me dar um "Sinal" em Libras?',
      a: 'Na cultura surda tradicional, o "batismo de sinal" (seu nome em Libras) deve ser atribuído por uma pessoa surda que observe suas características, trejeitos ou personalidade. Ouvintes não devem inventar o próprio sinal!',
    },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 pb-28 text-white space-y-8">
      
      {/* Hero Banner */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 border border-emerald-500/30 shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sobre o LibrasGo AR</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-2">
              Aprendizado Gamificado de LIBRAS com Realidade Aumentada
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
              O <strong>LibrasGo</strong> nasceu com o propósito de tornar o aprendizado da Língua Brasileira de Sinais acessível, divertido e interativo para todos, combinando a gamificação viciante do Duolingo com a tecnologia de Realidade Aumentada e Visão Computacional em tempo real.
            </p>

            <div className="flex flex-wrap gap-2.5 justify-center sm:justify-start">
              <button
                onClick={onStartLearning}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
              >
                Continuar Trilha de Lições
              </button>
              <button
                onClick={onOpenARStudio}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Testar Estúdio AR</span>
              </button>
            </div>
          </div>

          <div className="flex-shrink-0">
            <LibrinhaMascot mood="cheering" size={120} message="Olá! Eu sou o Librinha, seu companheiro de sinais!" />
          </div>
        </div>
      </div>

      {/* Como Funciona a Tecnologia AR */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <h2 className="text-xl font-black text-white">Como Funciona a Tecnologia AR</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-black mb-3 text-lg">
              21
            </div>
            <h3 className="text-sm font-black text-white mb-1">Rastreamento Articular</h3>
            <p className="text-xs text-slate-400">
              A IA mapeia simultaneamente 21 pontos 3D dos nós dos dedos, palma e pulso para avaliar ângulos e curvaturas anatômicas.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black text-white mb-1">100% Privado & Local</h3>
            <p className="text-xs text-slate-400">
              O processamento ocorre diretamente no seu navegador via WebAssembly. Nenhuma gravação sai do seu dispositivo.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black text-white mb-1">Molde Holográfico</h3>
            <p className="text-xs text-slate-400">
              A silhueta guia virtual projeta a posição exata da mão no espaço tridimensional com esqueleto fluorescente de retorno imediato.
            </p>
          </div>
        </div>
      </div>

      {/* Os 5 Parâmetros Gramaticais da Libras */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-black text-white">Os 5 Parâmetros Gramaticais da LIBRAS</h2>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <p className="text-xs text-slate-300">
            Assim como as línguas orais combinam fonemas para formar palavras, a LIBRAS combina 5 parâmetros formais para construir cada sinal:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30">
              <strong className="text-emerald-400 block text-sm font-bold mb-0.5">1. CM • Configuração de Mão</strong>
              <p className="text-slate-300">A forma que os dedos assumem (existem mais de 60 configurações no inventário da Libras!).</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-cyan-500/30">
              <strong className="text-cyan-400 block text-sm font-bold mb-0.5">2. PA • Ponto de Articulação</strong>
              <p className="text-slate-300">O local do corpo ou no espaço neutro à frente onde o sinal é executado (testa, queixo, peito, etc.).</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30">
              <strong className="text-amber-400 block text-sm font-bold mb-0.5">3. M • Movimento</strong>
              <p className="text-slate-300">O tipo de deslocamento da mão (retilíneo, circular, oscilante, sinuoso ou estático).</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-purple-500/30">
              <strong className="text-purple-400 block text-sm font-bold mb-0.5">4. O • Orientação da Palma</strong>
              <p className="text-slate-300">A direção para onde a palma está voltada (para frente, para si, para cima, para baixo ou de lado).</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs">
            <strong className="text-rose-400 block text-sm font-bold mb-0.5">5. EF • Expressão Facial e Corporal (Não-Manual)</strong>
            <p className="text-slate-200">
              Fundamental! Sobrancelhas, boca, olhar e inclinação de cabeça diferenciam perguntas, afirmações e a intensidade do sinal.
            </p>
          </div>
        </div>
      </div>

      {/* Cultura Surda & Boas Maneiras */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-400" />
          <h2 className="text-xl font-black text-white">Etiqueta e Cultura Surda</h2>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs text-slate-300">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Mantenha contato visual:</strong> Para a pessoa surda, o contato visual é sinal de atenção e respeito. Desviar o olhar interrompe a comunicação.
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Não grite nem tape a boca:</strong> Aumentar o volume da voz não ajuda. Fale normalmente, com dicção clara, sem exagerar na articulação dos lábios.
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p>
              <strong>Para chamar a atenção:</strong> Toque suavemente no ombro ou braço da pessoa, ou acene no campo visual dela. Nunca jogue objetos.
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p>
              <strong>O termo correto é "Surdo" ou "Pessoa com Deficiência Auditiva":</strong> Evite termos pejorativos ou ultrapassados como "surdo-mudo", pois a pessoa surda possui cordas vocais perfeitamente saudáveis.
            </p>
          </div>
        </div>
      </div>

      {/* Perguntas Frequentes (FAQ) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-rose-400" />
          <h2 className="text-xl font-black text-white">Perguntas Frequentes (FAQ)</h2>
        </div>

        <div className="space-y-2.5">
          {faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;

            return (
              <div
                key={index}
                className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full p-4 text-left font-bold text-sm text-slate-100 flex items-center justify-between gap-3 hover:bg-slate-850 cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-slate-300 border-t border-slate-800/80 pt-3 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legislação e Reconhecimento Oficial */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1 text-center">
        <p className="font-bold text-slate-300">
          Reconhecimento Legal no Brasil • Lei nº 10.436 de 24 de abril de 2002
        </p>
        <p>
          A Língua Brasileira de Sinais (LIBRAS) é a língua natural da comunidade surda brasileira, possuindo status de sistema linguístico oficial no país.
        </p>
        <div className="pt-2 text-[11px] text-emerald-400/90 font-bold">
          LibrasGo AR • Versão 2.0 • Feito com dedicação para a inclusão social
        </div>
      </div>

      {onOpenWelcome && (
        <div className="pt-1 text-center">
          <button
            type="button"
            onClick={() => {
              audio.playClick();
              onOpenWelcome();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ver Tela Inicial de Boas-Vindas</span>
          </button>
        </div>
      )}

    </div>
  );
};
