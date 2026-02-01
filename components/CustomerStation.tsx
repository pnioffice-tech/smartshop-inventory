
import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import Scanner from './Scanner';
import { Palette, ChevronLeft, ShoppingBag, ArrowRight, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

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
      timer = window.setTimeout(reset, 6000);
    } else if (scannedProduct) {
      timer = window.setTimeout(reset, 60000); // 1 minute auto-reset
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [scannedProduct, error]);

  const handleScan = (barcode: string) => {
    const product = inventory.find(p => p.barcode === barcode);
    if (product) {
      setScannedProduct(product);
      setError(null);
      setIsScanning(false);
    } else {
      setScannedProduct(null);
      setError(`הפריט עם הברקוד ${barcode} לא רשום במערכת.`);
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
    <div className="flex flex-col h-full bg-[#faf9f6]">
      {isScanning ? (
        <div className="p-10 flex flex-col items-center justify-center min-h-[85vh] animate-in fade-in duration-700">
          <div className="text-center mb-16 max-w-4xl">
            <h1 className="text-8xl md:text-9xl font-black text-slate-900 mb-10 tracking-tighter leading-tight">בדיקת מלאי</h1>
            <p className="text-slate-600 font-extrabold text-4xl md:text-5xl tracking-wide leading-relaxed">
              הצמידו את הברקוד לסורק <br/>
              כדי לראות מידות זמינות
            </p>
          </div>
          <Scanner onScan={handleScan} placeholder="סרקו ברקוד..." />
          <div className="mt-32 grid grid-cols-2 gap-32 opacity-30 grayscale">
            <div className="flex flex-col items-center gap-6"><ShoppingBag size={120}/><span className="text-3xl font-black uppercase tracking-widest">זמין כאן</span></div>
            <div className="flex flex-col items-center gap-6"><Palette size={120}/><span className="text-3xl font-black uppercase tracking-widest">עוד צבעים</span></div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full animate-in slide-in-from-bottom-12 duration-700 bg-white">
          {error ? (
            <div className="flex flex-col items-center justify-center flex-1 p-16 text-center max-w-4xl mx-auto">
              <div className="w-60 h-60 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-16 shadow-inner border-8 border-rose-100">
                <AlertCircle size={140} />
              </div>
              <h3 className="text-7xl font-black text-slate-900 mb-10">לא נמצא פריט</h3>
              <p className="text-slate-500 font-bold text-4xl mb-24 leading-relaxed">{error}</p>
              <button 
                onClick={reset}
                className="w-full py-16 bg-slate-900 text-white font-black text-5xl rounded-[4rem] shadow-2xl active:scale-95 transition-all uppercase tracking-widest"
              >
                נסי שוב
              </button>
            </div>
          ) : scannedProduct && (
            <div className="flex flex-col h-full overflow-y-auto">
              <div className="p-10 pb-12 max-w-[90rem] mx-auto w-full">
                <button onClick={reset} className="flex items-center gap-8 text-[#6b0f24] font-black text-4xl mb-20 active:scale-95 transition-all hover:bg-slate-50 p-8 rounded-[3rem] w-fit border-4 border-[#6b0f24]/10 shadow-md">
                  <ChevronLeft size={56} /> חזרה לבדיקה חדשה
                </button>
                
                <div className="flex flex-col lg:flex-row justify-between items-center gap-20 mb-20 text-center lg:text-right">
                  <div className="flex-1 space-y-10">
                    <div className="flex items-center justify-center lg:justify-start gap-8 mb-6">
                       <span className="text-3xl font-black text-[#6b0f24] bg-[#f7edf0] px-10 py-5 rounded-[2.5rem] uppercase tracking-widest border-4 border-[#6b0f24]/20 shadow-sm">דגם {scannedProduct.itemCode}</span>
                       {scannedProduct.stock > 0 && (
                         <div className="flex items-center gap-4 text-emerald-700 bg-emerald-50 px-10 py-5 rounded-[2.5rem] border-4 border-emerald-100">
                           <CheckCircle2 size={40} />
                           <span className="text-2xl font-black uppercase">קיים בחנות עכשיו</span>
                         </div>
                       )}
                    </div>
                    <h2 className="text-8xl md:text-[10rem] font-black text-slate-900 leading-[0.85] tracking-tighter">{scannedProduct.description}</h2>
                    <p className="text-5xl md:text-6xl text-slate-500 font-black">צבע: <span className="text-[#6b0f24] border-b-[12px] border-[#6b0f24]/10 pb-2">{scannedProduct.colorName}</span></p>
                  </div>
                  <div className="bg-[#6b0f24] text-white p-20 rounded-[5rem] shadow-[0_50px_120px_rgba(107,15,36,0.4)] min-w-[380px] text-center border-[12px] border-white/5">
                    <p className="text-3xl font-black opacity-70 mb-6 tracking-widest uppercase">מחיר</p>
                    <p className="text-9xl md:text-[12rem] font-black">₪{scannedProduct.price}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-[#fdfcfb] rounded-t-[8rem] p-16 md:p-24 shadow-[0_-50px_150px_rgba(0,0,0,0.15)] border-t-[6px] border-slate-100 max-w-[95rem] mx-auto w-full mt-12">
                <div className="flex items-center justify-center lg:justify-between mb-24">
                  <p className="text-4xl md:text-5xl font-black uppercase text-slate-400 flex items-center gap-8 tracking-[0.25em]">
                    <Sparkles size={60} className="text-[#6b0f24]" />
                    מידות זמינות בחנות ברגע זה
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-16 mb-24">
                  {sizesInCurrentColor.map((p, i) => (
                    <div key={i} className={`p-16 rounded-[6rem] border-8 transition-all flex flex-col items-center justify-center text-center ${
                      p.stock > 0 
                      ? 'bg-white border-[#6b0f24]/20 shadow-[0_40px_100px_rgba(0,0,0,0.1)] scale-105 z-10' 
                      : 'bg-slate-50 border-slate-100 opacity-20 grayscale'
                    }`}>
                      <div className="flex flex-col items-center gap-6 mb-12">
                        <span className="text-5xl font-black text-slate-400 uppercase tracking-[0.3em] border-b-8 border-slate-100 pb-4">מידה</span>
                        <span className="text-[12rem] md:text-[15rem] font-black text-slate-900 leading-none">{p.size}</span>
                      </div>
                      
                      <div className={`w-full py-10 px-12 rounded-[3.5rem] font-black text-6xl transition-all shadow-2xl border-4 ${
                        p.stock > 0 
                        ? 'bg-emerald-600 text-white border-emerald-400' 
                        : 'bg-slate-300 text-slate-600'
                      }`}>
                        {p.stock > 0 ? `יש ${p.stock}` : 'אזל'}
                      </div>
                    </div>
                  ))}
                </div>

                {otherColors.length > 0 && (
                  <div className="bg-white border-[12px] border-[#f7edf0] p-20 rounded-[6rem] flex flex-col lg:flex-row gap-16 mb-24 items-center shadow-2xl">
                    <div className="bg-[#6b0f24] p-12 rounded-[3.5rem] text-white shadow-3xl shrink-0">
                      <Palette size={100} />
                    </div>
                    <div className="text-center lg:text-right space-y-4">
                      <h4 className="text-4xl font-black text-[#6b0f24] uppercase tracking-widest flex items-center justify-center lg:justify-start gap-6">
                        <CheckCircle2 size={50} /> קיים גם בצבעים הבאים:
                      </h4>
                      <p className="text-6xl md:text-7xl font-black text-slate-800 leading-tight">
                        {otherColors.join(' • ')}
                      </p>
                    </div>
                  </div>
                )}

                <button 
                  onClick={reset}
                  className="w-full py-20 bg-slate-900 text-white font-black text-7xl rounded-[5rem] flex items-center justify-center gap-12 shadow-[0_60px_120px_rgba(0,0,0,0.4)] active:scale-[0.98] hover:bg-black transition-all uppercase tracking-[0.3em] mb-20 border-[12px] border-white/10"
                >
                  בדיקת פריט חדש
                  <ArrowRight size={80} strokeWidth={5} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerStation;
