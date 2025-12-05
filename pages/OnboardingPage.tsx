
import React, { useState, useEffect } from 'react';
import { BandService, ImageService } from '../services/storage';
import { useApp } from '../App';
import { Users, PlusCircle, ArrowLeft, Upload, Music, Search, Check, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Band } from '../types';

const getErrorMessage = (error: any) => {
    return error?.message || error?.error_description || "Произошла ошибка";
};

export default function OnboardingPage() {
  const { user, refreshData, userBands, switchBand } = useApp();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  
  // Create State
  const [bandName, setBandName] = useState('');
  const [bandLogo, setBandLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  // Join/Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Partial<Band>[]>([]);
  const [searching, setSearching] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Debounced Search
  useEffect(() => {
    if (mode !== 'join') return;
    
    const delayDebounceFn = setTimeout(async () => {
        if (searchQuery.length >= 2) {
            setSearching(true);
            try {
                const results = await BandService.searchBands(searchQuery);
                setSearchResults(results);
            } catch (e) {
                console.error(e);
            } finally {
                setSearching(false);
            }
        } else {
            setSearchResults([]);
        }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, mode]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBandLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleCreate = async () => {
    if (!bandName || !user) return;
    setLoading(true);
    setError('');
    
    try {
        let logoUrl = undefined;
        if (bandLogo) {
          logoUrl = await ImageService.upload(bandLogo);
        }

        const newBand = await BandService.createBand(bandName, user, logoUrl);
        await refreshData();
        switchBand(newBand.id);
        navigate('/dashboard');
    } catch (e: any) {
        console.error(e);
        setError(getErrorMessage(e));
    } finally {
        setLoading(false);
    }
  };

  const handleJoinRequest = async (bandId: string) => {
    if (!user) return;
    setLoading(true);
    setError('');
    setJoinSuccess(null);
    try {
        await BandService.joinBand(bandId, user);
        setJoinSuccess(bandId);
        // We don't redirect immediately so they can see "Request Sent"
    } catch (e: any) {
        console.error(e);
        setError(getErrorMessage(e));
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center p-6 relative bg-background">
        {userBands.length > 0 && (
            <button 
                onClick={() => navigate('/dashboard')}
                className="absolute top-6 left-6 flex items-center gap-2 text-zinc-400 hover:text-white"
            >
                <ArrowLeft size={20} />
                Назад
            </button>
        )}
        
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">
            {userBands.length > 0 ? 'Новая Группа' : `Добро пожаловать, ${user?.name}!`}
          </h2>
          <p className="text-zinc-400">
            {userBands.length > 0 ? 'Создайте еще одну группу или найдите существующую.' : 'Вам нужно присоединиться к группе или создать новую.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => { setMode('create'); setError(''); }}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
              mode === 'create'
                ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800'
            }`}
          >
            <PlusCircle size={24} />
            <span className="font-medium">Создать</span>
          </button>
          <button
            onClick={() => { setMode('join'); setError(''); setSearchQuery(''); }}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
              mode === 'join'
                ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800'
            }`}
          >
            <Users size={24} />
            <span className="font-medium">Найти</span>
          </button>
        </div>

        <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-xl min-h-[300px]">
          {mode === 'create' ? (
            <div className="space-y-4 animate-fade-in">
              
              {/* Logo Upload */}
              <div className="flex justify-center">
                 <label className="relative cursor-pointer group">
                    <div className="w-20 h-20 rounded-xl bg-zinc-800 border-2 border-dashed border-zinc-600 flex items-center justify-center overflow-hidden transition-colors hover:border-primary">
                        {logoPreview ? (
                            <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <Music className="text-zinc-500 group-hover:text-primary" size={24} />
                        )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-zinc-700 text-white p-1.5 rounded-full shadow-lg border border-zinc-900">
                        <Upload size={12} />
                    </div>
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                 </label>
              </div>

              <label className="block text-sm font-medium text-zinc-300">Название Группы</label>
              <input
                type="text"
                value={bandName}
                onChange={(e) => setBandName(e.target.value)}
                placeholder="The Rockers"
                className="w-full px-4 py-3 rounded-xl bg-black/50 border border-zinc-700 text-white focus:outline-none focus:border-primary placeholder:text-zinc-600"
              />
              
              {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded-lg">{error}</p>}

              <button
                onClick={handleCreate}
                disabled={!bandName || loading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/>}
                {loading ? 'Создание...' : 'Создать Группу'}
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-in">
               <label className="block text-sm font-medium text-zinc-300">Поиск группы</label>
               <div className="relative">
                   <Search className="absolute left-3 top-3.5 text-zinc-500" size={18} />
                   <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Название..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/50 border border-zinc-700 text-white focus:outline-none focus:border-primary placeholder:text-zinc-600"
                   />
                   {searching && (
                       <div className="absolute right-3 top-3.5 animate-spin h-4 w-4 border-2 border-zinc-500 border-t-transparent rounded-full"/>
                   )}
               </div>

               {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded-lg">{error}</p>}

               <div className="mt-4 space-y-2 max-h-[250px] overflow-y-auto no-scrollbar">
                   {searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
                       <div className="text-center text-zinc-500 py-4 text-sm">Группы не найдены</div>
                   )}
                   
                   {searchResults.map(band => (
                       <div key={band.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl border border-zinc-800">
                           <div className="flex items-center gap-3">
                               <div className="w-10 h-10 bg-zinc-700 rounded-lg flex items-center justify-center overflow-hidden">
                                   {band.imageUrl ? <img src={band.imageUrl} className="w-full h-full object-cover"/> : <Music size={16} />}
                               </div>
                               <span className="text-white font-medium">{band.name}</span>
                           </div>
                           
                           {joinSuccess === band.id ? (
                               <span className="text-green-500 text-xs font-bold flex items-center gap-1">
                                   <Check size={14} /> Отправлено
                               </span>
                           ) : (
                               <button 
                                onClick={() => handleJoinRequest(band.id!)}
                                disabled={loading}
                                className="bg-zinc-700 hover:bg-zinc-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                               >
                                   Вступить
                               </button>
                           )}
                       </div>
                   ))}
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
