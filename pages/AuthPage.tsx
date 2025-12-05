
import React, { useState } from 'react';
import { AuthService, ImageService } from '../services/storage';
import { useApp } from '../App';
import { Music, ArrowRight, User, Upload, Lock, Mail, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const getErrorMessage = (error: any) => {
    if (!error) return 'Неизвестная ошибка';
    if (typeof error === 'string') return error;
    
    // Check common Supabase error structures
    const msg = error.message || error.error_description || JSON.stringify(error);
    
    // Translation
    if (msg.includes('Invalid login credentials')) return 'Неверный логин или пароль';
    if (msg.includes('User already registered')) return 'Пользователь с таким Email уже существует';
    if (msg.includes('Email not confirmed')) return 'Email не подтвержден. Проверьте почту или настройки.';
    
    return msg;
};

export default function AuthPage() {
  const { refreshData } = useApp();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatar(file);
      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isLogin) {
        await AuthService.login(email, password);
      } else {
        if (!name) throw new Error('Введите имя');
        
        let avatarUrl = undefined;
        if (avatar) {
            // Upload can fail silently (returns undefined), registration continues
            avatarUrl = await ImageService.upload(avatar);
        }
        
        await AuthService.register(name, email, password, avatarUrl);
      }
      
      // CRITICAL: We wait for fresh data BEFORE deciding where to go.
      // This prevents the App from redirecting to /onboarding while bands are still loading.
      const { bands } = await refreshData();
      
      if (bands.length > 0) {
          navigate('/dashboard');
      } else {
          navigate('/onboarding');
      }

    } catch (err: any) {
      console.error(err);
      setError(getErrorMessage(err));
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black">
      <div className="w-full max-w-sm space-y-8 animate-fade-in">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4 text-primary shadow-[0_0_15px_rgba(139,92,246,0.3)]">
            <Music size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">BandMate</h1>
          <p className="text-zinc-400 mt-2">
            {isLogin ? 'С возвращением!' : 'Создайте аккаунт'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Avatar Upload (Register only) */}
          {!isLogin && (
            <div className="flex justify-center mb-6">
              <label className="relative cursor-pointer group">
                <div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-dashed border-zinc-600 flex items-center justify-center overflow-hidden transition-colors hover:border-primary">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="text-zinc-500 group-hover:text-primary" size={24} />
                  )}
                </div>
                <div className="absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full shadow-lg">
                  <User size={12} />
                </div>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          )}

          {/* Name Field (Register only) */}
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-3 top-3.5 text-zinc-500" size={18} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше Имя"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                required={!isLogin}
              />
            </div>
          )}

          {/* Email Field */}
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 text-zinc-500" size={18} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              required
            />
          </div>

          {/* Password Field */}
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 text-zinc-500" size={18} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg px-2">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-4"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                {isLogin ? 'Войти' : 'Зарегистрироваться'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setAvatar(null);
              setAvatarPreview(null);
            }}
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            {isLogin ? 'Нет аккаунта? Создать' : 'Уже есть аккаунт? Войти'}
          </button>
        </div>
      </div>
    </div>
  );
}
