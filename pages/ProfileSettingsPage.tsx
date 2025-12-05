
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../App';
import { AuthService, ImageService } from '../services/storage';
import { ChevronLeft, Upload, Save, User as UserIcon, X, Check, ZoomIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import getCroppedImg, { PixelCrop } from '../utils/canvasUtils';

export default function ProfileSettingsPage() {
  const { user, refreshData } = useApp();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  
  // Avatar State
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Cropper State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  useEffect(() => {
    if (user) {
        setName(user.name);
        setDescription(user.description || '');
        setAvatarPreview(user.avatarUrl || null);
    }
  }, [user]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageDataUrl = await readFile(file);
      setImageSrc(imageDataUrl as string);
      setIsCropping(true);
      // Reset cropper state
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    }
  };

  const readFile = (file: File) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(reader.result), false);
      reader.readAsDataURL(file);
    });
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: PixelCrop) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (croppedBlob) {
        setAvatarBlob(croppedBlob);
        setAvatarPreview(URL.createObjectURL(croppedBlob));
        setIsCropping(false);
        setImageSrc(null);
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка при обработке изображения');
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    try {
        let finalAvatarUrl = user.avatarUrl;
        
        if (avatarBlob) {
            // Convert Blob to File for the upload service
            const file = new File([avatarBlob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' });
            finalAvatarUrl = await ImageService.upload(file);
        }

        await AuthService.updateProfile(name, finalAvatarUrl, description);
        await refreshData();
        alert('Профиль обновлен');
        navigate('/settings');
    } catch (e: any) {
        console.error(e);
        alert(`Ошибка: ${e.message || e.error_description || 'Неизвестная ошибка'}`);
    } finally {
        setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex items-center gap-2">
           <button 
             onClick={() => navigate('/settings')}
             className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition-colors"
           >
               <ChevronLeft size={24} />
           </button>
           <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Мой Профиль</h2>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-8">
           {/* Avatar */}
           <div className="flex flex-col items-center">
               <label className="relative cursor-pointer group">
                   <div className="w-32 h-32 rounded-full bg-zinc-800 border-2 border-dashed border-zinc-600 flex items-center justify-center overflow-hidden transition-colors hover:border-primary relative">
                       {avatarPreview ? (
                           <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                       ) : (
                           <UserIcon className="text-zinc-500" size={48} />
                       )}
                       
                       <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Upload size={24} className="text-white" />
                       </div>
                   </div>
                   <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
               </label>
               <p className="text-xs text-zinc-500 mt-3 font-medium">Нажмите для изменения фото</p>
           </div>

           {/* Name */}
           <div className="space-y-2">
               <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-1">Имя</label>
               <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-all font-bold"
               />
           </div>

           {/* Description / Bio */}
           <div className="space-y-2">
               <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest pl-1">Описание / О себе</label>
               <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Напишите пару слов о себе. Это увидят администраторы группы."
                    rows={4}
                    className="w-full bg-black/40 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-all resize-none text-sm"
               />
           </div>

           <button
             onClick={handleSave}
             disabled={loading}
             className="w-full py-4 rounded-xl bg-primary text-white font-bold uppercase tracking-widest text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
           >
             {loading ? 'Сохранение...' : (
                 <>
                    <Save size={18} />
                    Сохранить
                 </>
             )}
           </button>
      </div>

      {/* CROPPER MODAL */}
      {isCropping && imageSrc && createPortal(
          <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in touch-none">
              <div className="relative flex-1 bg-black touch-none">
                   <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                    cropShape="round"
                    showGrid={false}
                   />
              </div>

              <div className="bg-zinc-900 p-6 pb-safe border-t border-zinc-800 space-y-6">
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
                          Готово
                      </button>
                  </div>
              </div>
          </div>,
          document.body
      )}

    </div>
  );
}
