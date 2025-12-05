
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../App';
import { UserRole, BandMember } from '../types';
import { BandService, ImageService } from '../services/storage';
import { Shield, User, Copy, Check, X, Users, Briefcase, ChevronRight, Upload, QrCode, Music, Settings, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BandSettingsPage() {
  const { currentBand, user, refreshData } = useApp();
  const navigate = useNavigate();

  // Settings State
  const [bandName, setBandName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bandLogo, setBandLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  
  // Visibility Toggles
  const [showQr, setShowQr] = useState(true);
  const [showPhone, setShowPhone] = useState(true);

  const [loading, setLoading] = useState(false);

  // Team State
  const [editingMember, setEditingMember] = useState<BandMember | null>(null);

  useEffect(() => {
    if (currentBand) {
        setBandName(currentBand.name);
        setPhoneNumber(currentBand.paymentPhoneNumber || '');
        setLogoPreview(currentBand.imageUrl || null);
        setQrPreview(currentBand.paymentQrUrl || null);
        setShowQr(currentBand.showPaymentQr ?? true);
        setShowPhone(currentBand.showPaymentPhone ?? true);
    }
  }, [currentBand]);

  if (!currentBand || !user) return null;

  const currentMember = currentBand.members.find(m => m.id === user.id);
  const isAdmin = currentMember?.role === UserRole.ADMIN;
  const isModerator = currentMember?.role === UserRole.MODERATOR;
  const canEditInfo = isAdmin || isModerator;

  // --- HANDLERS ---

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBandLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setQrImage(file);
      setQrPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveSettings = async () => {
    if (!canEditInfo) return;
    setLoading(true);

    try {
        let logoUrl = currentBand.imageUrl;
        if (bandLogo) {
            logoUrl = await ImageService.upload(bandLogo);
        }

        let qrUrl = currentBand.paymentQrUrl;
        if (qrImage) {
            qrUrl = await ImageService.upload(qrImage);
        }

        await BandService.updateBandDetails(
            currentBand.id, 
            bandName, 
            logoUrl, 
            qrUrl, 
            phoneNumber,
            showQr,
            showPhone
        );
        
        await refreshData();
        alert('Настройки сохранены');
    } catch (e) {
        console.error(e);
        alert('Ошибка при сохранении');
    } finally {
        setLoading(false);
    }
  };

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
    <div className="space-y-8 animate-fade-in relative pb-24">
      {/* HEADER */}
      <div className="flex items-center gap-3">
           <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
               <Settings size={24} />
           </div>
           <div>
               <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Настройки Группы</h2>
               <p className="text-zinc-500 text-sm">Управление и команда</p>
           </div>
      </div>

      {/* SECTION 1: GENERAL SETTINGS */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6">
           <div className="flex flex-col items-center">
               <label className={`relative group ${canEditInfo ? 'cursor-pointer' : ''}`}>
                   <div className="w-28 h-28 rounded-full bg-zinc-800 border-2 border-dashed border-zinc-600 flex items-center justify-center overflow-hidden transition-colors hover:border-primary relative">
                       {logoPreview ? (
                           <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                       ) : (
                           <Music className="text-zinc-500" size={32} />
                       )}
                       
                       {canEditInfo && (
                           <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                               <Upload size={20} className="text-white" />
                           </div>
                       )}
                   </div>
                   {canEditInfo && <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />}
               </label>
               <p className="text-xs text-zinc-500 mt-2">Логотип группы</p>
           </div>

           <div>
               <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-2 pl-1">Название</label>
               <input
                    type="text"
                    value={bandName}
                    onChange={(e) => setBandName(e.target.value)}
                    disabled={!canEditInfo}
                    className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-all font-bold disabled:opacity-50"
               />
           </div>

           {/* QR Code Upload & Toggle */}
            <div className="space-y-2">
               <div className="flex items-center justify-between">
                   <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-1">QR-код для оплаты</label>
                   {canEditInfo && (
                        <button 
                            onClick={() => setShowQr(!showQr)}
                            className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors ${showQr ? 'bg-primary/20 text-primary' : 'bg-zinc-800 text-zinc-500'}`}
                        >
                            {showQr ? 'Показывать' : 'Скрыт'}
                            <div className={`w-6 h-3 rounded-full relative transition-colors ${showQr ? 'bg-primary' : 'bg-zinc-600'}`}>
                                <div className={`absolute top-0.5 w-2 h-2 rounded-full bg-white transition-transform ${showQr ? 'left-3.5' : 'left-0.5'}`}></div>
                            </div>
                        </button>
                   )}
               </div>
               
               <div className="flex items-center gap-4">
                   <div className={`h-20 w-20 bg-black/40 border border-zinc-800 rounded-xl flex items-center justify-center overflow-hidden transition-opacity ${showQr ? 'opacity-100' : 'opacity-40'}`}>
                       {qrPreview ? (
                           <img src={qrPreview} className="w-full h-full object-cover" />
                       ) : (
                           <QrCode size={24} className="text-zinc-600" />
                       )}
                   </div>
                   
                   {canEditInfo && (
                       <label className="flex-1 cursor-pointer">
                            <div className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl text-sm font-medium transition-colors text-center border border-zinc-700">
                                Загрузить QR
                            </div>
                            <input type="file" accept="image/*" onChange={handleQrChange} className="hidden" />
                            <p className="text-[10px] text-zinc-500 mt-2 text-center">Будет показан покупателю при оплате</p>
                       </label>
                   )}
               </div>
           </div>

           {/* Phone Number Input & Toggle */}
           <div className="space-y-2">
               <div className="flex items-center justify-between">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-1">Номер для перевода</label>
                    {canEditInfo && (
                        <button 
                            onClick={() => setShowPhone(!showPhone)}
                            className={`flex items-center gap-2 px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors ${showPhone ? 'bg-primary/20 text-primary' : 'bg-zinc-800 text-zinc-500'}`}
                        >
                            {showPhone ? 'Показывать' : 'Скрыт'}
                            <div className={`w-6 h-3 rounded-full relative transition-colors ${showPhone ? 'bg-primary' : 'bg-zinc-600'}`}>
                                <div className={`absolute top-0.5 w-2 h-2 rounded-full bg-white transition-transform ${showPhone ? 'left-3.5' : 'left-0.5'}`}></div>
                            </div>
                        </button>
                   )}
               </div>
               
               <div className={`relative transition-opacity ${showPhone ? 'opacity-100' : 'opacity-50'}`}>
                    <Phone className="absolute left-4 top-3.5 text-zinc-500" size={18} />
                    <input
                        type="text"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        disabled={!canEditInfo}
                        placeholder="+7 (999) 000-00-00"
                        className="w-full bg-black/40 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-white focus:border-primary outline-none transition-all font-bold disabled:opacity-50"
                    />
               </div>
           </div>

           {canEditInfo && (
               <button
                 onClick={handleSaveSettings}
                 disabled={loading}
                 className="w-full py-4 rounded-xl bg-primary text-white font-bold uppercase tracking-widest text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
               >
                 {loading ? 'Сохранение...' : 'Сохранить изменения'}
               </button>
           )}
      </div>

      {/* SECTION 2: TEAM */}
      <div>
          <h3 className="text-lg font-bold text-white mb-4 px-2">Команда</h3>
          
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl mb-6">
            <div className="text-center md:text-left">
                <span className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">Код доступа</span>
                <p className="text-zinc-400 text-xs">Отправьте этот код, чтобы пригласить участников</p>
            </div>
            <button 
                onClick={copyCode}
                className="flex items-center gap-4 bg-black/40 hover:bg-black/60 px-6 py-3 rounded-xl border border-dashed border-zinc-600 transition-all group"
            >
                <span className="text-3xl font-mono tracking-[0.2em] text-primary font-bold">{currentBand.joinCode}</span>
                <Copy size={20} className="text-zinc-500 group-hover:text-white transition-colors" />
            </button>
          </div>

          <div className="space-y-3">
            {currentBand.members.map(member => (
              <button 
                key={member.id} 
                onClick={() => isAdmin && setEditingMember(member)}
                disabled={!isAdmin}
                className={`w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between transition-all text-left group ${isAdmin ? 'hover:bg-zinc-800 hover:border-zinc-700 active:scale-[0.99]' : ''}`}
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
          
          {/* Requests List (Admin Only) */}
            {isAdmin && currentBand.pendingRequests.length > 0 && (
              <div className="mt-8 space-y-4">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest px-2 flex items-center gap-2">
                  Заявки
                  <span className="bg-secondary text-white text-xs px-2 py-0.5 rounded-full font-bold">{currentBand.pendingRequests.length}</span>
                </h3>
                
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
              </div>
            )}
      </div>

      {/* Role Editor Modal */}
      {editingMember && createPortal(
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
          </div>,
          document.body
      )}

    </div>
  );
}
