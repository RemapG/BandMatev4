

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../App';
import { Item, ItemVariant, UserRole } from '../types';
import { BandService, ImageService } from '../services/storage';
import { Plus, Edit2, Search, Package, Image as ImageIcon, Trash2, X, AlertTriangle, ChevronRight } from 'lucide-react';

export default function InventoryPage() {
  const { currentBand, user, refreshData } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [itemImage, setItemImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(undefined);
  
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
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setItemImage(file);
      setImagePreview(URL.createObjectURL(file));
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
        finalImageUrl = await ImageService.upload(itemImage);
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

    BandService.updateInventory(currentBand.id, itemToSave);
    refreshData();
    setIsEditing(false);
    setLoading(false);
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

  const filteredItems = currentBand.inventory.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 h-full flex flex-col pb-24">
      {/* Header */}
      <div className="flex items-center justify-between pt-4">
        <div>
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic drop-shadow-lg">Склад</h2>
            <div className="h-1 w-12 bg-gradient-to-r from-primary to-purple-500 rounded-full mt-2"></div>
        </div>
        
        {canEdit && (
          <button
            onClick={() => handleOpenEdit()}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white pl-4 pr-5 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
          >
            <Plus size={22} strokeWidth={2.5} />
            <span className="uppercase text-xs tracking-wider">Новый</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative group sticky top-0 z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-transparent h-20 -top-6 -z-10"></div>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" size={20} />
        <input
          type="text"
          placeholder="Поиск по названию..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-zinc-600 font-medium shadow-xl"
        />
      </div>

      {/* Items List (New Layout) */}
      <div className="space-y-3">
        {filteredItems.map(item => {
            const totalStock = getTotalStock(item);
            const isLowStock = totalStock < 5 && totalStock > 0;
            const isOutOfStock = totalStock === 0;

            return (
                <div 
                    key={item.id} 
                    onClick={() => canEdit && handleOpenEdit(item)}
                    className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex items-center gap-4 transition-all hover:bg-zinc-800 relative overflow-hidden group ${canEdit ? 'cursor-pointer' : ''}`}
                >
                    {/* Status Indicator Bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${isOutOfStock ? 'bg-red-500' : (isLowStock ? 'bg-orange-500' : 'bg-green-500')} opacity-50`}></div>

                    {/* Image */}
                    <div className="h-16 w-16 bg-zinc-800 rounded-xl overflow-hidden shrink-0 border border-zinc-700 relative">
                        {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                <ImageIcon size={20} />
                            </div>
                        )}
                        {isLowStock && (
                            <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center">
                                <AlertTriangle size={16} className="text-orange-300 drop-shadow-md" />
                            </div>
                        )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold text-base line-clamp-1">{item.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                             <span className="text-primary font-mono font-bold text-sm bg-primary/10 px-2 py-0.5 rounded-md">{item.price} ₽</span>
                             {item.variants.length > 1 ? (
                                 <span className="text-[10px] uppercase text-zinc-500 font-bold bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">{item.variants.length} вар.</span>
                             ) : (
                                 <span className="text-[10px] uppercase text-zinc-500 font-bold bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">Universal</span>
                             )}
                        </div>
                    </div>

                    {/* Stock & Action */}
                    <div className="text-right flex flex-col items-end">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-0.5">Остаток</span>
                        <div className={`font-mono font-bold text-lg leading-none ${isOutOfStock ? 'text-red-500' : (isLowStock ? 'text-orange-400' : 'text-white')}`}>
                            {totalStock}
                        </div>
                    </div>
                    
                    {canEdit && <ChevronRight size={18} className="text-zinc-600 group-hover:text-white transition-colors ml-1" />}
                </div>
            )
        })}
        
        {filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <Package size={64} className="mb-4 text-zinc-600" />
                <p className="text-zinc-500">Склад пуст</p>
            </div>
        )}
      </div>

      {/* Edit/Add Modal (Refined Style) */}
      {isEditing && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in touch-none">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl overflow-y-auto overflow-x-hidden max-h-[90vh] relative animate-slide-up touch-pan-y overscroll-contain">
            <button 
                onClick={() => setIsEditing(false)}
                className="absolute top-6 right-6 text-zinc-500 hover:text-white p-2 bg-zinc-900 rounded-full"
            >
                <X size={20} />
            </button>

            <h3 className="text-2xl font-black text-white mb-6 uppercase italic tracking-tighter">
              {currentItemId ? 'Редактировать' : 'Новый Товар'}
            </h3>
            
            <form onSubmit={handleSave} className="space-y-6">
              
               {/* Image Upload Area */}
               <label className="block w-full cursor-pointer group">
                  <div className="w-full h-48 rounded-2xl bg-zinc-900/50 border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center overflow-hidden transition-all hover:border-primary hover:bg-zinc-900 relative">
                      {imagePreview ? (
                          <>
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="bg-black/70 text-white px-3 py-1 rounded-full text-sm font-bold">Изменить</span>
                            </div>
                          </>
                      ) : (
                          <>
                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <ImageIcon size={24} className="text-zinc-500 group-hover:text-primary" />
                            </div>
                            <span className="text-sm text-zinc-500 font-bold uppercase tracking-wide">Загрузить фото</span>
                          </>
                      )}
                  </div>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
               </label>

               <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-2 pl-1">Название</label>
                        <input
                            required
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-bold"
                            placeholder="Название товара"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-2 pl-1">Цена (₽)</label>
                        <input
                            required
                            type="number"
                            value={price}
                            onChange={e => setPrice(Number(e.target.value))}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono font-bold text-lg"
                        />
                    </div>
               </div>

               <div className="pt-4 border-t border-zinc-800/50">
                    <div className="flex items-center justify-between mb-4">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Размеры / Вариации</label>
                        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                            <button
                                type="button"
                                onClick={() => setHasVariants(false)}
                                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${!hasVariants ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                Один
                            </button>
                            <button
                                type="button"
                                onClick={() => setHasVariants(true)}
                                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all ${hasVariants ? 'bg-zinc-700 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                Список
                            </button>
                        </div>
                    </div>

                    {hasVariants ? (
                        <div className="space-y-2 bg-zinc-900/30 p-2 rounded-xl border border-zinc-800/50">
                             {variants.map((v, idx) => (
                                 <div key={idx} className="flex gap-2 items-center">
                                     <input 
                                        type="text" 
                                        placeholder="S, M, L..."
                                        value={v.label}
                                        onChange={(e) => updateVariant(idx, 'label', e.target.value)}
                                        className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none font-bold text-center uppercase"
                                     />
                                     <input 
                                        type="number" 
                                        placeholder="0"
                                        value={v.stock}
                                        onChange={(e) => updateVariant(idx, 'stock', Number(e.target.value))}
                                        className="w-20 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:border-primary outline-none font-mono text-center"
                                     />
                                     <button 
                                        type="button" 
                                        onClick={() => removeVariant(idx)}
                                        className="w-9 h-9 flex items-center justify-center bg-zinc-900 hover:bg-red-500/20 text-zinc-600 hover:text-red-500 rounded-lg transition-colors"
                                     >
                                         <Trash2 size={16} />
                                     </button>
                                 </div>
                             ))}
                             <button
                                type="button"
                                onClick={addVariant}
                                className="w-full py-2 border border-dashed border-zinc-700 rounded-xl text-zinc-500 text-xs font-bold uppercase hover:text-white hover:border-zinc-500 transition-colors flex items-center justify-center gap-2 mt-2"
                             >
                                <Plus size={14} /> Добавить вариант
                             </button>
                        </div>
                    ) : (
                        <div>
                             <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-2 pl-1">Количество</label>
                             <input
                                required
                                type="number"
                                value={variants[0]?.stock || 0}
                                onChange={e => {
                                    const newV = [...variants];
                                    if (!newV[0]) newV[0] = { label: 'Universal', stock: 0 };
                                    newV[0].stock = Number(e.target.value);
                                    newV[0].label = 'Universal';
                                    setVariants(newV);
                                }}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none font-mono text-lg"
                            />
                        </div>
                    )}
               </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white hover:from-primary/90 hover:to-purple-600/90 font-bold uppercase tracking-widest text-sm transition-all shadow-lg shadow-primary/20 disabled:opacity-50 active:scale-[0.98]"
              >
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>

              {currentItemId && (
                  <div className="mt-3">
                     {!showDeleteConfirm ? (
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={loading}
                            className="w-full py-3 text-red-500 hover:text-red-400 font-bold text-xs uppercase tracking-widest transition-all opacity-60 hover:opacity-100"
                        >
                            Удалить Товар
                        </button>
                     ) : (
                        <div className="flex flex-col gap-2 bg-red-500/10 p-4 rounded-xl border border-red-500/20 animate-fade-in mt-4">
                            <div className="flex items-center gap-2 text-red-400 justify-center mb-2">
                                <AlertTriangle size={18} />
                                <span className="text-sm font-bold">Вы уверены?</span>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-3 rounded-lg bg-zinc-900 text-zinc-400 font-bold text-sm hover:text-white transition-colors"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={loading}
                                    className="flex-1 py-3 rounded-lg bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                                >
                                    Да, удалить
                                </button>
                            </div>
                        </div>
                     )}
                  </div>
              )}
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}