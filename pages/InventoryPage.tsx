
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../App';
import { Item, ItemVariant, UserRole } from '../types';
import { BandService, ImageService } from '../services/storage';
import { Plus, Edit2, Search, Package, Image as ImageIcon, Trash2, X, AlertTriangle, ChevronRight, ZoomIn, Check, ChevronLeft } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg, { PixelCrop } from '../utils/canvasUtils';
import { useNavigate } from 'react-router-dom';

export default function InventoryPage() {
  const { currentBand, user, refreshData } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  
  // Form State
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [itemImage, setItemImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(undefined);
  
  // Cropper State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  // Variants State
  const [hasVariants, setHasVariants] = useState(true);
  const [variants, setVariants] = useState<ItemVariant[]>([
    { label: 'S', stock: 0 },
    { label: 'M', stock: 0 },
    { label: 'L', stock: 0 },
    { label: 'XL', stock: 0 }
  ]);

  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
        if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  if (!currentBand || !user) return null;

  const member = currentBand.members.find(m => m.id === user.id);
  const canEdit = member?.role === UserRole.ADMIN || member?.role === UserRole.MODERATOR;

  const handleOpenEdit = (item?: Item) => {
    setShowDeleteConfirm(false); 
    if (item) {
        setCurrentItemId(item.id);
        setName(item.name);
        setPrice(item.price);
        setCurrentImageUrl(item.imageUrl);
        setImagePreview(item.imageUrl || null);
        
        const isUniversal = item.variants.length === 1 && item.variants[0].label === 'Universal';
        setHasVariants(!isUniversal);
        setVariants(JSON.parse(JSON.stringify(item.variants))); 
    } else {
        setCurrentItemId(null);
        setName('');
        setPrice('');
        setCurrentImageUrl(undefined);
        setImagePreview(null);
        setHasVariants(true);
        setVariants([
            { label: 'S', stock: 0 },
            { label: 'M', stock: 0 },
            { label: 'L', stock: 0 },
            { label: 'XL', stock: 0 }
        ]);
    }
    setItemImage(null);
    setIsEditing(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size === 0) {
          alert("Файл поврежден");
          return;
      }
      const objectUrl = URL.createObjectURL(file);
      setImageSrc(objectUrl);
      setIsCropping(true);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      e.target.value = ''; // Reset input to allow re-selecting same file
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
        // Convert Blob to File
        const file = new File([croppedBlob], `item-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setItemImage(file);
        
        // Update Preview
        if (imagePreview && imagePreview.startsWith('blob:')) {
             URL.revokeObjectURL(imagePreview);
        }
        const previewUrl = URL.createObjectURL(croppedBlob);
        setImagePreview(previewUrl);
        
        setIsCropping(false);
        setImageSrc(null);
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка при обработке изображения.');
    }
  };

  const updateVariant = (index: number, field: keyof ItemVariant, value: string | number) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  const addVariant = () => {
    setVariants([...variants, { label: '', stock: 0 }]);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;
    setLoading(true);

    let finalImageUrl = currentImageUrl;
    if (itemImage) {
        const uploadedUrl = await ImageService.upload(itemImage);
        if (uploadedUrl) finalImageUrl = uploadedUrl;
    }

    let finalVariants = variants;
    if (!hasVariants) {
        finalVariants = [{ label: 'Universal', stock: variants[0]?.stock || 0 }];
    } else {
        finalVariants = variants.filter(v => v.label.trim() !== '');
    }

    const itemToSave: Item = {
      id: currentItemId || Math.random().toString(36).substring(7),
      name,
      price: Number(price),
      variants: finalVariants,
      imageUrl: finalImageUrl,
    };

    try {
        await BandService.updateInventory(currentBand.id, itemToSave);
        await refreshData();
        setIsEditing(false);
    } catch (e) {
        console.error(e);
        alert('Ошибка сохранения');
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentItemId) return;
    if (!showDeleteConfirm) {
        setShowDeleteConfirm(true);
        return;
    }
    setLoading(true);
    try {
        await BandService.deleteItem(currentBand.id, currentItemId);
        await refreshData();
        setIsEditing(false);
    } catch (e) {
        console.error(e);
        alert('Ошибка при удалении');
    } finally {
        setLoading(false);
        setShowDeleteConfirm(false);
    }
  };

  const getTotalStock = (item: Item) => item.variants.reduce((acc, v) => acc + v.stock, 0);

  const filteredItems = useMemo(() => {
    return currentBand.inventory
        .filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [currentBand.inventory, searchTerm]);

  return (
    // Updated padding: p-5 on mobile, md:p-10 on desktop
    <div className="space-y-6 h-full flex flex-col pb-24 p-5 pt-[calc(1.25rem+env(safe-area-inset-top))] md:p-10">
      {/* Header */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2">
            <button 
                onClick={() => navigate('/band-settings')}
                className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition-colors"
            >
                <ChevronLeft size={24} />
            </button>
            <div>
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic drop-shadow-lg">Склад</h2>
                <div className="h-1 w-12 bg-primary mt-1 rounded-full"></div>
            </div>
        </div>
        
        {canEdit && (
            <button 
                onClick={() => handleOpenEdit()}
                className="bg-primary hover:bg-primary/90 text-white p-3 rounded-2xl shadow-lg shadow-primary/30 transition-all active:scale-95"
            >
                <Plus size={24} />
            </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
          <Search className="absolute left-4 top-3.5 text-zinc-500" size={20} />
          <input 
            type="text" 
            placeholder="Поиск товаров..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
      </div>

      {/* Inventory List */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pb-4">
          {filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500 opacity-50">
                  <Package size={48} className="mb-2" />
                  <p>Товары не найдены</p>
              </div>
          ) : (
              <div className="grid grid-cols-1 gap-3">
                  {filteredItems.map(item => (
                      <div key={item.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex gap-4 transition-all">
                           <div className="w-20 h-20 bg-zinc-800 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border border-zinc-700">
                                {item.imageUrl ? (
                                    <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <Package size={24} className="text-zinc-600" />
                                )}
                           </div>
                           <div className="flex-1 flex flex-col justify-between py-1">
                               <div className="flex justify-between items-start">
                                   <h3 className="text-white font-bold leading-tight pr-2">{item.name}</h3>
                                   <span className="text-primary font-mono font-bold">{item.price} ₽</span>
                               </div>
                               
                               <div className="flex items-end justify-between mt-2">
                                    <div className="flex flex-wrap gap-1">
                                        {item.variants.length === 1 && item.variants[0].label === 'Universal' ? (
                                            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded-lg">
                                                {item.variants[0].stock} шт
                                            </span>
                                        ) : (
                                            item.variants.map((v, idx) => (
                                                <span key={idx} className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
                                                    {v.label}: {v.stock}
                                                </span>
                                            ))
                                        )}
                                    </div>
                                    
                                    {canEdit && (
                                        <button 
                                            onClick={() => handleOpenEdit(item)}
                                            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400 hover:text-white transition-colors"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                               </div>
                           </div>
                      </div>
                  ))}
              </div>
          )}
      </div>

      {/* Edit Modal (Portal) - Code omitted for brevity, logic remains same */}
      {isEditing && createPortal(
          <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in touch-none">
              <div className="bg-zinc-950 border border-zinc-800 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 pb-12 sm:pb-6 shadow-2xl relative animate-slide-up flex flex-col max-h-[95vh]">
                  <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-white uppercase italic">
                          {currentItemId ? 'Редактировать' : 'Новый товар'}
                      </h3>
                      <button 
                        onClick={() => setIsEditing(false)}
                        className="p-2 -mr-2 text-zinc-500 hover:text-white"
                      >
                          <X size={24} />
                      </button>
                  </div>

                  <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-5 pr-2 touch-pan-y">
                       {/* Image Upload */}
                       <div className="flex justify-center">
                           <label className="relative cursor-pointer group">
                               <div className="w-32 h-32 rounded-2xl bg-zinc-900 border-2 border-dashed border-zinc-700 flex items-center justify-center overflow-hidden transition-colors hover:border-primary relative">
                                   {imagePreview ? (
                                       <img src={imagePreview} className="w-full h-full object-cover" />
                                   ) : (
                                       <div className="flex flex-col items-center text-zinc-600">
                                           <ImageIcon size={32} className="mb-2" />
                                           <span className="text-[10px] uppercase font-bold">Фото</span>
                                       </div>
                                   )}
                                   <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                       <Edit2 size={24} className="text-white" />
                                   </div>
                               </div>
                               <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                           </label>
                       </div>

                       <div className="space-y-4">
                           <div>
                               <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Название</label>
                               <input 
                                    type="text" 
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
                                    placeholder="Футболка Black"
                               />
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Цена (₽)</label>
                               <input 
                                    type="number" 
                                    required
                                    value={price}
                                    onChange={e => setPrice(Number(e.target.value))}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none font-mono"
                                    placeholder="2500"
                               />
                           </div>
                       </div>

                       <div className="pt-4 border-t border-zinc-900">
                           <div className="flex items-center justify-between mb-4">
                               <label className="text-sm font-bold text-white flex items-center gap-2">
                                   <input 
                                    type="checkbox" 
                                    checked={hasVariants}
                                    onChange={e => setHasVariants(e.target.checked)}
                                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-primary focus:ring-offset-black"
                                   />
                                   Есть размеры / Вариации
                               </label>
                           </div>

                           {hasVariants ? (
                               <div className="space-y-3">
                                   {variants.map((v, idx) => (
                                       <div key={idx} className="flex gap-3">
                                           <input 
                                                type="text" 
                                                placeholder="Размер (M)"
                                                value={v.label}
                                                onChange={e => updateVariant(idx, 'label', e.target.value)}
                                                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm focus:border-primary outline-none"
                                           />
                                           <input 
                                                type="number" 
                                                placeholder="Кол-во"
                                                value={v.stock}
                                                onChange={e => updateVariant(idx, 'stock', Number(e.target.value))}
                                                className="w-24 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white text-sm focus:border-primary outline-none font-mono"
                                           />
                                           <button 
                                            type="button"
                                            onClick={() => removeVariant(idx)}
                                            className="p-2 text-zinc-600 hover:text-red-500"
                                           >
                                               <X size={18} />
                                           </button>
                                       </div>
                                   ))}
                                   <button 
                                    type="button"
                                    onClick={addVariant}
                                    className="text-xs text-primary font-bold uppercase hover:underline flex items-center gap-1 mt-2"
                                   >
                                       <Plus size={14} /> Добавить вариант
                                   </button>
                               </div>
                           ) : (
                               <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex items-center justify-between">
                                   <span className="text-zinc-400 text-sm">Количество на складе</span>
                                   <input 
                                        type="number" 
                                        value={variants[0]?.stock || 0}
                                        onChange={e => {
                                            const newV = [...variants];
                                            if (!newV[0]) newV[0] = { label: 'Universal', stock: 0 };
                                            newV[0].stock = Number(e.target.value);
                                            setVariants(newV);
                                        }}
                                        className="w-24 bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-right focus:border-primary outline-none"
                                   />
                               </div>
                           )}
                       </div>
                  </form>

                  <div className="pt-6 mt-4 border-t border-zinc-900 flex gap-3">
                      {currentItemId && (
                           !showDeleteConfirm ? (
                               <button 
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="p-4 rounded-xl bg-zinc-900 text-red-500 hover:bg-red-500/10 transition-colors"
                               >
                                   <Trash2 size={20} />
                               </button>
                           ) : (
                               <button 
                                type="button"
                                onClick={handleDelete}
                                className="px-6 py-4 rounded-xl bg-red-600 text-white font-bold text-xs uppercase hover:bg-red-700 transition-colors"
                               >
                                   Подтвердить
                               </button>
                           )
                      )}
                      <button 
                        onClick={handleSave}
                        disabled={loading}
                        className="flex-1 py-4 rounded-xl bg-primary text-white font-bold uppercase tracking-widest text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                      >
                          {loading ? 'Сохранение...' : 'Сохранить'}
                      </button>
                  </div>
              </div>
          </div>,
          document.body
      )}

      {/* CROPPER MODAL */}
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
