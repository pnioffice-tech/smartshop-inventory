
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppView, Product } from './types';
import { INITIAL_INVENTORY } from './constants';
import CustomerStation from './components/CustomerStation';
import SellerStation from './components/SellerStation';
import { cloudService } from './services/cloudService';
import { Package, Layers, Cloud, CloudOff, RefreshCw, Lock, Delete, ChevronLeft, Wifi } from 'lucide-react';

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
  const [highlight, setHighlight] = useState(false);

  const fetchLatest = useCallback(async (id: string) => {
    setIsSyncing(true);
    try {
      const data = await cloudService.fetchStore(id);
      if (data && data.length > 0) {
        setInventory(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Real-time Supabase Subscription
  useEffect(() => {
    if (!storeId) return;

    fetchLatest(storeId);

    const subscription = cloudService.subscribeToChanges(storeId, () => {
      fetchLatest(storeId);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [storeId, fetchLatest]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
    }
  }, [inventory]);

  const handleUpdateInventory = useCallback((updated: Product[] | ((prev: Product[]) => Product[])) => {
    setInventory(prev => {
      const next = typeof updated === 'function' ? updated(prev) : updated;
      if (storeId) {
        cloudService.updateStore(storeId, next).catch(console.error);
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
              <ChevronLeft size={16} /> Close
            </button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-12">
            <div className="w-20 h-20 bg-white border border-slate-100 text-[#6b0f24] rounded-full flex items-center justify-center mb-8 shadow-sm">
              <Lock size={28} strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-light text-slate-900 mb-2 tracking-tight">Staff Access</h2>
            <p className="text-slate-400 text-xs mb-12 tracking-widest uppercase">Enter Secure PIN</p>
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

      <header className="bg-white border-b border-slate-50 sticky top-0 z-50 px-6 py-6">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <img src={LOGO_URL} alt="Discreet" className="h-10 w-auto object-contain grayscale brightness-0" />
              <div className="flex items-center gap-1.5 mt-2">
                {storeId ? (
                  <span className="text-[8px] font-bold text-emerald-600 flex items-center gap-1 tracking-widest uppercase">
                    <Wifi size={10} className={isSyncing ? "animate-pulse" : ""} /> {storeId}
                  </span>
                ) : (
                  <span className="text-[8px] font-bold text-slate-300 flex items-center gap-0.5 uppercase tracking-widest">
                    <CloudOff size={10} /> Local Mode
                  </span>
                )}
              </div>
            </div>
            
            <nav className="flex items-center gap-1 bg-slate-50 p-1 rounded-full border border-slate-100">
              <button onClick={() => setView('customer')} className={`px-5 py-2 rounded-full text-[10px] font-bold transition-all uppercase tracking-[0.15em] ${view === 'customer' ? 'bg-white text-[#6b0f24] shadow-sm border border-[#6b0f24]/5' : 'text-slate-400'}`}>Customer</button>
              <button onClick={() => (isAuth ? setView('seller') : setShowAuthModal(true))} className={`px-5 py-2 rounded-full text-[10px] font-bold transition-all uppercase tracking-[0.15em] ${view === 'seller' ? 'bg-white text-[#6b0f24] shadow-sm border border-[#6b0f24]/5' : 'text-slate-400'}`}>Staff</button>
            </nav>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={`flex flex-col gap-1 p-4 rounded-2xl transition-all duration-700 bg-[#faf9f6] border border-slate-100`}>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Inventory</span>
              <span className="text-xl font-light tracking-tight text-slate-900">{stats.totalUnits} <span className="text-[10px] font-bold opacity-30">PCS</span></span>
            </div>
            <div className={`flex flex-col gap-1 p-4 rounded-2xl transition-all duration-700 bg-[#faf9f6] border border-slate-100`}>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Collections</span>
              <span className="text-xl font-light tracking-tight text-slate-900">{stats.uniqueItems} <span className="text-[10px] font-bold opacity-30">SKU</span></span>
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

      <footer className="bg-white py-8 px-6 text-center">
        <div className="w-12 h-[1px] bg-[#6b0f24]/10 mx-auto mb-4"></div>
        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.4em]">
          Discreet • 2025 Boutique Terminal
        </p>
      </footer>
    </div>
  );
};

export default App;
