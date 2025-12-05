
import React, { useState } from 'react';
import { useApp } from '../App';
import { UserRole, BandMember } from '../types';
import { BandService } from '../services/storage';
import { Shield, User, Copy, Check, X, LogOut, Users, Briefcase, ChevronRight } from 'lucide-react';

export default function TeamPage() {
  const { currentBand, user, refreshData } = useApp();
  const [editingMember, setEditingMember] = useState<BandMember | null>(null);

  if (!currentBand || !user) return null;

  // We need to check the role specifically for this band
  const currentMember = currentBand.members.find(m => m.id === user.id);
  const isAdmin = currentMember?.role === UserRole.ADMIN;

  const copyCode = () => {
    navigator.clipboard.writeText(currentBand.joinCode);
    alert('Код скопирован!');
  };

  const handleApprove = async (requesterId: string) => {
    await BandService.approveRequest(currentBand.id, requesterId);
    refreshData();
  };
  
  const handleRoleChange = async (role: UserRole) => {
    if (!editingMember) return;
    try {
        await BandService.updateMemberRole(currentBand.id, editingMember.id, role);
        await refreshData();
        setEditingMember(null);
    } catch (e) {
        console.error("Failed to update role", e);
        alert("Ошибка при обновлении роли");
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
        case UserRole.ADMIN: return 'Админ';
        case UserRole.MODERATOR: return 'Менеджер';
        case UserRole.MEMBER: return 'Продажник';
        default: return role;
    }
  };

  const getRoleIcon = (role: UserRole) => {
      switch(role) {
          case UserRole.ADMIN: return <Shield size={20} />;
          case UserRole.MODERATOR: return <Briefcase size={20} />;
          default: return <User size={20} />;
      }
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Header / Code */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="text-center md:text-left">
          <h2 className="text-2xl font-bold text-white mb-1">Команда {currentBand.name}</h2>
          <p className="text-zinc-400 text-sm">Управляйте участниками и их правами</p>
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
              <button 
                key={member.id} 
                onClick={() => isAdmin && setEditingMember(member)}
                disabled={!isAdmin}
                className={`w-full bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl flex items-center justify-between transition-all text-left group ${isAdmin ? 'hover:bg-zinc-800 hover:border-zinc-700 active:scale-[0.99]' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${
                    member.role === UserRole.ADMIN 
                        ? 'bg-primary/10 border-primary/20 text-primary' 
                        : (member.role === UserRole.MODERATOR ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500')
                  }`}>
                    {getRoleIcon(member.role)}
                  </div>
                  <div>
                    <div className="font-medium text-white flex items-center gap-2">
                        {member.name}
                        {member.id === user.id && <span className="text-xs text-zinc-500 font-normal">(Вы)</span>}
                    </div>
                    <div className="text-xs text-zinc-500">{member.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full ${
                        member.role === UserRole.ADMIN 
                            ? 'bg-primary/20 text-primary' 
                            : (member.role === UserRole.MODERATOR ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800 text-zinc-400')
                    }`}>
                    {getRoleLabel(member.role)}
                    </span>
                    {isAdmin && <ChevronRight size={16} className="text-zinc-700 group-hover:text-zinc-500" />}
                </div>
              </button>
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

      {/* Role Editor Modal */}
      {/* UPDATE: Increased z-index to z-[60] to appear above bottom nav (z-50) */}
      {/* UPDATE: Added pb-10 sm:pb-6 to ensure safe area at bottom */}
      {editingMember && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in touch-none">
              <div className="bg-zinc-900 border border-zinc-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-12 sm:pb-6 shadow-2xl relative animate-slide-up">
                  <button 
                    onClick={() => setEditingMember(null)}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white p-2"
                  >
                      <X size={24} />
                  </button>
                  
                  <div className="mb-6">
                      <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">Настройка доступа</div>
                      <h3 className="text-xl font-bold text-white">{editingMember.name}</h3>
                  </div>

                  <div className="space-y-2">
                      <button
                        onClick={() => handleRoleChange(UserRole.MEMBER)}
                        className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all ${
                            editingMember.role === UserRole.MEMBER
                            ? 'bg-zinc-800 border-zinc-600 ring-1 ring-zinc-500'
                            : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800'
                        }`}
                      >
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                              <User size={20} />
                          </div>
                          <div className="text-left">
                              <div className="text-white font-bold">Продажник</div>
                              <div className="text-xs text-zinc-500">Может только продавать (Касса)</div>
                          </div>
                          {editingMember.role === UserRole.MEMBER && <Check className="ml-auto text-zinc-400" size={20} />}
                      </button>

                      <button
                        onClick={() => handleRoleChange(UserRole.MODERATOR)}
                        className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all ${
                            editingMember.role === UserRole.MODERATOR
                            ? 'bg-purple-900/20 border-purple-500/50 ring-1 ring-purple-500'
                            : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800'
                        }`}
                      >
                          <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                              <Briefcase size={20} />
                          </div>
                          <div className="text-left">
                              <div className="text-white font-bold">Менеджер</div>
                              <div className="text-xs text-zinc-500">Продажи + Редактирование склада</div>
                          </div>
                           {editingMember.role === UserRole.MODERATOR && <Check className="ml-auto text-purple-500" size={20} />}
                      </button>

                      <button
                        onClick={() => handleRoleChange(UserRole.ADMIN)}
                        className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all ${
                            editingMember.role === UserRole.ADMIN
                            ? 'bg-primary/10 border-primary/50 ring-1 ring-primary'
                            : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800'
                        }`}
                      >
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                              <Shield size={20} />
                          </div>
                          <div className="text-left">
                              <div className="text-white font-bold">Администратор</div>
                              <div className="text-xs text-zinc-500">Полный доступ + Управление командой</div>
                          </div>
                           {editingMember.role === UserRole.ADMIN && <Check className="ml-auto text-primary" size={20} />}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
