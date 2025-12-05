import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import { User, Band, BandMember, UserRole } from './types';
import { AuthService, BandService } from './services/storage';
import { LayoutDashboard, ShoppingCart, Shirt, Users, LogOut, Music, ChevronDown, PlusCircle, User as UserIcon, Settings, Menu as MenuIcon } from 'lucide-react';

// --- Pages ---
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import POSPage from './pages/POSPage';
import InventoryPage from './pages/InventoryPage';
import TeamPage from './pages/TeamPage';
import SettingsPage from './pages/SettingsPage';

// --- Context ---
interface AppContextType {
  user: User | null;
  currentBand: Band | null;
  userBands: Band[];
  currentUserRole: UserRole | null;
  refreshData: () => Promise<{ user: User | null; bands: Band[] }>;
  switchBand: (bandId: string) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType>({} as AppContextType);
export const useApp = () => useContext(AppContext);

// --- Layout ---
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, currentBand, userBands, switchBand } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [isBandMenuOpen, setIsBandMenuOpen] = useState(false);

  // Desktop Navigation
  const desktopNavItems = [
    { icon: LayoutDashboard, label: 'Главная', path: '/dashboard' },
    { icon: ShoppingCart, label: 'Касса', path: '/pos' },
    { icon: Shirt, label: 'Склад', path: '/inventory' },
    { icon: Users, label: 'Команда', path: '/team' },
    { icon: Settings, label: 'Настройки', path: '/settings' },
  ];

  // Mobile Navigation
  const mobileNavItems = [
    { icon: LayoutDashboard, label: 'Главная', path: '/dashboard' },
    { icon: ShoppingCart, label: 'Касса', path: '/pos' },
    { icon: Shirt, label: 'Склад', path: '/inventory' },
    { icon: MenuIcon, label: 'Меню', path: '/settings' },
  ];

  return (
    // Updated container to use 100dvh (Dynamic Viewport Height) to avoid address bar issues
    // Added 'overscroll-none' to prevent bounce effects on the root container
    <div className="flex flex-col h-[100dvh] w-full bg-black md:flex-row text-zinc-100 overflow-hidden overscroll-none touch-none">
      {/* Desktop Sidebar (Hidden on Mobile) */}
      <div className="hidden md:flex flex-col w-72 bg-zinc-950 border-r border-zinc-900 p-6 z-20">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-800 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-900/50">
             <Music size={24} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-black tracking-tighter italic">BANDMATE</h1>
        </div>

        {/* Desktop Band Switcher */}
        <div className="relative mb-8">
          <button 
            onClick={() => setIsBandMenuOpen(!isBandMenuOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/50 hover:bg-zinc-900 rounded-2xl border border-zinc-800/50 hover:border-zinc-700 transition-all group"
          >
            <div className="flex items-center gap-3 overflow-hidden">
               <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0 border border-zinc-700">
                  {currentBand?.imageUrl ? (
                    <img src={currentBand.imageUrl} alt="" className="w-full h-full object-cover"/>
                  ) : (
                    <Music size={14} className="text-zinc-500" />
                  )}
               </div>
               <div className="flex flex-col items-start overflow-hidden">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Группа</span>
                <span className="font-bold text-white truncate w-28 text-left group-hover:text-primary transition-colors">{currentBand?.name || 'Выбрать'}</span>
               </div>
            </div>
            <ChevronDown size={16} className={`text-zinc-500 transition-transform ${isBandMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isBandMenuOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in p-1">
              {userBands.map(b => (
                <button
                  key={b.id}
                  onClick={() => {
                    switchBand(b.id);
                    setIsBandMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm rounded-xl transition-colors ${
                    b.id === currentBand?.id ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                  }`}
                >
                  {b.name}
                </button>
              ))}
              <div className="h-px bg-zinc-800 my-1"></div>
              <button
                onClick={() => {
                  navigate('/onboarding');
                  setIsBandMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-xl transition-colors"
              >
                <PlusCircle size={14} />
                Создать / Вступить
              </button>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-2">
          {desktopNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group ${
                location.pathname === item.path
                  ? 'bg-primary/10 text-primary font-bold shadow-[0_0_20px_rgba(139,92,246,0.1)]'
                  : 'text-zinc-500 hover:bg-zinc-900/50 hover:text-white'
              }`}
            >
              <item.icon size={20} className={location.pathname === item.path ? 'text-primary' : 'group-hover:scale-110 transition-transform'} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        
        <div className="pt-6 border-t border-zinc-900 mt-4">
          <div className="flex items-center gap-3 px-2 mb-4">
             <div className="h-10 w-10 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700">
                {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="User" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                        <UserIcon size={18} />
                    </div>
                )}
             </div>
             <div className="flex-1 overflow-hidden">
                <div className="text-sm text-white font-bold truncate">{user?.name}</div>
             </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {/* Added pt-safe to respect Top Notch area */}
      <main className="flex-1 flex flex-col h-full bg-black relative overflow-hidden pt-safe overscroll-none">
        {/* Mobile Page Content - No Top Header */}
        {/* 'overscroll-contain' and 'overflow-y-auto' allows scrolling INSIDE but not bouncing the whole page */}
        {/* 'touch-auto' allows scrolling, parent has 'touch-none' to prevent bounce elsewhere */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth pb-24 md:pb-0 md:p-10 overscroll-contain touch-auto no-scrollbar">
          <div className="max-w-7xl mx-auto min-h-full p-5 md:p-0">
             {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Nav - Floating Glass */}
      {/* Added pb-safe to push it up from Home Indicator */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 p-4 pb-safe z-50 pointer-events-none">
        <div className="bg-zinc-900/85 backdrop-blur-2xl border border-zinc-800/50 rounded-3xl p-2 flex justify-between items-center shadow-2xl shadow-black/80 pointer-events-auto">
          {mobileNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 rounded-2xl transition-all relative ${
                  isActive ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                {isActive && (
                  <span className="text-[10px] font-bold absolute -bottom-6 opacity-0 pointer-events-none">
                      {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

// --- Loading Component ---
const LoadingScreen = () => (
    <div className="h-[100dvh] w-screen flex flex-col items-center justify-center bg-black gap-4 overscroll-none touch-none">
        <div className="text-primary animate-pulse font-black text-3xl italic">BANDMATE</div>
        <div className="h-1 w-24 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-slide-up w-full origin-left"></div>
        </div>
    </div>
);

// --- Main App ---
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userBands, setUserBands] = useState<Band[]>([]);
  const [currentBand, setCurrentBand] = useState<Band | null>(null);
  
  // isInitialized ensures we don't render routes until the *initial* check is totally done
  const [isInitialized, setIsInitialized] = useState(false);

  const refreshData = async (): Promise<{ user: User | null; bands: Band[] }> => {
    try {
        const currentUser = await AuthService.getCurrentUser();
        let myBands: Band[] = [];

        if (currentUser) {
            myBands = await BandService.getUserBands(currentUser);
            
            // Sync State
            setUser(currentUser);
            setUserBands(myBands);

            // Logic to preserve or set current band
            if (currentBand) {
                const updatedCurrent = myBands.find(b => b.id === currentBand.id);
                setCurrentBand(updatedCurrent || myBands[0] || null);
            } else if (myBands.length > 0) {
                setCurrentBand(myBands[0]);
            } else {
                setCurrentBand(null);
            }
        } else {
            setUser(null);
            setUserBands([]);
            setCurrentBand(null);
        }
        
        return { user: currentUser, bands: myBands };
    } catch (e) {
        console.error("Failed to refresh data", e);
        return { user: null, bands: [] };
    }
  };

  useEffect(() => {
    const init = async () => {
        setIsInitialized(false);
        await refreshData();
        // Artificial delay for smooth transition if data loads too fast, 
        // helps avoid flicker between "Login" and "Dashboard" if session exists
        setTimeout(() => setIsInitialized(true), 500); 
    }
    init();
  }, []);

  const logout = async () => {
    await AuthService.logout();
    setUser(null);
    setUserBands([]);
    setCurrentBand(null);
  };

  const switchBand = (bandId: string) => {
    const band = userBands.find(b => b.id === bandId);
    if (band) setCurrentBand(band);
  };

  const currentUserRole = React.useMemo(() => {
    if (!currentBand || !user) return null;
    const member = currentBand.members.find(m => m.id === user.id);
    return member ? member.role : null;
  }, [currentBand, user]);

  if (!isInitialized) return <LoadingScreen />;

  return (
    <AppContext.Provider value={{ user, currentBand, userBands, currentUserRole, refreshData, switchBand, logout }}>
      <HashRouter>
        <Routes>
          <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/" />} />
          
          <Route path="/" element={
            user ? (
              userBands.length > 0 ? <Navigate to="/dashboard" /> : <Navigate to="/onboarding" />
            ) : (
              <Navigate to="/auth" />
            )
          } />

          <Route path="/onboarding" element={
            user ? <OnboardingPage /> : <Navigate to="/auth" />
          } />

          <Route path="/dashboard" element={
            user && currentBand ? <AppLayout><DashboardPage /></AppLayout> : <Navigate to="/" />
          } />
          
          <Route path="/pos" element={
            user && currentBand ? <AppLayout><POSPage /></AppLayout> : <Navigate to="/" />
          } />
          
          <Route path="/inventory" element={
            user && currentBand ? <AppLayout><InventoryPage /></AppLayout> : <Navigate to="/" />
          } />
          
           <Route path="/team" element={
            user && currentBand ? <AppLayout><TeamPage /></AppLayout> : <Navigate to="/" />
          } />

          <Route path="/settings" element={
            user ? <AppLayout><SettingsPage /></AppLayout> : <Navigate to="/" />
          } />

        </Routes>
      </HashRouter>
    </AppContext.Provider>
  );
}