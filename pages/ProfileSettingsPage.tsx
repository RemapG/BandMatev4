
import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import { AuthService, ImageService } from '../services/storage';
import { User, ChevronLeft, Upload, Save, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProfileSettingsPage() {
  const { user, refreshData } = useApp();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
        setName(user.name);
        setDescription(user.description || '');
        setAvatarPreview(user.avatarUrl || null);
    }
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    try {
        let finalAvatarUrl = user.avatarUrl;
        if (avatar) {
            finalAvatarUrl = await ImageService.upload(avatar);
        }

        await AuthService.updateProfile(name, finalAvatarUrl, description);
        await refreshData();
        alert('Профиль обновлен');
        navigate('/settings');
    } catch (e) {
        console.error(e);
        alert('Ошибка при сохранении');
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
                   <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
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
    </div>
  );
}