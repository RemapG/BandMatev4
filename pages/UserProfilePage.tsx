
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { BandService } from '../services/storage';
import { User, UserRole } from '../types';
import { ChevronLeft, User as UserIcon, Music, Shield, Briefcase, Check, AlertTriangle, Trash2, X, Users, Mic2 } from 'lucide-react';

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { currentBand, user: currentUser, refreshData } = useApp();
  
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [profileBands, setProfileBands] = useState<{id: string, name: string, imageUrl?: string, role: UserRole}[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Management State (Admin Only)
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [manageLoading, setManageLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const data = await BandService.getUserProfileWithBands(userId);
        if (data) {
            setProfileUser(data.user);
            setProfileBands(data.bands);
            
            // Set initial editing role if user is in current band
            if (currentBand) {
                const member = currentBand.members.find(m => m.id === userId);
                if (member) setEditingRole(member.role);
            }
        }
      } catch (e) {
        console.error("Failed to load profile", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId, currentBand]);

  // --- Helper Functions ---
  const getRoleLabel = (role: UserRole) => {
    switch (role) {
        case UserRole.ADMIN: return 'Админ';
        case UserRole.MODERATOR: return 'Менеджер';
        case UserRole.BAND_MEMBER: return 'Участник группы';
        case UserRole.MEMBER: return 'Продажник';
        default: return role;
    }
  };

  const getRoleColor = (role: UserRole) => {
      switch(role) {
          case UserRole.ADMIN: return 'text-primary bg-primary/10 border-primary/20';
          case UserRole.MODERATOR: return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
          case UserRole.BAND_MEMBER: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
          default: return 'text-zinc-500 bg-zinc-800 border-zinc-700';
      }
  };

  // --- Admin Actions ---
  const handleRoleChange = async (role: UserRole) => {
    if (!currentBand || !profileUser) return;
    setManageLoading(true);
    try {
        await BandService.updateMemberRole(currentBand.id, profileUser.id, role);
        await refreshData();
        setEditingRole(role);
        setShowRoleModal(false);
    } catch (e) {
        console.error("Failed to update role", e);
        alert("Ошибка при обновлении роли");
    } finally {
        setManageLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!currentBand || !profileUser) return;
    setManageLoading(true);
    try {
        await BandService.removeMember(currentBand.id, profileUser.id);
        await refreshData();
        navigate('/band-settings'); // Go back after removal
    } catch (e) {
        console.error(e);
        alert('Ошибка при удалении участника');
    } finally {
        setManageLoading(false);
    }
  };

  // Determine if current viewer can manage this profile
  const canManage = currentBand && currentUser && 
                    currentBand.members.find(m => m.id === currentUser.id)?.role === UserRole.ADMIN &&
                    currentBand.members.some(m => m.id === userId) &&
                    userId !== currentUser.id;

  if (loading) {
      return (
          <div className="h-full flex items-center justify-center p-5 pt-[calc(1.25rem+env(safe-area-inset-top))] md:p-10">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
      );
  }

  if (!profileUser) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-20 p-5 pt-[calc(1.25rem+env(safe-area-inset-top))] md:p-10">
        <div className="flex items-center gap-2">
           <button 
             onClick={() => navigate(-1)}
             className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition-colors"
           >
               <ChevronLeft size={24} />
           </button>
           <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Профиль</h2>
        </div>

        {/* User Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col items-center text-center">
            <div className="w-32 h-32 rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden mb-4">
                 {profileUser.avatarUrl ? (
                     <img src={profileUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                 ) : (
                     <div className="w-full h-full flex items-center justify-center text-zinc-600">
                         <UserIcon size={48} />
                     </div>
                 )}
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-2">{profileUser.name}</h1>
            
            {profileUser.description && (
                <p className="text-zinc-400 text-sm max-w-sm leading-relaxed mb-4">
                    "{profileUser.description}"
                </p>
            )}

            {/* Admin Controls */}
            {canManage && (
                <button 
                    onClick={() => setShowRoleModal(true)}
                    className="mt-2 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-white text-xs font-bold uppercase tracking-wider transition-all"
                >
                    Управление доступом
                </button>
            )}
        </div>

        {/* Bands List */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Группы</h3>
            
            {profileBands.length === 0 ? (
                <div className="text-center py-4 text-zinc-500 text-sm">
                    Нет групп
                </div>
            ) : (
                <div className="space-y-3">
                    {profileBands.map(band => (
                        <div key={band.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-xl border border-zinc-800">
                             <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700">
                                     {band.imageUrl ? (
                                         <img src={band.imageUrl} alt="" className="w-full h-full object-cover" />
                                     ) : (
                                         <Music size={16} className="text-zinc-600" />
                                     )}
                                 </div>
                                 <span className="text-white font-bold text-sm">{band.name}</span>
                             </div>
                             <div className={`px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${getRoleColor(band.role)}`}>
                                 {band.role === UserRole.ADMIN && <Shield size={10} />}
                                 {band.role === UserRole.MODERATOR && <Briefcase size={10} />}
                                 {getRoleLabel(band.role)}
                             </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Role Editor Modal */}
        {showRoleModal && createPortal(
          <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in touch-none">
              <div className="bg-zinc-900 border border-zinc-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 pb-12 sm:pb-6 shadow-2xl relative animate-slide-up">
                  <button 
                    onClick={() => setShowRoleModal(false)}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white p-2"
                  >
                      <X size={24} />
                  </button>
                  
                  <div className="mb-6">
                      <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">Настройка доступа в {currentBand?.name}</div>
                      <h3 className="text-xl font-bold text-white flex items-center gap-3">
                          {profileUser.name}
                      </h3>
                  </div>

                  <div className="space-y-2">
                      <button
                        onClick={() => handleRoleChange(UserRole.MEMBER)}
                        className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all ${
                            editingRole === UserRole.MEMBER
                            ? 'bg-zinc-800 border-zinc-600 ring-1 ring-zinc-500'
                            : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800'
                        }`}
                      >
                          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                              <UserIcon size={20} />
                          </div>
                          <div className="text-left">
                              <div className="text-white font-bold">Продажник</div>
                              <div className="text-xs text-zinc-500">Только касса</div>
                          </div>
                          {editingRole === UserRole.MEMBER && <Check className="ml-auto text-zinc-400" size={20} />}
                      </button>

                      <button
                        onClick={() => handleRoleChange(UserRole.BAND_MEMBER)}
                        className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all ${
                            editingRole === UserRole.BAND_MEMBER
                            ? 'bg-blue-900/20 border-blue-500/50 ring-1 ring-blue-500'
                            : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800'
                        }`}
                      >
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                              <Mic2 size={20} />
                          </div>
                          <div className="text-left">
                              <div className="text-white font-bold">Участник группы</div>
                              <div className="text-xs text-zinc-500">Доступ к проектам и складу</div>
                          </div>
                           {editingRole === UserRole.BAND_MEMBER && <Check className="ml-auto text-blue-500" size={20} />}
                      </button>

                      <button
                        onClick={() => handleRoleChange(UserRole.MODERATOR)}
                        className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all ${
                            editingRole === UserRole.MODERATOR
                            ? 'bg-purple-900/20 border-purple-500/50 ring-1 ring-purple-500'
                            : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800'
                        }`}
                      >
                          <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                              <Briefcase size={20} />
                          </div>
                          <div className="text-left">
                              <div className="text-white font-bold">Менеджер</div>
                              <div className="text-xs text-zinc-500">Управление финансами и складом</div>
                          </div>
                           {editingRole === UserRole.MODERATOR && <Check className="ml-auto text-purple-500" size={20} />}
                      </button>

                      <button
                        onClick={() => handleRoleChange(UserRole.ADMIN)}
                        className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all ${
                            editingRole === UserRole.ADMIN
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
                           {editingRole === UserRole.ADMIN && <Check className="ml-auto text-primary" size={20} />}
                      </button>
                  </div>
                  
                  {/* Remove User Section */}
                  <div className="mt-8 border-t border-zinc-800 pt-6">
                        {!showRemoveConfirm ? (
                            <button 
                            onClick={() => setShowRemoveConfirm(true)}
                            className="w-full text-center text-red-500 font-bold text-xs uppercase tracking-widest hover:text-red-400 transition-colors flex items-center justify-center gap-2 p-2 rounded-lg hover:bg-red-500/10"
                            >
                                <Trash2 size={16} />
                                Исключить из группы
                            </button>
                        ) : (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 animate-fade-in">
                                <div className="flex items-center justify-center gap-2 text-red-400 mb-4">
                                    <AlertTriangle size={18} />
                                    <span className="text-sm font-bold">Вы уверены?</span>
                                </div>
                                <div className="flex gap-3">
                                    <button 
                                    onClick={() => setShowRemoveConfirm(false)}
                                    className="flex-1 py-3 bg-zinc-900 text-zinc-400 font-bold text-xs uppercase rounded-lg hover:bg-zinc-800 hover:text-white transition-colors"
                                    >
                                        Отмена
                                    </button>
                                    <button 
                                    onClick={handleRemoveMember}
                                    disabled={manageLoading}
                                    className="flex-1 py-3 bg-red-600 text-white font-bold text-xs uppercase rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                                    >
                                        {manageLoading ? 'Удаление...' : 'Исключить'}
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
