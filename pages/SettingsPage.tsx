import React from 'react';
import { useApp } from '../App';
import { User, LogOut, ChevronRight, Users, Shield, Music, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const { user, logout, currentBand } = useApp();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-20 h-full">
      <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase mb-6">Меню</h2>

      {/* Profile Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex items-center gap-4 shadow-lg">
        <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden flex items-center justify-center">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <UserIcon size={32} className="text-zinc-500" />
          )}
        </div>
        <div>
          <h3 className="text-xl font-bold text-white leading-tight">{user.name}</h3>
          <p className="text-zinc-500 text-sm">{user.email}</p>
        </div>
      </div>

      {/* Current Band Settings */}
      <div className="space-y-2">
        <h4 className="text-xs text-zinc-500 font-bold uppercase tracking-widest px-2">Управление Группой</h4>
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden divide-y divide-zinc-800">
            <button 
                onClick={() => navigate('/team')}
                className="w-full flex items-center justify-between p-5 hover:bg-zinc-800/50 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Users size={20} />
                    </div>
                    <div className="text-left">
                        <div className="text-white font-bold">Команда</div>
                        <div className="text-xs text-zinc-500">Участники и права доступа</div>
                    </div>
                </div>
                <ChevronRight size={18} className="text-zinc-600" />
            </button>
            
             <button 
                onClick={() => navigate('/onboarding')}
                className="w-full flex items-center justify-between p-5 hover:bg-zinc-800/50 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                        <Music size={20} />
                    </div>
                    <div className="text-left">
                        <div className="text-white font-bold">Сменить / Создать</div>
                        <div className="text-xs text-zinc-500">Добавить новую группу</div>
                    </div>
                </div>
                <ChevronRight size={18} className="text-zinc-600" />
            </button>
        </div>
      </div>

      {/* App Settings */}
      <div className="space-y-2">
        <h4 className="text-xs text-zinc-500 font-bold uppercase tracking-widest px-2">Приложение</h4>
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
             <button 
                onClick={logout}
                className="w-full flex items-center justify-between p-5 hover:bg-red-500/10 transition-colors group"
            >
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-zinc-800 group-hover:bg-red-500/20 flex items-center justify-center text-zinc-400 group-hover:text-red-500 transition-colors">
                        <LogOut size={20} />
                    </div>
                    <div className="text-left">
                        <div className="text-zinc-400 group-hover:text-red-400 font-bold transition-colors">Выйти из аккаунта</div>
                    </div>
                </div>
            </button>
        </div>
      </div>

      <div className="text-center pt-8 text-zinc-600 text-xs">
         BandMate v1.0.2 Mobile
      </div>
    </div>
  );
}