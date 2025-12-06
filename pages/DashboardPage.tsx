
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../App';
import { Music, ChevronDown, ShoppingBag, AlertCircle, Sparkles, X, Calendar, Mic, Clock, MapPin, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateSalesAnalysis } from '../services/geminiService';
import { ProjectService } from '../services/storage';
import { Project } from '../types';

export default function DashboardPage() {
  const { currentBand, userBands, switchBand, showLowStockAlerts } = useApp();
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);
  const navigate = useNavigate();
  
  // AI State
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Projects State
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    const loadProjects = async () => {
        if (!currentBand) return;
        try {
            const data = await ProjectService.getProjects(currentBand.id);
            setProjects(data);
        } catch (e) {
            console.error("Failed to load dashboard projects", e);
        }
    };
    loadProjects();
  }, [currentBand]);

  // Low Stock Items (Grouped by Product)
  const lowStockItems = useMemo(() => {
      if (!currentBand) return [];
      
      const items: { id: string; name: string; details: string }[] = [];
      
      currentBand.inventory.forEach(item => {
          // Find all variants of this item that are low stock
          const lowVariants = item.variants.filter(v => v.stock < 5);
          
          if (lowVariants.length > 0) {
              // Create a string description: "S: 2, M: 0"
              const details = lowVariants.map(v => `${v.label}: ${v.stock}`).join(', ');
              items.push({
                  id: item.id,
                  name: item.name,
                  details: `(${details})`
              });
          }
      });
      
      return items;
  }, [currentBand]);

  const upcomingEvents = useMemo(() => {
      return projects
        .filter(p => (p.type === 'EVENT' || p.type === 'REHEARSAL') && p.status === 'IN_PROGRESS')
        .sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : Infinity;
            const dateB = b.date ? new Date(b.date).getTime() : Infinity;
            return dateA - dateB;
        })
        .slice(0, 3);
  }, [projects]);

  const activeSongs = useMemo(() => {
      return projects
        .filter(p => p.type === 'SONG' && p.status === 'IN_PROGRESS')
        .slice(0, 3);
  }, [projects]);

  const calculateProgress = (tasks: any[]) => {
      if (!tasks || tasks.length === 0) return 0;
      const completed = tasks.filter(t => t.isCompleted).length;
      return Math.round((completed / tasks.length) * 100);
  };

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
      <div className="px-5 md:px-10 space-y-6">

        {/* AI ANALYTICS BLOCK */}
        {currentBand.sales.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/20 rounded-3xl p-5 relative overflow-hidden">
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
        {/* Only show if enabled in settings and not dismissed */}
        {showLowStockAlerts && !isAlertDismissed && lowStockItems.length > 0 && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-3xl p-4 flex flex-col gap-3 relative animate-fade-in">
                <button 
                    onClick={() => setIsAlertDismissed(true)}
                    className="absolute top-4 right-4 text-orange-400/50 hover:text-orange-400 transition-colors"
                >
                    <X size={18} />
                </button>

                <div className="flex items-center gap-2 text-orange-400">
                    <AlertCircle size={18} />
                    <span className="font-bold text-sm uppercase tracking-wide">Заканчиваются</span>
                </div>
                
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                    {lowStockItems.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-sm px-2 py-1 bg-orange-500/5 rounded-lg">
                            <span className="text-zinc-200 font-medium truncate pr-2">{item.name}</span>
                            <span className="text-orange-400 font-mono text-xs whitespace-nowrap">{item.details}</span>
                        </div>
                    ))}
                </div>
                
                <button 
                  onClick={() => navigate('/inventory')}
                  className="text-center text-xs text-orange-400/70 hover:text-orange-300 mt-1 font-bold uppercase"
                >
                    Перейти на склад
                </button>
            </div>
        )}

        {/* UPCOMING EVENTS */}
        {upcomingEvents.length > 0 && (
            <div className="space-y-3">
                 <div className="flex items-center justify-between px-2">
                     <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Ближайшие мероприятия</h3>
                     <button 
                        onClick={() => navigate('/projects')}
                        className="text-primary text-xs font-bold flex items-center gap-1"
                     >
                         Все <ArrowRight size={12} />
                     </button>
                 </div>
                 
                 <div className="space-y-2">
                     {upcomingEvents.map(event => (
                         <button 
                            key={event.id}
                            onClick={() => navigate('/projects?id=' + event.id)}
                            className="w-full bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between hover:bg-zinc-800 transition-colors"
                         >
                             <div className="flex items-center gap-4">
                                 <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                                     event.type === 'EVENT' ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500'
                                 }`}>
                                     <span className="text-sm font-bold">{event.date ? new Date(event.date).getDate() : '—'}</span>
                                     <span className="text-[10px] font-bold uppercase">{event.date ? new Date(event.date).toLocaleString('ru', {month: 'short'}) : ''}</span>
                                 </div>
                                 <div className="text-left min-w-0">
                                     <div className="font-bold text-white truncate">{event.title}</div>
                                     <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                                         {event.startTime && (
                                             <div className="flex items-center gap-1">
                                                 <Clock size={10} /> {event.startTime}
                                             </div>
                                         )}
                                         {event.location && (
                                             <div className="flex items-center gap-1 truncate">
                                                 <MapPin size={10} /> {event.location}
                                             </div>
                                         )}
                                     </div>
                                 </div>
                             </div>
                             {event.type === 'EVENT' ? <Calendar size={16} className="text-zinc-600" /> : <Mic size={16} className="text-zinc-600" />}
                         </button>
                     ))}
                 </div>
            </div>
        )}

        {/* SONG PROGRESS */}
        {activeSongs.length > 0 && (
            <div className="space-y-3">
                 <div className="flex items-center justify-between px-2">
                     <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Работа над песнями</h3>
                     <button 
                        onClick={() => navigate('/projects')}
                        className="text-primary text-xs font-bold flex items-center gap-1"
                     >
                         Все <ArrowRight size={12} />
                     </button>
                 </div>
                 
                 <div className="space-y-2">
                     {activeSongs.map(song => {
                         const progress = calculateProgress(song.tasks);
                         return (
                            <button 
                                key={song.id}
                                onClick={() => navigate('/projects?id=' + song.id)}
                                className="w-full bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl hover:bg-zinc-800 transition-colors"
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <div className="font-bold text-white text-sm flex items-center gap-2">
                                        <Music size={14} className="text-indigo-400" />
                                        {song.title}
                                    </div>
                                    <span className="text-xs font-bold text-zinc-500">{progress}%</span>
                                </div>
                                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full" 
                                        style={{ width: `${progress}%` }}
                                    ></div>
                                </div>
                            </button>
                         );
                     })}
                 </div>
            </div>
        )}
      
      </div>
    </div>
  );
}
