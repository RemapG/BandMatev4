import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Music, ChevronDown, PlusCircle, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { currentBand, userBands, switchBand } = useApp();
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const navigate = useNavigate();

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

      {/* REVENUE STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800/50 p-6 rounded-3xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-20">
                  <TrendingUp size={80} className="text-green-500 transform translate-x-4 -translate-y-4" />
              </div>
              <p className="text-zinc-500 font-bold text-xs uppercase tracking-wider mb-1">Общая Выручка</p>
              <h2 className="text-4xl font-black text-white tracking-tight">{stats.totalRevenue.toLocaleString()} ₽</h2>
              <div className="flex items-center gap-2 mt-4">
                  <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                      <ArrowUpRight size={12} />
                      {stats.totalSales} продаж
                  </span>
                  <span className="text-zinc-500 text-xs">за всё время</span>
              </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl flex flex-col justify-between">
                   <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 mb-2">
                       <DollarSign size={20} />
                   </div>
                   <div>
                       <p className="text-zinc-500 text-[10px] font-bold uppercase">Ср. Чек</p>
                       <p className="text-xl font-bold text-white">{stats.avgCheck} ₽</p>
                   </div>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-3xl flex flex-col justify-between">
                   <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400 mb-2">
                       <TrendingUp size={20} />
                   </div>
                   <div>
                       <p className="text-zinc-500 text-[10px] font-bold uppercase">Сегодня</p>
                       <p className="text-xl font-bold text-white">+{recentSales.filter(s => new Date(s.timestamp).toDateString() === new Date().toDateString()).length}</p>
                   </div>
              </div>
          </div>
      </div>

      {/* CHART */}
      {chartData.length > 0 && (
          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-6">
            <h3 className="text-zinc-400 font-bold text-xs uppercase tracking-wider mb-6">Динамика Продаж</h3>
            <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                    </defs>
                    <Tooltip 
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                    cursor={{ stroke: '#52525b', strokeDasharray: '4 4' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={4} fill="url(#colorRevenue)" />
                </AreaChart>
                </ResponsiveContainer>
            </div>
          </div>
      )}

      {/* RECENT SALES LIST */}
      <div className="pb-4">
         <div className="flex items-center justify-between mb-4 px-2">
             <h3 className="text-white font-bold text-lg">История продаж</h3>
             <button onClick={() => navigate('/pos')} className="text-xs text-primary font-bold uppercase hover:underline">В Кассу</button>
         </div>
         <div className="space-y-3">
            {recentSales.map(sale => (
                <div key={sale.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-4 rounded-2xl hover:bg-zinc-800 transition-colors">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-zinc-800 to-black border border-zinc-700 flex items-center justify-center text-zinc-400 font-mono text-xs">
                            ₽
                        </div>
                        <div>
                            <div className="text-white font-bold">{sale.total} ₽</div>
                            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wide">
                                {sale.items.reduce((a, b) => a + b.quantity, 0)} шт • {sale.sellerName}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                         <div className="text-xs text-zinc-500 font-medium">
                            {new Date(sale.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                         </div>
                         <div className="text-[10px] text-zinc-600">
                             {new Date(sale.timestamp).toLocaleDateString([], {day: 'numeric', month: 'short'})}
                         </div>
                    </div>
                </div>
            ))}
            {recentSales.length === 0 && (
                <div className="text-center py-10 border border-dashed border-zinc-800 rounded-2xl">
                    <p className="text-zinc-500 text-sm">Продаж пока нет</p>
                </div>
            )}
         </div>
      </div>

    </div>
  );
}