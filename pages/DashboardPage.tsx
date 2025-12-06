import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { Music, ChevronDown, ShoppingBag, AlertCircle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateSalesAnalysis } from '../services/geminiService';

export default function DashboardPage() {
  const { currentBand, userBands, switchBand } = useApp();
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const navigate = useNavigate();
  
  // AI State
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Low Stock Items
  const lowStockItems = useMemo(() => {
      if (!currentBand) return [];
      const low: { name: string; variant: string; stock: number }[] = [];
      currentBand.inventory.forEach(item => {
          item.variants.forEach(v => {
              if (v.stock < 5) {
                  low.push({ name: item.name, variant: v.label, stock: v.stock });
              }
          });
      });
      return low.slice(0, 3); // Show top 3
  }, [currentBand]);

  const handleGenerateAnalysis = async () => {
      if (!currentBand || isAnalyzing) return;
      setIsAnalyzing(true);
      setAiAnalysis(null);
      try {
          const result = await generateSalesAnalysis(currentBand);
          setAiAnalysis(result);
      } catch (e) {
          console.error(e);
          setAiAnalysis("Не удалось связаться с аналитиком.");
      } finally {
          setIsAnalyzing(false);
      }
  };

  if (!currentBand) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-20 h-full">
      
      {/* HERO HEADER - BAND SWITCHER */}
      {/* 
          LAYOUT FIX:
          - No negative margins used anymore because App.tsx wrapper has no padding.
          - Hero image is full width by default.
          - Top padding is added to content to account for status bar (Safe Area).
      */}
      <div className="relative z-20 mb-8">
        <div className="absolute inset-0 overflow-hidden md:rounded-b-3xl">
            {/* Blurry Background Image */}
            {currentBand.imageUrl ? (
                 <img src={currentBand.imageUrl} className="w-full h-full object-cover blur-2xl opacity-40 scale-110" alt="" />
            ) : (
                 <div className="w-full h-full bg-gradient-to-br from-purple-900/40 via-black to-pink-900/40 blur-xl"></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/60 to-black"></div>
        </div>

        {/* Content Padding: Standard + Safe Area */}
        <div className="relative z-10 p-8 pt-[calc(3rem+env(safe-area-inset-top))] flex flex-col items-center justify-center text-center">
             <button 
                onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                className="relative group"
             >
                <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-primary via-purple-500 to-secondary shadow-[0_0_40px_rgba(139,92,246,0.5)] mb-4 mx-auto transition-transform group-active:scale-95">
                    <div className="w-full h-full rounded-full bg-black overflow-hidden border-4 border-black relative">
                         {currentBand.imageUrl ? (
                             <img src={currentBand.imageUrl} className="w-full h-full object-cover" alt="" />
                         ) : (
                             <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                                 <Music size={40} className="text-zinc-600" />
                             </div>
                         )}
                         {/* Edit Overlay */}
                         <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <ChevronDown className="text-white" />
                         </div>
                    </div>
                </div>
                
                <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase drop-shadow-lg flex items-center justify-center gap-2">
                    {currentBand.name}
                </h1>
                <p className="text-primary font-bold text-xs uppercase tracking-[0.3em] mt-1 opacity-80">
                    Dashboard
                </p>
             </button>

             {/* Dropdown Menu */}
             {isSwitcherOpen && (
                <div className="absolute top-full mt-2 bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 p-2 rounded-2xl shadow-2xl w-64 animate-slide-up text-left">
                    {userBands.map(band => (
                        <button
                            key={band.id}
                            onClick={() => { switchBand(band.id); setIsSwitcherOpen(false); }}
                            className={`w-full p-3 rounded-xl flex items-center gap-3 transition-colors ${
                                band.id === currentBand.id ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <div className="w-8 h-8 rounded-full bg-black overflow-hidden">
                                {band.imageUrl ? <img src={band.imageUrl} className="w-full h-full object-cover" /> : null}
                            </div>
                            <span className="font-bold text-sm truncate">{band.name}</span>
                        </button>
                    ))}
                    <div className="h-px bg-zinc-800 my-1"></div>
                    <button onClick={() => navigate('/onboarding')} className="w-full p-3 text-left text-xs text-primary font-bold uppercase tracking-wider hover:bg-primary/10 rounded-xl transition-colors">
                        + Добавить группу
                    </button>
                </div>
             )}
        </div>
      </div>

      {/* Main Content Wrapper with Padding */}
      <div className="px-5 md:px-10">

        {/* AI ANALYTICS BLOCK */}
        {currentBand.sales.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/20 rounded-3xl p-5 relative overflow-hidden mb-8">
                <div className="flex items-center justify-between mb-3 relative z-10">
                    <div className="flex items-center gap-2">
                        <Sparkles size={20} className="text-indigo-400" />
                        <h3 className="text-indigo-100 font-bold text-sm uppercase tracking-wide">AI Аналитик</h3>
                    </div>
                    {!aiAnalysis && !isAnalyzing && (
                      <button 
                          onClick={handleGenerateAnalysis}
                          className="bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
                      >
                          Сгенерировать
                      </button>
                    )}
                </div>

                {isAnalyzing && (
                    <div className="flex items-center gap-3 text-zinc-400 text-sm animate-pulse">
                        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                        Анализирую данные о продажах...
                    </div>
                )}

                {aiAnalysis && (
                    <div className="animate-fade-in">
                        <p className="text-indigo-100 text-sm leading-relaxed whitespace-pre-line">
                            {aiAnalysis}
                        </p>
                        <button 
                          onClick={() => setAiAnalysis(null)}
                          className="text-[10px] text-indigo-400/70 hover:text-indigo-300 mt-2 uppercase font-bold"
                        >
                            Скрыть
                        </button>
                    </div>
                )}
            </div>
        )}

        {/* LOW STOCK ALERT */}
        {lowStockItems.length > 0 ? (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-3xl p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-orange-400 mb-1">
                    <AlertCircle size={18} />
                    <span className="font-bold text-sm uppercase tracking-wide">Заканчиваются</span>
                </div>
                {lowStockItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm px-2">
                        <span className="text-zinc-300">{item.name} <span className="text-zinc-500">({item.variant})</span></span>
                        <span className="text-orange-400 font-mono font-bold">{item.stock} шт</span>
                    </div>
                ))}
                <button 
                  onClick={() => navigate('/inventory')}
                  className="text-center text-xs text-orange-400/70 hover:text-orange-300 mt-1 font-bold uppercase"
                >
                    Перейти на склад
                </button>
            </div>
        ) : (
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl p-4 flex items-center gap-3 text-zinc-500">
               <div className="p-2 bg-green-500/10 rounded-full text-green-500">
                  <ShoppingBag size={16} />
               </div>
               <span className="text-sm">Товаров на складе достаточно</span>
          </div>
        )}
      
      </div>
    </div>
  );
}