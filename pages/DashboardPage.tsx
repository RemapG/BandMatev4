

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../App';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Music, ChevronDown, PlusCircle, ArrowUpRight, Edit2, Minus, Plus, Trash2, X, AlertCircle, Sparkles, PackageX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Sale, SaleItem, UserRole } from '../types';
import { BandService } from '../services/storage';
import { generateSalesAnalysis } from '../services/geminiService';

export default function DashboardPage() {
  const { currentBand, userBands, switchBand, currentUserRole, refreshData } = useApp();
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const navigate = useNavigate();

  // Edit Sale State
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editedItems, setEditedItems] = useState<SaleItem[]>([]);
  const [isDeletingSale, setIsDeletingSale] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // New state to lock actions
  
  // AI State
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Permissions
  const canEditSales = currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.MODERATOR;

  // Stats
  const stats = useMemo(() => {
    if (!currentBand) return { totalRevenue: 0, totalSales: 0, avgCheck: 0 };
    const totalRevenue = currentBand.sales.reduce((acc, s) => acc + s.total, 0);
    return {
      totalRevenue,
      totalSales: currentBand.sales.length,
      avgCheck: currentBand.sales.length > 0 ? Math.round(totalRevenue / currentBand.sales.length) : 0,
    };
  }, [currentBand]);

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

  // Chart Data: Sales by Date
  const chartData = useMemo(() => {
    if (!currentBand) return [];
    const dateMap: Record<string, number> = {};
    
    currentBand.sales.forEach(sale => {
      const date = new Date(sale.timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      dateMap[date] = (dateMap[date] || 0) + sale.total;
    });

    return Object.keys(dateMap).map(date => ({
      date,
      revenue: dateMap[date]
    }));
  }, [currentBand]);

  const recentSales = useMemo(() => {
    if (!currentBand) return [];
    return [...currentBand.sales].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);
  }, [currentBand]);

  // --- Handlers ---
  const handleOpenEdit = (sale: Sale) => {
      if (!canEditSales) return;
      setEditingSale(sale);
      setEditedItems(JSON.parse(JSON.stringify(sale.items))); // Deep copy
      setIsDeletingSale(false);
      setIsProcessing(false);
  };

  const handleUpdateQuantity = (idx: number, delta: number) => {
      const newItems = [...editedItems];
      const item = newItems[idx];
      const newQty = item.quantity + delta;
      
      if (newQty > 0) {
          item.quantity = newQty;
          setEditedItems(newItems);
      }
  };

  const handleRemoveItem = (idx: number) => {
      const newItems = [...editedItems];
      newItems.splice(idx, 1);
      setEditedItems(newItems);
  };

  const handleSaveSale = async () => {
      if (!currentBand || !editingSale || isProcessing) return;

      if (editedItems.length === 0) {
          // If all items removed, treat as delete
          setIsDeletingSale(true);
          return;
      }

      setIsProcessing(true);
      const newTotal = editedItems.reduce((acc, item) => acc + (item.priceAtSale * item.quantity), 0);
      const updatedSale: Sale = {
          ...editingSale,
          items: editedItems,
          total: newTotal
      };

      try {
          await BandService.updateSale(currentBand.id, editingSale, updatedSale);
          await refreshData();
          setEditingSale(null);
      } catch (e) {
          console.error(e);
          alert("Ошибка при обновлении продажи");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleDeleteSale = async () => {
      if (!currentBand || !editingSale || isProcessing) return;
      
      setIsProcessing(true);
      try {
          await BandService.deleteSale(currentBand.id, editingSale);
          await refreshData();
          setEditingSale(null);
      } catch (e) {
          console.error(e);
          alert("Ошибка при удалении продажи");
          setIsProcessing(false);
      }
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

  const editedTotal = editedItems.reduce((acc, item) => acc + (item.priceAtSale * item.quantity), 0);

  if (!currentBand) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-20 h-full">
      
      {/* HERO HEADER - BAND SWITCHER */}
      <div className="relative z-20 -mx-5 -mt-5 md:mx-0 md:mt-0 mb-8">
        <div className="absolute inset-0 overflow-hidden md:rounded-3xl">
            {/* Blurry Background Image */}
            {currentBand.imageUrl ? (
                 <img src={currentBand.imageUrl} className="w-full h-full object-cover blur-2xl opacity-40 scale-110" alt="" />
            ) : (
                 <div className="w-full h-full bg-gradient-to-br from-purple-900/40 via-black to-pink-900/40 blur-xl"></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/60 to-black"></div>
        </div>

        <div className="relative z-10 p-8 pt-12 flex flex-col items-center justify-center text-center">
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
      {lowStockItems.length > 0 && (
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
      )}

      {/* REVENUE STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="