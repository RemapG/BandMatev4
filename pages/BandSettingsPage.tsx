
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../App';
import { UserRole, BandMember, Sale, SaleItem, Project } from '../types';
import { BandService, ImageService, ProjectService } from '../services/storage';
import { Shield, User, Check, X, Briefcase, ChevronRight, Upload, QrCode, Music, Settings, Phone, Trash2, AlertTriangle, ZoomIn, DollarSign, TrendingUp, ShoppingBag, Edit2, Minus, Plus, AlertCircle, ArrowLeft, Users, PieChart, History, Info, CreditCard, Shirt, Package, FileText, Wallet, Mic2, Archive, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import getCroppedImg, { PixelCrop } from '../utils/canvasUtils';

type SettingsView = 'main' | 'general' | 'payments' | 'team' | 'stats' | 'history' | 'archive';

export default function BandSettingsPage() {
  const { currentBand, user, refreshData } = useApp();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<SettingsView>('main');

  // Settings State
  const [bandName, setBandName] = useState('');
  const [description, setDescription] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [bandLogo, setBandLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  
  // Visibility Toggles
  const [showQr, setShowQr] = useState(true);
  const [showPhone, setShowPhone] = useState(true);

  const [loading, setLoading] = useState(false);

  // Archive State
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);

  // Sale Edit State
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editedItems, setEditedItems] = useState<SaleItem[]>([]);
  const [isDeletingSale, setIsDeletingSale] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Cropper State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  useEffect(() => {
    if (currentBand) {
        setBandName(currentBand.name);
        setDescription(currentBand.description || '');
        setPhoneNumber(currentBand.paymentPhoneNumber || '');
        setRecipientName(currentBand.paymentRecipientName || '');
        setLogoPreview(currentBand.imageUrl || null);
        setQrPreview(currentBand.paymentQrUrl || null);
        setShowQr(currentBand.showPaymentQr ?? true);
        setShowPhone(currentBand.showPaymentPhone ?? true);
    }
  }, [currentBand]);

  // Load archive when view changes
  useEffect(() => {
      if (currentView === 'archive' && currentBand) {
          const loadArchive = async () => {
              setLoadingArchive(true);
              try {
                  const projects = await ProjectService.getProjects(currentBand.id);
                  setArchivedProjects(projects.filter(p => p.status === 'COMPLETED'));
              } catch (e) {
                  console.error(e);
              } finally {
                  setLoadingArchive(false);
              }
          };
          loadArchive();
      }
  }, [currentView, currentBand]);

  // Cleanup object URLs
  useEffect(() => {
    return () => {
        if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  if (!currentBand || !user) return null;

  const currentMember = currentBand.members.find(m => m.id === user.id);
  const isAdmin = currentMember?.role === UserRole.ADMIN;
  const isModerator = currentMember?.role === UserRole.MODERATOR;
  // Admin and Moderator can edit basic info. Band Member cannot edit settings.
  const canEditInfo = isAdmin || isModerator; 
  // Band Member can view stats/history? Maybe. For now restrict to Admin/Mod as per request for "Manager rights".
  // If "Band Member" has "same rights as manager", they should see it.
  const isBandMember = currentMember?.role === UserRole.BAND_MEMBER;
  const canViewStats = isAdmin || isModerator || isBandMember;

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    if (!currentBand) return { totalRevenue: 0, totalSales: 0, avgCheck: 0 };
    const totalRevenue = currentBand.sales.reduce((acc, s) => acc + s.total, 0);
    return {
      totalRevenue,
      totalSales: currentBand.sales.length,
      avgCheck: currentBand.sales.length > 0 ? Math.round(totalRevenue / currentBand.sales.length) : 0,
    };
  }, [currentBand]);

  const sortedSales = useMemo(() => {
    return [...currentBand.sales].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [currentBand]);


  // --- HANDLERS ---

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const objectUrl = URL.createObjectURL(file);
      setImageSrc(objectUrl);
      setIsCropping(true);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      e.target.value = '';
    }
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: PixelCrop) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (croppedBlob) {
        const file = new File([croppedBlob], `logo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setBandLogo(file);
        
        if (logoPreview && logoPreview.startsWith('blob:')) {
             URL.revokeObjectURL(logoPreview);
        }
        setLogoPreview(URL.createObjectURL(croppedBlob));
        setIsCropping(false);
        setImageSrc(null);
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка при обработке изображения');
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
            description,
            logoUrl, 
            qrUrl, 
            phoneNumber,
            recipientName,
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

  // --- TEAM HANDLERS ---
  const handleApprove = async (requesterId: string) => {
    await BandService.approveRequest(currentBand.id, requesterId);
    refreshData();
  };

  const openMemberProfile = (memberId: string) => {
      navigate(`/profile/${memberId}`);
  };

  // --- SALE EDIT HANDLERS ---
  const handleOpenEditSale = (sale: Sale) => {
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

  const editedTotal = editedItems.reduce((acc, item) => acc + (item.priceAtSale * item.quantity), 0);

  // --- RENDER HELPERS ---
  const getRoleLabel = (role: UserRole) => {
    switch (role) {
        case UserRole.ADMIN: return 'Админ';
        case UserRole.MODERATOR: return 'Менеджер';
        case UserRole.BAND_MEMBER: return 'Участник';
        case UserRole.MEMBER: return 'Продажник';
        default: return role;
    }
  };

  // --- VIEWS ---

  const renderMainView = () => (
    <div className="space-y-6 animate-slide-up pb-24">
         {/* HEADER */}
        <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Settings size={24} />
            </div>
            <div>
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Группа</h2>
                <p className="text-zinc-500 text-sm">Настройки и управление</p>
            </div>
        </div>

        {/* BAND CARD (Read Only Header) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden shrink-0">
                {currentBand.imageUrl ? (
                    <img src={currentBand.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                    <Music size={24} className="text-zinc-600 m-auto mt-4" />
                )}
            </div>
            <div>
                <h3 className="text-xl font-bold text-white leading-tight">{currentBand.name}</h3>
                <p className="text-zinc-500 text-xs mt-1 uppercase tracking-wider">{getRoleLabel(currentMember?.role || UserRole.MEMBER)}</p>
            </div>
        </div>

        {/* NAVIGATION LINKS */}
        <div className="space-y-2">
            <h4 className="text-xs text-zinc-500 font-bold uppercase tracking-widest px-2">Основное</h4>
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden divide-y divide-zinc-800">
                
                 {/* GENERAL INFO */}
                 {canEditInfo && (
                    <button 
                        onClick={() => setCurrentView('general')}
                        className="w-full flex items-center justify-between p-5 hover:bg-zinc-800/50 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300">
                                <FileText size={20} />
                            </div>
                            <div className="text-left">
                                <div className="text-white font-bold">Основная информация</div>
                                <div className="text-xs text-zinc-500">Название, лого, описание</div>
                            </div>
                        </div>
                        <ChevronRight size={18} className="text-zinc-600" />
                    </button>
                 )}

                {/* INVENTORY LINK */}
                <button 
                    onClick={() => navigate('/inventory')}
                    className="w-full flex items-center justify-between p-5 hover:bg-zinc-800/50 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300">
                            <Shirt size={20} />
                        </div>
                        <div className="text-left">
                            <div className="text-white font-bold">Склад / Товары</div>
                            <div className="text-xs text-zinc-500">Управление инвентарем</div>
                        </div>
                    </div>
                    <ChevronRight size={18} className="text-zinc-600" />
                </button>

                {/* PAYMENTS */}
                {canEditInfo && (
                    <button 
                        onClick={() => setCurrentView('payments')}
                        className="w-full flex items-center justify-between p-5 hover:bg-zinc-800/50 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300">
                                <Wallet size={20} />
                            </div>
                            <div className="text-left">
                                <div className="text-white font-bold">Оплата и Касса</div>
                                <div className="text-xs text-zinc-500">QR, Телефон, Получатель</div>
                            </div>
                        </div>
                        <ChevronRight size={18} className="text-zinc-600" />
                    </button>
                )}

                <button 
                    onClick={() => setCurrentView('team')}
                    className="w-full flex items-center justify-between p-5 hover:bg-zinc-800/50 transition-colors"
                >
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <Users size={20} />
                        </div>
                        <div className="text-left">
                            <div className="text-white font-bold">Команда</div>
                            <div className="text-xs text-zinc-500">{currentBand.members.length} участников</div>
                        </div>
                    </div>
                    <ChevronRight size={18} className="text-zinc-600" />
                </button>

                {canViewStats && (
                    <>
                        <button 
                            onClick={() => setCurrentView('stats')}
                            className="w-full flex items-center justify-between p-5 hover:bg-zinc-800/50 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                                    <PieChart size={20} />
                                </div>
                                <div className="text-left">
                                    <div className="text-white font-bold">Статистика</div>
                                    <div className="text-xs text-zinc-500">Выручка и продажи</div>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-zinc-600" />
                        </button>

                        <button 
                            onClick={() => setCurrentView('history')}
                            className="w-full flex items-center justify-between p-5 hover:bg-zinc-800/50 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                    <History size={20} />
                                </div>
                                <div className="text-left">
                                    <div className="text-white font-bold">История продаж</div>
                                    <div className="text-xs text-zinc-500">Последние операции</div>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-zinc-600" />
                        </button>

                        {/* ARCHIVE LINK */}
                        <button 
                            onClick={() => setCurrentView('archive')}
                            className="w-full flex items-center justify-between p-5 hover:bg-zinc-800/50 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400">
                                    <Archive size={20} />
                                </div>
                                <div className="text-left">
                                    <div className="text-white font-bold">Архив</div>
                                    <div className="text-xs text-zinc-500">Прошедшие мероприятия</div>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-zinc-600" />
                        </button>
                    </>
                )}
            </div>
        </div>
    </div>
  );

  const renderGeneralView = () => (
    <div className="space-y-6 animate-slide-up pb-24 h-full">
         <div className="flex items-center gap-2">
            <button 
                onClick={() => setCurrentView('main')}
                className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition-colors"
            >
                <ArrowLeft size={24} />
            </button>
            <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Инфо</h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6">
           <div className="flex flex-col items-center">
               <label className={`relative group ${canEditInfo ? 'cursor-pointer' : ''}`}>
                   <div className="w-32 h-32 rounded-full bg-zinc-800 border-2 border-dashed border-zinc-600 flex items-center justify-center overflow-hidden transition-colors hover:border-primary relative">
                       {logoPreview ? (
                           <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                       ) : (
                           <Music className="text-zinc-500" size={32} />
                       )}
                       
                       {canEditInfo && (
                           <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                               <Upload size={24} className="text-white" />
                           </div>
                       )}
                   </div>
                   {canEditInfo && <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />}
               </label>
               <p className="text-xs text-zinc-500 mt-2 font-medium">Нажмите на фото, чтобы изменить</p>
           </div>

           <div className="space-y-4">
               <div>
                   <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-2 pl-1">Название группы</label>
                   <input
                        type="text"
                        value={bandName}
                        onChange={(e) => setBandName(e.target.value)}
                        disabled={!canEditInfo}
                        className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-all font-bold disabled:opacity-50"
                        placeholder="Название"
                   />
               </div>
               <div>
                   <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-2 pl-1">Описание</label>
                   <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={!canEditInfo}
                        rows={5}
                        className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-all text-sm resize-none disabled:opacity-50"
                        placeholder="Краткое описание вашей группы..."
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
    </div>
  );

  const renderPaymentsView = () => (
      <div className="space-y-6 animate-slide-up pb-24 h-full">
         <div className="flex items-center gap-2">
            <button 
                onClick={() => setCurrentView('main')}
                className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition-colors"
            >
                <ArrowLeft size={24} />
            </button>
            <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Оплата</h2>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
            {/* QR Config */}
            <div className="bg-black/20 p-4 rounded-2xl border border-zinc-800/50">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                         <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden border border-zinc-700">
                            {qrPreview ? (
                                <img src={qrPreview} className="w-full h-full object-cover" /> 
                            ) : (
                                <QrCode size={20} className="text-zinc-600" />
                            )}
                        </div>
                        <div>
                             <h4 className="font-bold text-white text-sm">QR Код</h4>
                             <p className="text-xs text-zinc-500">Для оплаты по СБП</p>
                        </div>
                    </div>
                    {canEditInfo && (
                        <button 
                            onClick={() => setShowQr(!showQr)}
                            className={`w-12 h-6 rounded-full relative transition-colors ${showQr ? 'bg-primary' : 'bg-zinc-700'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${showQr ? 'left-7' : 'left-1'}`}></div>
                        </button>
                    )}
                </div>
                
                {canEditInfo && (
                    <label className="block w-full text-center py-3 rounded-xl border border-dashed border-zinc-700 text-zinc-400 text-xs hover:text-white hover:border-zinc-500 cursor-pointer transition-colors bg-black/20">
                        {qrPreview ? 'Изменить изображение QR' : 'Загрузить QR код'}
                        <input type="file" accept="image/*" onChange={handleQrChange} className="hidden" />
                    </label>
                )}
            </div>

            {/* Phone Config */}
            <div className="bg-black/20 p-4 rounded-2xl border border-zinc-800/50">
                <div className="flex justify-between items-start mb-4">
                     <div className="flex items-center gap-3">
                         <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700">
                             <Phone size={20} className="text-zinc-600" />
                         </div>
                        <div>
                             <h4 className="font-bold text-white text-sm">Номер телефона</h4>
                             <p className="text-xs text-zinc-500">Для перевода</p>
                        </div>
                    </div>
                    {canEditInfo && (
                        <button 
                            onClick={() => setShowPhone(!showPhone)}
                            className={`w-12 h-6 rounded-full relative transition-colors ${showPhone ? 'bg-primary' : 'bg-zinc-700'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${showPhone ? 'left-7' : 'left-1'}`}></div>
                        </button>
                    )}
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-1 pl-1">Номер</label>
                        <input
                            type="text"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            disabled={!canEditInfo}
                            placeholder="+7 (999) 000-00-00"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 text-white text-sm focus:border-primary outline-none disabled:opacity-50"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-1 pl-1">Получатель (для проверки)</label>
                        <input
                            type="text"
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            disabled={!canEditInfo}
                            placeholder="Иван И."
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 text-white text-sm focus:border-primary outline-none disabled:opacity-50"
                        />
                    </div>
                </div>
            </div>

            {canEditInfo && (
               <button
                 onClick={handleSaveSettings}
                 disabled={loading}
                 className="w-full py-4 rounded-xl bg-primary text-white font-bold uppercase tracking-widest text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 mt-4"
               >
                 {loading ? 'Сохранение...' : 'Сохранить изменения'}
               </button>
           )}
        </div>
      </div>
  );

  const renderStatsView = () => (
      <div className="space-y-6 animate-slide-up pb-24 h-full">
          <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentView('main')}
                className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition-colors"
              >
                  <ArrowLeft size={24} />
              </button>
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Статистика</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <DollarSign size={80} className="text-primary" />
                    </div>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Выручка</p>
                    <h3 className="text-3xl font-black text-white tracking-tight">{stats.totalRevenue.toLocaleString()} ₽</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl">
                        <ShoppingBag size={20} className="text-zinc-600 mb-2" />
                        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Продаж</p>
                        <h3 className="text-xl font-bold text-white">{stats.totalSales}</h3>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl">
                        <TrendingUp size={20} className="text-zinc-600 mb-2" />
                        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">Ср. Чек</p>
                        <h3 className="text-xl font-bold text-white">{stats.avgCheck} ₽</h3>
                    </div>
                </div>
            </div>
      </div>
  );

  const renderHistoryView = () => (
    <div className="space-y-4 animate-slide-up pb-24 h-full flex flex-col">
         <div className="flex items-center gap-2 mb-2">
              <button 
                onClick={() => setCurrentView('main')}
                className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition-colors"
              >
                  <ArrowLeft size={24} />
              </button>
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">История</h2>
          </div>
        
        {sortedSales.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 border border-zinc-800 border-dashed rounded-3xl bg-zinc-900/30 text-zinc-500">
                <ShoppingBag size={48} className="mb-4 opacity-50" />
                <p className="text-sm">Продаж пока нет</p>
            </div>
        ) : (
            <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1">
                {sortedSales.map(sale => (
                    <button 
                      key={sale.id}
                      onClick={() => handleOpenEditSale(sale)}
                      className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between text-left transition-all hover:bg-zinc-800 active:scale-[0.99]"
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
                        <div className="p-2 bg-zinc-800 rounded-full text-zinc-500">
                            <Edit2 size={14} />
                        </div>
                    </button>
                ))}
            </div>
        )}
    </div>
  );

  const renderArchiveView = () => (
    <div className="space-y-4 animate-slide-up pb-24 h-full flex flex-col">
         <div className="flex items-center gap-2 mb-2">
              <button 
                onClick={() => setCurrentView('main')}
                className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition-colors"
              >
                  <ArrowLeft size={24} />
              </button>
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Архив</h2>
          </div>

        {loadingArchive ? (
             <div className="flex-1 flex items-center justify-center">
                 <div className="animate-spin h-8 w-8 border-2 border-zinc-500 border-t-transparent rounded-full"></div>
             </div>
        ) : archivedProjects.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 border border-zinc-800 border-dashed rounded-3xl bg-zinc-900/30 text-zinc-500">
                <Archive size={48} className="mb-4 opacity-50" />
                <p className="text-sm">Архив пуст</p>
            </div>
        ) : (
            <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1">
                {archivedProjects.map(project => {
                    let icon = <Music size={20} />;
                    let typeLabel = 'Песня';
                    
                    if (project.type === 'EVENT') {
                        icon = <Calendar size={20} />;
                        typeLabel = 'Концерт';
                    } else if (project.type === 'REHEARSAL') {
                        icon = <Mic2 size={20} />;
                        typeLabel = 'Репетиция';
                    }

                    return (
                        <div key={project.id} className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                                    {icon}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-white font-bold truncate">{project.title}</div>
                                    <div className="text-xs text-zinc-500 flex items-center gap-2">
                                        <span>{typeLabel}</span>
                                        {project.date && (
                                            <>
                                                <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
                                                <span>{new Date(project.date).toLocaleDateString()}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
    </div>
  );

  const renderTeamView = () => (
      <div className="space-y-4 animate-slide-up pb-24">
           <div className="flex items-center gap-2 mb-2">
              <button 
                onClick={() => setCurrentView('main')}
                className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition-colors"
              >
                  <ArrowLeft size={24} />
              </button>
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Команда</h2>
          </div>

          <div className="space-y-3">
            {currentBand.members.map(member => (
              <button 
                key={member.id} 
                onClick={() => openMemberProfile(member.id)} 
                className={`w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between transition-all text-left hover:bg-zinc-800 active:scale-[0.99]`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border overflow-hidden shrink-0 ${
                    member.role === UserRole.ADMIN 
                        ? 'bg-primary/10 border-primary/20 text-primary' 
                        : (member.role === UserRole.MODERATOR ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' 
                        : (member.role === UserRole.BAND_MEMBER ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'))
                  }`}>
                    {member.avatarUrl ? (
                         <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                         member.role === UserRole.BAND_MEMBER ? <Mic2 size={20} /> : <User size={20} />
                    )}
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
                            : (member.role === UserRole.MODERATOR ? 'bg-purple-500/20 text-purple-400' 
                            : (member.role === UserRole.BAND_MEMBER ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-400'))
                    }`}>
                    {getRoleLabel(member.role)}
                    </span>
                    <ChevronRight size={16} className="text-zinc-700" />
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
  );

  return (
    // Updated padding: p-5 on mobile, md:p-10 on desktop
    <div className="h-full relative p-5 pt-[calc(1.25rem+env(safe-area-inset-top))] md:p-10">
       {currentView === 'main' && renderMainView()}
       {currentView === 'general' && renderGeneralView()}
       {currentView === 'payments' && renderPaymentsView()}
       {currentView === 'team' && renderTeamView()}
       {currentView === 'stats' && renderStatsView()}
       {currentView === 'history' && renderHistoryView()}
       {currentView === 'archive' && renderArchiveView()}

       {/* EDIT SALE MODAL (Admin/Manager Only) */}
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

      {/* CROPPER MODAL (FOR LOGO) */}
      {isCropping && imageSrc && createPortal(
          <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in touch-none">
              <div className="relative flex-1 bg-black touch-none flex flex-col justify-center">
                   <div className="absolute inset-0 top-0 bottom-20">
                       <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                        cropShape="rect"
                        showGrid={true}
                        objectFit="contain"
                       />
                   </div>
              </div>

              <div className="bg-zinc-900 p-6 pb-safe border-t border-zinc-800 space-y-6 relative z-10">
                  <div className="flex items-center gap-4">
                      <ZoomIn size={20} className="text-zinc-500" />
                      <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                  </div>

                  <div className="flex gap-4">
                      <button 
                        onClick={() => { setIsCropping(false); setImageSrc(null); }}
                        className="flex-1 py-4 rounded-xl bg-zinc-800 text-white font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                      >
                          <X size={18} />
                          Отмена
                      </button>
                      <button 
                        onClick={handleSaveCrop}
                        className="flex-1 py-4 rounded-xl bg-primary text-white font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                      >
                          <Check size={18} />
                          Применить
                      </button>
                  </div>
              </div>
          </div>,
          document.body
      )}
    </div>
  );
}
