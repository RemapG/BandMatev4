
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../App';
import { TrendingUp, DollarSign, Music, ChevronDown, PlusCircle, ArrowUpRight, Edit2, Minus, Plus, Trash2, X, AlertCircle, Sparkles, Package, ShoppingBag } from 'lucide-react';
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
  const [isProcessing, setIsProcessing] = useState(false);
  
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
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                  <DollarSign size={80} className="text-primary" />
              </div>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Выручка</p>
              <h3 className="text-4xl font-black text-white tracking-tight">{stats.totalRevenue.toLocaleString()} ₽</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl">
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Продаж</p>
                  <h3 className="text-2xl font-bold text-white">{stats.totalSales}</h3>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl">
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Ср. Чек</p>
                  <h3 className="text-2xl font-bold text-white">{stats.avgCheck} ₽</h3>
              </div>
          </div>
      </div>

      {/* RECENT SALES */}
      <div>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 px-2">
              <TrendingUp size={20} className="text-primary" />
              Последние продажи
          </h3>
          
          {recentSales.length === 0 ? (
              <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-zinc-500">
                  <ShoppingBag size={32} className="mb-2 opacity-50" />
                  <p className="text-sm">Продаж пока нет</p>
                  <button onClick={() => navigate('/pos')} className="mt-4 text-primary font-bold text-sm">Перейти к кассе</button>
              </div>
          ) : (
              <div className="space-y-3">
                  {recentSales.map(sale => (
                      <button 
                        key={sale.id}
                        onClick={() => canEditSales && handleOpenEdit(sale)}
                        disabled={!canEditSales}
                        className={`w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between text-left transition-all ${canEditSales ? 'hover:bg-zinc-800 active:scale-[0.99]' : ''}`}
                      >
                          <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center font-bold text-zinc-500 text-xs flex-col">
                                  <span>{new Date(sale.timestamp).getDate()}</span>
                                  <span className="text-[10px] uppercase">{new Date(sale.timestamp).toLocaleString('ru', { month: 'short' })}</span>
                              </div>
                              <div>
                                  <div className="text-white font-bold">{sale.total} ₽</div>
                                  <div className="text-xs text-zinc-500 flex items-center gap-2">
                                     <span>{new Date(sale.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                     <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
                                     <span>{sale.items.length} поз.</span>
                                     <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
                                     <span>{sale.sellerName}</span>
                                  </div>
                              </div>
                          </div>
                          {canEditSales && (
                              <div className="p-2 bg-zinc-800 rounded-full text-zinc-500">
                                  <Edit2 size={14} />
                              </div>
                          )}
                      </button>
                  ))}
              </div>
          )}
      </div>

      {/* EDIT SALE MODAL */}
      {editingSale && createPortal(
          <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in touch-none">
              <div className="bg-zinc-950 border border-zinc-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-12 sm:pb-6 shadow-2xl relative animate-slide-up max-h-[90vh] flex flex-col">
                  <button 
                    onClick={() => { setEditingSale(null); setIsProcessing(false); }}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white p-2"
                  >
                      <X size={24} />
                  </button>

                  <div className="mb-6">
                      <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">Редактирование чека</div>
                      <h3 className="text-2xl font-black text-white">{new Date(editingSale.timestamp).toLocaleString('ru')}</h3>
                      <p className="text-zinc-500 text-sm">Продавец: {editingSale.sellerName}</p>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 mb-6 pr-2 touch-pan-y">
                      {editedItems.map((item, idx) => (
                          <div key={idx} className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl flex items-center justify-between">
                              <div>
                                  <div className="text-white font-bold text-sm">{item.name}</div>
                                  <div className="text-xs text-zinc-500">{item.variantLabel} • {item.priceAtSale} ₽</div>
                              </div>
                              <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-2 bg-black rounded-lg p-1">
                                      <button 
                                          onClick={() => handleUpdateQuantity(idx, -1)}
                                          className="w-6 h-6 flex items-center justify-center bg-zinc-800 rounded hover:bg-zinc-700 text-zinc-400"
                                      >
                                          <Minus size={12} />
                                      </button>
                                      <span className="w-4 text-center font-mono font-bold text-sm">{item.quantity}</span>
                                      <button 
                                          onClick={() => handleUpdateQuantity(idx, 1)}
                                          className="w-6 h-6 flex items-center justify-center bg-zinc-800 rounded hover:bg-zinc-700 text-zinc-400"
                                      >
                                          <Plus size={12} />
                                      </button>
                                  </div>
                                  <button onClick={() => handleRemoveItem(idx)} className="text-red-500 p-1">
                                      <Trash2 size={16} />
                                  </button>
                              </div>
                          </div>
                      ))}
                      {editedItems.length === 0 && (
                          <div className="text-center py-8 text-red-400 text-sm bg-red-500/10 rounded-xl">
                              Все товары удалены. Сохранение аннулирует чек.
                          </div>
                      )}
                  </div>

                  <div className="border-t border-zinc-900 pt-4 space-y-3">
                      <div className="flex justify-between items-end mb-2">
                          <span className="text-zinc-500 text-xs font-bold uppercase">Новая сумма</span>
                          <span className="text-2xl font-black text-white">{editedTotal} ₽</span>
                      </div>

                      {!isDeletingSale ? (
                          <div className="grid grid-cols-2 gap-3">
                              <button 
                                  onClick={() => setIsDeletingSale(true)}
                                  disabled={isProcessing}
                                  className="py-3 rounded-xl bg-zinc-900 text-red-500 font-bold uppercase text-xs hover:bg-red-500/10 transition-colors"
                              >
                                  Аннулировать
                              </button>
                              <button 
                                  onClick={handleSaveSale}
                                  disabled={isProcessing}
                                  className="py-3 rounded-xl bg-primary text-white font-bold uppercase text-xs hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                              >
                                  {isProcessing ? 'Сохранение...' : 'Сохранить'}
                              </button>
                          </div>
                      ) : (
                          <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 animate-fade-in">
                              <div className="text-center text-red-400 font-bold text-sm mb-3 flex items-center justify-center gap-2">
                                  <AlertCircle size={16} />
                                  Удалить чек и вернуть товары?
                              </div>
                              <div className="flex gap-3">
                                  <button 
                                      onClick={() => setIsDeletingSale(false)}
                                      disabled={isProcessing}
                                      className="flex-1 py-3 bg-zinc-900 text-zinc-400 font-bold text-xs uppercase rounded-lg"
                                  >
                                      Отмена
                                  </button>
                                  <button 
                                      onClick={handleDeleteSale}
                                      disabled={isProcessing}
                                      className="flex-1 py-3 bg-red-600 text-white font-bold text-xs uppercase rounded-lg shadow-lg shadow-red-600/20"
                                  >
                                      {isProcessing ? 'Удаление...' : 'Да, Удалить'}
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>,
          document.body
      )}
    </div>
  );
}
