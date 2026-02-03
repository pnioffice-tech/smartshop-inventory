
import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import Scanner from './Scanner';
import { audioService } from '../services/audioService';
import { Palette, ChevronLeft, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

interface CustomerStationProps {
  inventory: Product[];
}

const CustomerStation: React.FC<CustomerStationProps> = ({ inventory }) => {
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);

  const reset = () => {
    setScannedProduct(null);
    setError(null);
    setIsScanning(true);
  };

  useEffect(() => {
    let timer: number | undefined;
    if (error) {
      timer = window.setTimeout(reset, 5000);
    } else if (scannedProduct) {
      timer = window.setTimeout(reset, 45000); 
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [scannedProduct, error]);

  const handleScan = (barcode: string) => {
    const product = inventory.find(p => p.barcode === barcode);
    if (product) {
      audioService.playSuccess();
      setScannedProduct(product);
      setError(null);
      setIsScanning(false);
    } else {
      audioService.playError();
      setScannedProduct(null);
      setError(`ברקוד ${barcode} לא נמצא`);
      setIsScanning(false);
    }
  };

  const sizesInCurrentColor = scannedProduct 
    ? inventory.filter(p => p.itemCode === scannedProduct.itemCode && p.colorName === scannedProduct.colorName)
    : [];

  const otherColors = scannedProduct 
    ? Array.from(new Set(inventory
        .filter(p => p.itemCode === scannedProduct.itemCode && p.colorName !== scannedProduct.colorName)
        .map(p => p.colorName)))
    : [];

  return (
    <div className="h-full w-full bg-[#faf9f6] flex flex-col overflow-hidden">
      {isScanning ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
          <div className="text-center mb-10 space-y-4">
            <h1 className="text-7xl md:text-8xl font-black text-slate-900 leading-tight tracking-tighter">בדיקת מלאי</h1>
            <div className="space-y-1">
              <p className="text-slate-600 font-extrabold text-3xl md:text-4xl">הצמידו את הברקוד לסורק</p>
              <p className="text-[#6b0f24] font-black text-2xl md:text-3xl uppercase tracking-wide">כדי לראות מידות זמינות</p>
            </div>
          </div>
          <Scanner onScan={handleScan} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col animate-in slide-in-from-bottom-8 duration-500 bg-white overflow-hidden">
          {error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
              <div className="w-32 h-32 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-8 shadow-inner">
                <AlertCircle size={80} />
              </div>
              <h3 className="text-6xl font-black text-slate-900 mb-6">לא נמצא פריט</h3>
              <p className="text-slate-400 font-bold text-2xl mb-12">{error}</p>
              <button onClick={reset} className="px-20 py-8 bg-slate-900 text-white font-black text-3xl rounded-[2.5rem] shadow-xl active:scale-95 transition-all">נסי שוב</button>
            </div>
          ) : scannedProduct && (
            <div className="h-full flex flex-col overflow-hidden">
              {/* Product Header */}
              <div className="flex-none p-6 border-b-2 border-slate-50 flex items-center justify-between gap-8 bg-white">
                <div className="flex items-center gap-8">
                  <button onClick={reset} className="p-4 bg-slate-50 text-[#6b0f24] rounded-2xl active:scale-90 transition-all border-2 border-[#6b0f24]/5">
                    <ChevronLeft size={48} strokeWidth={3} />
                  </button>
                  <div className="space-y-1">
                    <h2 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-none">{scannedProduct.description}</h2>
                    <div className="flex items-center gap-6">
                       <span className="text-xl font-black text-[#6b0f24] bg-[#f7edf0] px-4 py-1 rounded-xl">דגם {scannedProduct.itemCode}</span>
                       <p className="text-3xl text-slate-500 font-black">צבע: <span className="text-[#6b0f24]">{scannedProduct.colorName}</span></p>
                    </div>
                  </div>
                </div>
                <div className="bg-[#6b0f24] text-white px-12 py-5 rounded-[3rem] shadow-xl text-center border-4 border-white/5 shrink-0">
                  <p className="text-lg font-black opacity-70 uppercase tracking-widest mb-1">מחיר</p>
                  <p className="text-6xl font-black leading-none">₪{scannedProduct.price}</p>
                </div>
              </div>

              {/* Grid Section */}
              <div className="flex-1 p-8 bg-[#fdfcfb] flex flex-col overflow-hidden">
                <div className="mb-6 flex items-center justify-between">
                  <p className="text-2xl font-black uppercase text-slate-400 flex items-center gap-4 tracking-widest">
                    <Sparkles size={32} className="text-[#6b0f24]" />
                    מידות זמינות בחנות
                  </p>
                </div>

                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 overflow-hidden">
                  {sizesInCurrentColor.map((p, i) => (
                    <div key={i} className={`flex flex-col rounded-[3rem] border-4 transition-all overflow-hidden ${
                      p.stock > 0 ? 'bg-white border-[#6b0f24]/10 shadow-lg' : 'bg-slate-50 border-slate-100 opacity-20 grayscale'
                    }`}>
                      <div className="flex-1 flex flex-col items-center justify-center p-4">
                        <span className="text-xl font-black text-slate-300 uppercase tracking-widest mb-2">מידה</span>
                        <span className="text-8xl font-black text-slate-900 leading-none">{p.size}</span>
                      </div>
                      <div className={`py-5 text-center font-black text-3xl ${p.stock > 0 ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-500'}`}>
                        {p.stock > 0 ? `יש ${p.stock}` : 'אזל'}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Actions */}
                <div className="mt-8 flex items-center justify-between gap-8">
                   <div className="flex-1 bg-white border-2 border-[#f7edf0] px-8 py-4 rounded-[2rem] flex items-center gap-6 shadow-sm">
                      <Palette size={40} className="text-[#6b0f24] shrink-0" />
                      <p className="text-2xl font-black text-slate-700">קיים גם ב: <span className="text-[#6b0f24]">{otherColors.length > 0 ? otherColors.join(' • ') : 'אין'}</span></p>
                   </div>
                   <button onClick={reset} className="shrink-0 bg-slate-900 text-white px-12 py-6 rounded-[2.5rem] font-black text-3xl shadow-xl flex items-center gap-5 active:scale-95 transition-transform border-4 border-white/5">
                      סריקה חדשה <ArrowRight size={40} strokeWidth={3} />
                   </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerStation;
