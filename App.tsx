
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppView, Product } from './types';
import { INITIAL_INVENTORY } from './constants';
import CustomerStation from './components/CustomerStation';
import SellerStation from './components/SellerStation';
import { localSyncService } from './services/localSyncService';
import { p2pSyncService } from './services/p2pSyncService';
import { Lock, Delete, ChevronLeft, Smartphone, Zap } from 'lucide-react';

const SELLER_PASSWORD = "4477"; 
const LOGO_URL = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTDzUw-18RMVjL-UmOtlBAwkTiTV62-8Yysbw&s";
const STORAGE_KEY = 'discreet_inventory_v11';

const App: React.FC = () => {
  const getInitialInventory = () => {
    if (typeof window === 'undefined') return INITIAL_INVENTORY;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_INVENTORY;
  };

  const [view, setView] = useState<AppView>('customer');
  const [isAuth, setIsAuth] = useState(false);
  const [pin, setPin] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [inventory, setInventory] = useState<Product[]>(getInitialInventory());
  
  const [p2pId, setP2pId] = useState<string>("");
  const [isP2pConnected, setIsP2pConnected] = useState(false);

  useEffect(() => {
    const myId = p2pSyncService.init(
      (remoteData) => setInventory(remoteData),
      (connected) => setIsP2pConnected(connected)
    );
    setP2pId(myId);

    const unsubscribeLocal = localSyncService.subscribe((remoteInventory) => {
      setInventory(remoteInventory);
    });

    return () => {
      p2pSyncService.disconnect();
      unsubscribeLocal();
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
    }
  }, [inventory]);

  const handleUpdateInventory = useCallback((updated: Product[] | ((prev: Product[]) => Product[])) => {
    setInventory(prev => {
      const next = typeof updated === 'function' ? updated(prev) : updated;
      localSyncService.broadcastUpdate(next);
      p2pSyncService.broadcastUpdate(next);
      return next;
    });
  }, []);

  const stats = useMemo(() => {
    const totalUnits = inventory.reduce((sum, item) => sum + (item.stock || 0), 0);
    const uniqueItems = inventory.length;
    return { totalUnits, uniqueItems };
  }, [inventory]);

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin === SELLER_PASSWORD) {
        setIsAuth(true);
        setView('seller');
        setShowAuthModal(false);
        setPin("");
      } else if (newPin.length === 4) {
        setTimeout(() => setPin(""), 500);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f6] font-['Assistant'] w-full shadow-2xl overflow-x-hidden border-x border-slate-100 relative" dir="rtl">
      
      {showAuthModal && (
        <div className="absolute inset-0 z-[100] bg-[#faf9f6] flex flex-col animate-in fade-in duration-500">
          <div className="p-8">
            <button onClick={() => setShowAuthModal(false)} className="flex items-center gap-2 text-slate-500 font-black text-lg uppercase tracking-wider">
              <ChevronLeft size={24} /> סגירה
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-12 max-w-md mx-auto w-full">
            <div className="w-24 h-24 bg-white border-2 border-slate-100 text-[#6b0f24] rounded-full flex items-center justify-center mb-8 shadow-md">
              <Lock size={40} strokeWidth={2} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">כניסת צוות</h2>
            <p className="text-slate-500 text-sm mb-12 font-bold uppercase tracking-widest">הקישי את הקוד הסודי</p>
            <div className="flex gap-8 mb-16">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`w-5 h-5 rounded-full border-2 border-[#6b0f24]/20 transition-all duration-300 ${pin.length > i ? 'bg-[#6b0f24] border-[#6b0f24] scale-125' : 'bg-transparent'}`} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-6 w-full">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button key={num} onClick={() => handlePinInput(num.toString())} className="w-full aspect-square rounded-2xl border-2 border-slate-100 bg-white text-3xl font-black text-slate-700 active:bg-[#6b0f24] active:text-white transition-all shadow-sm">{num}</button>
              ))}
              <div />
              <button onClick={() => handlePinInput("0")} className="w-full aspect-square rounded-2xl border-2 border-slate-100 bg-white text-3xl font-black text-slate-700 active:bg-[#6b0f24] active:text-white transition-all shadow-sm">0</button>
              <button onClick={() => setPin(pin.slice(0, -1))} className="w-full aspect-square rounded-2xl flex items-center justify-center text-slate-400 bg-slate-50 active:bg-slate-100 transition-all"><Delete size={32} /></button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-slate-100 sticky top-0 z-50 px-6 py-5 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img 
                src={LOGO_URL} 
                alt="Discreet" 
                className="h-12 w-auto object-contain" 
                style={{ filter: 'contrast(1.2)' }}
              />
              <div className="h-8 w-[2px] bg-slate-100 hidden sm:block"></div>
              <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border-2 ${isP2pConnected ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                {isP2pConnected ? <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" /> : <Smartphone size={14} />}
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {isP2pConnected ? 'רשת מסונכרנת' : 'ממתין לחיבור'}
                </span>
              </div>
            </div>
            
            <nav className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button onClick={() => setView('customer')} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-wider ${view === 'customer' ? 'bg-white text-[#6b0f24] shadow-md border border-[#6b0f24]/10' : 'text-slate-500'}`}>לקוחה</button>
              <button onClick={() => (isAuth ? setView('seller') : setShowAuthModal(true))} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all uppercase tracking-wider ${view === 'seller' ? 'bg-white text-[#6b0f24] shadow-md border border-[#6b0f24]/10' : 'text-slate-500'}`}>ניהול</button>
            </nav>
          </div>

          {view === 'seller' && (
            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-500">
              <div className="flex flex-col gap-1 p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 shadow-sm transition-all">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">סה"כ פריטים במערכת</span>
                <span className="text-2xl font-black text-slate-900 leading-none">{stats.totalUnits} <span className="text-xs font-bold opacity-40">יחידות</span></span>
              </div>
              <div className="flex flex-col gap-1 p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 shadow-sm transition-all">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">דגמים שונים במלאי</span>
                <span className="text-2xl font-black text-slate-900 leading-none">{stats.uniqueItems} <span className="text-xs font-bold opacity-40">דגמים</span></span>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto h-full">
          {view === 'customer' ? (
            <CustomerStation inventory={inventory} />
          ) : (
            <SellerStation 
              inventory={inventory} 
              onUpdateInventory={handleUpdateInventory} 
              storeId={p2pId}
              onSetStoreId={() => {}}
            />
          )}
        </div>
      </main>

      <footer className="bg-white py-8 px-6 text-center border-t border-slate-100">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">
          Discreet • מערכת סנכרון מקומית • מזהה: {p2pId}
        </p>
      </footer>
    </div>
  );
};

export default App;
