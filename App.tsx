
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppView, Product } from './types';
import { INITIAL_INVENTORY } from './constants';
import CustomerStation from './components/CustomerStation';
import SellerStation from './components/SellerStation';
import { cloudService } from './services/cloudService';
import { Package, Layers, Cloud, CloudOff, RefreshCw, Lock, Delete, ChevronLeft, Wifi, Circle } from 'lucide-react';

const SELLER_PASSWORD = "1234"; 
const LOGO_URL = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTDzUw-18RMVjL-UmOtlBAwkTiTV62-8Yysbw&s";
const STORAGE_KEY = 'discreet_inventory_v8';

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
  
  const [storeId, setStoreId] = useState<string | null>(() => typeof window !== 'undefined' ? localStorage.getItem('discreet_store_id') : null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [inventory, setInventory] = useState<Product[]>(getInitialInventory());

  const fetchLatest = useCallback(async (id: string) => {
    setIsSyncing(true);
    try {
      const data = await cloudService.fetchStore(id);
      // We set inventory even if empty to allow syncing deletions
      setInventory(data);
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Real-time Supabase Subscription for multi-device sync
  useEffect(() => {
    if (!storeId) return;

    fetchLatest(storeId);

    const subscription = cloudService.subscribeToChanges(storeId, () => {
      console.log("Real-time update received");
      fetchLatest(storeId);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [storeId, fetchLatest]);

  // Persistent Local Storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
    }
  }, [inventory]);

  // Centralized Inventory Updater
  const handleUpdateInventory = useCallback((updated: Product[] | ((prev: Product[]) => Product[])) => {
    setInventory(prev => {
      const next = typeof updated === 'function' ? updated(prev) : updated;
      
      // Auto-sync to cloud if connected
      if (storeId) {
        cloudService.updateStore(storeId, next).catch(err => {
          console.error("Cloud auto-sync failed:", err);
        });
      }
      
      return next;
    });
  }, [storeId]);

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
    <div className="min-h-screen flex flex-col bg-[#faf9f6] font-['Assistant'] max-w-[500px] mx-auto shadow-2xl overflow-x-hidden border-x border-slate-100 relative" dir="rtl">
      
      {showAuthModal && (
        <div className="absolute inset-0 z-[100] bg-[#faf9f6] flex flex-col animate-in fade-in duration-500">
          <div className="p-8">
            <button onClick={() => setShowAuthModal(false)} className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">
              <ChevronLeft size={16} /> סגור
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-12">
            <div className="w-20 h-20 bg-white border border-slate-100 text-[#6b0f24] rounded-full flex items-center justify-center mb-8 shadow-sm">
              <Lock size={28} strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-light text-slate-900 mb-2 tracking-tight">כניסת צוות</h2>
            <p className="text-slate-400 text-xs mb-12 tracking-widest uppercase">הקישי קוד סודי</p>
            <div className="flex gap-6 mb-16">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`w-3 h-3 rounded-full border border-[#6b0f24]/20 transition-all duration-500 ${pin.length > i ? 'bg-[#6b0f24] border-[#6b0f24] scale-125' : 'bg-transparent'}`} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-8 w-full">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button key={num} onClick={() => handlePinInput(num.toString())} className="w-full aspect-square rounded-full border border-slate-50 bg-white text-xl font-light text-slate-600 active:bg-[#6b0f24] active:text-white transition-all shadow-sm">{num}</button>
              ))}
              <div />
              <button onClick={() => handlePinInput("0")} className="w-full aspect-square rounded-full border border-slate-50 bg-white text-xl font-light text-slate-600 active:bg-[#6b0f24] active:text-white transition-all shadow-sm">0</button>
              <button onClick={() => setPin(pin.slice(0, -1))} className="w-full aspect-square rounded-full flex items-center justify-center text-slate-300"><Delete size={24} strokeWidth={1.5} /></button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-slate-50 sticky top-0 z-50 px-6 py-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            {/* Logo Section - Top Right in RTL */}
            <div className="flex items-center gap-3">
              <div className="relative group">
                <img 
                  src={LOGO_URL} 
                  alt="Discreet" 
                  className="h-9 w-auto object-contain transition-all duration-500 hover:scale-105" 
                  style={{ filter: 'contrast(1.1) brightness(0.9) sepia(0.2)' }}
                />
              </div>
              <div className="h-6 w-[1px] bg-slate-100 hidden sm:block"></div>
              <div className="flex flex-col">
                {storeId ? (
                  <div className="flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[8px] font-black text-emerald-700 uppercase tracking-widest">{storeId}</span>
                  </div>
                ) : (
                  <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1">
                    <CloudOff size={10} /> מצב מקומי
                  </span>
                )}
              </div>
            </div>
            
            <nav className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
              <button onClick={() => setView('customer')} className={`px-4 py-1.5 rounded-lg text-[9px] font-bold transition-all uppercase tracking-wider ${view === 'customer' ? 'bg-white text-[#6b0f24] shadow-sm border border-[#6b0f24]/5' : 'text-slate-400'}`}>לקוחה</button>
              <button onClick={() => (isAuth ? setView('seller') : setShowAuthModal(true))} className={`px-4 py-1.5 rounded-lg text-[9px] font-bold transition-all uppercase tracking-wider ${view === 'seller' ? 'bg-white text-[#6b0f24] shadow-sm border border-[#6b0f24]/5' : 'text-slate-400'}`}>ניהול</button>
            </nav>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-[#faf9f6] border border-slate-100 transition-all duration-300">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">סה"כ פריטים</span>
              <span className="text-lg font-light tracking-tight text-slate-900 transition-all">{stats.totalUnits} <span className="text-[9px] font-bold opacity-30">יח'</span></span>
            </div>
            <div className="flex flex-col gap-0.5 p-3 rounded-xl bg-[#faf9f6] border border-slate-100 transition-all duration-300">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">דגמים במלאי</span>
              <span className="text-lg font-light tracking-tight text-slate-900 transition-all">{stats.uniqueItems} <span className="text-[9px] font-bold opacity-30">SKU</span></span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {view === 'customer' ? (
          <CustomerStation inventory={inventory} />
        ) : (
          <SellerStation 
            inventory={inventory} 
            onUpdateInventory={handleUpdateInventory} 
            storeId={storeId}
            onSetStoreId={(id) => {
              setStoreId(id);
              if (typeof window !== 'undefined') {
                if (id) localStorage.setItem('discreet_store_id', id);
                else localStorage.removeItem('discreet_store_id');
              }
            }}
          />
        )}
      </main>

      <footer className="bg-white py-6 px-6 text-center border-t border-slate-50">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">
          Discreet • Boutique terminal
        </p>
      </footer>
    </div>
  );
};

export default App;
