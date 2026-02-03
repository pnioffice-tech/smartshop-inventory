
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppView, Product } from './types';
import { INITIAL_INVENTORY } from './constants';
import CustomerStation from './components/CustomerStation';
import SellerStation from './components/SellerStation';
import { localSyncService } from './services/localSyncService';
import { p2pSyncService } from './services/p2pSyncService';
import { Lock, Delete, ChevronLeft, Smartphone } from 'lucide-react';

const SELLER_PASSWORD = "4477"; 
const LOGO_URL = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTDzUw-18RMVjL-UmOtlBAwkTiTV62-8Yysbw&s";
const STORAGE_KEY = 'discreet_inventory_v12';

const App: React.FC = () => {
  const inventoryRef = useRef<Product[]>([]);
  
  const getInitialInventory = () => {
    if (typeof window === 'undefined') return INITIAL_INVENTORY;
    const saved = localStorage.getItem(STORAGE_KEY);
    const data = saved ? JSON.parse(saved) : INITIAL_INVENTORY;
    inventoryRef.current = data;
    return data;
  };

  const [view, setView] = useState<AppView>('customer');
  const [isAuth, setIsAuth] = useState(false);
  const [pin, setPin] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [inventory, setInventory] = useState<Product[]>(getInitialInventory());
  const [p2pId, setP2pId] = useState<string>("טוען...");
  const [isP2pConnected, setIsP2pConnected] = useState(false);

  useEffect(() => {
    p2pSyncService.init(
      (remoteData) => {
        setInventory(remoteData);
        inventoryRef.current = remoteData;
      },
      (connected) => setIsP2pConnected(connected),
      (id) => setP2pId(id),
      () => inventoryRef.current
    );

    const unsubscribeLocal = localSyncService.subscribe((remoteInventory) => {
      setInventory(remoteInventory);
      inventoryRef.current = remoteInventory;
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
      inventoryRef.current = next;
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
    <div className="h-screen w-screen flex flex-col bg-[#faf9f6] font-['Assistant'] overflow-hidden relative select-none" dir="rtl">
      
      {showAuthModal && (
        <div className="absolute inset-0 z-[100] bg-[#faf9f6] flex flex-col animate-in fade-in duration-300">
          <div className="p-4">
            <button onClick={() => setShowAuthModal(false)} className="flex items-center gap-2 text-slate-500 font-black text-xl">
              <ChevronLeft size={24} /> חזרה
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-8 max-w-md mx-auto w-full">
            <div className="w-20 h-20 bg-white border-4 border-slate-100 text-[#6b0f24] rounded-full flex items-center justify-center mb-6 shadow-lg">
              <Lock size={40} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">כניסת צוות</h2>
            <p className="text-slate-400 text-base mb-8 font-bold uppercase tracking-widest">הקישי קוד סודי</p>
            <div className="flex gap-6 mb-12">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`w-4 h-4 rounded-full border-2 border-[#6b0f24]/20 transition-all ${pin.length > i ? 'bg-[#6b0f24] border-[#6b0f24] scale-125' : 'bg-transparent'}`} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4 w-full">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button key={num} onClick={() => handlePinInput(num.toString())} className="w-full aspect-square rounded-2xl border-2 border-slate-100 bg-white text-3xl font-black text-slate-700 active:bg-[#6b0f24] active:text-white shadow-sm transition-transform active:scale-95">{num}</button>
              ))}
              <div />
              <button onClick={() => handlePinInput("0")} className="w-full aspect-square rounded-2xl border-2 border-slate-100 bg-white text-3xl font-black text-slate-700 active:bg-[#6b0f24] active:text-white shadow-sm transition-transform active:scale-95">0</button>
              <button onClick={() => setPin(pin.slice(0, -1))} className="w-full aspect-square rounded-2xl flex items-center justify-center text-slate-400 bg-slate-50 active:bg-slate-100"><Delete size={32} /></button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-slate-100 flex-none px-6 py-3 shadow-sm z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <img src={LOGO_URL} alt="Discreet" className="h-10 w-auto object-contain" />
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border-2 ${isP2pConnected ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
              <div className={`w-2.5 h-2.5 rounded-full ${isP2pConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">{isP2pConnected ? 'סנכרון פעיל' : 'ממתין לחיבור'}</span>
            </div>
          </div>
          
          <div className="flex-1 flex justify-center gap-8">
            {view === 'seller' && (
              <>
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">סה"כ פריטים</p>
                  <p className="text-xl font-black text-[#6b0f24] leading-none">{stats.totalUnits}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">דגמים</p>
                  <p className="text-xl font-black text-[#6b0f24] leading-none">{stats.uniqueItems}</p>
                </div>
              </>
            )}
          </div>

          <nav className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
            <button onClick={() => setView('customer')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${view === 'customer' ? 'bg-white text-[#6b0f24] shadow-md' : 'text-slate-500'}`}>לקוחה</button>
            <button onClick={() => (isAuth ? setView('seller') : setShowAuthModal(true))} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${view === 'seller' ? 'bg-white text-[#6b0f24] shadow-md' : 'text-slate-500'}`}>ניהול</button>
          </nav>
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
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
      </main>

      <footer className="bg-white py-2 px-6 text-center border-t border-slate-100 flex-none">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
          Discreet Sync • {p2pId}
        </p>
      </footer>
    </div>
  );
};

export default App;
