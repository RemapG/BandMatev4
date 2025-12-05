import React from 'react';
import { useApp } from '../App';
import { UserRole } from '../types';
import { BandService } from '../services/storage';
import { Shield, User, Copy, Check, X, LogOut, Users } from 'lucide-react';

export default function TeamPage() {
  const { currentBand, user, refreshData } = useApp();

  if (!currentBand || !user) return null;

  // We need to check the role specifically for this band
  const currentMember = currentBand.members.find(m => m.id === user.id);
  const isAdmin = currentMember?.role === UserRole.ADMIN;

  const copyCode = () => {
    navigator.clipboard.writeText(currentBand.joinCode);
    alert('Код скопирован!');
  };

  const handleApprove = (requesterId: string) => {
    BandService.approveRequest(currentBand.id, requesterId);
    refreshData();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header / Code */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="text-center md:text-left">
          <h2 className="text-2xl font-bold text-white mb-1">Команда {currentBand.name}</h2>
          <p className="text-zinc-400 text-sm">Пригласите участников для совместной работы</p>
        </div>
        <div className="flex flex-col items-center md:items-end gap-2">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">Код доступа</span>
            <button 
            onClick={copyCode}
            className="flex items-center gap-4 bg-black/40 hover:bg-black/60 px-6 py-3 rounded-xl border border-dashed border-zinc-600 transition-all group"
            >
            <span className="text-3xl font-mono tracking-[0.2em] text-primary font-bold">{currentBand.joinCode}</span>
            <Copy size={20} className="text-zinc-500 group-hover:text-white transition-colors" />
            </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Members List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Участники ({currentBand.members.length})</h3>
          </div>
          <div className="space-y-3">
            {currentBand.members.map(member => (
              <div key={member.id} className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl flex items-center justify-between hover:border-zinc-700 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${
                    member.role === UserRole.ADMIN 
                        ? 'bg-primary/10 border-primary/20 text-primary' 
                        : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                  }`}>
                    {member.role === UserRole.ADMIN ? <Shield size={20} /> : <User size={20} />}
                  </div>
                  <div>
                    <div className="font-medium text-white flex items-center gap-2">
                        {member.name}
                        {member.id === user.id && <span className="text-xs text-zinc-500">(Вы)</span>}
                    </div>
                    <div className="text-xs text-zinc-500">{member.email}</div>
                  </div>
                </div>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full ${
                    member.role === UserRole.ADMIN 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Requests List (Admin Only) */}
        {isAdmin && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              Заявки на вступление
              {currentBand.pendingRequests.length > 0 && (
                <span className="bg-secondary text-white text-xs px-2 py-0.5 rounded-full font-bold">{currentBand.pendingRequests.length}</span>
              )}
            </h3>
            
            {currentBand.pendingRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 border border-zinc-800 border-dashed rounded-xl bg-zinc-900/30 text-zinc-500">
                <Users size={32} className="mb-2 opacity-50" />
                <span className="text-sm">Нет новых заявок</span>
              </div>
            ) : (
              <div className="space-y-3">
                {currentBand.pendingRequests.map(req => (
                  <div key={req.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{req.name}</div>
                      <div className="text-xs text-zinc-500">{req.email}</div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleApprove(req.id)}
                        className="flex items-center gap-2 px-3 py-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20 transition-colors text-sm font-medium"
                      >
                        <Check size={16} />
                        Принять
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}