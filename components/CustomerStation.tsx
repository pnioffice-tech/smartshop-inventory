
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
      timer = window.setTimeout(reset, 45000); 
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
      setError(`מצטערים, הפריט ${barcode} לא נמצא במערכת.`);
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
        <div className="p-10 flex flex-col items-center justify-center min-h-[80vh] animate-in fade-in duration-700">
          <div className="text-center mb-16 max-w-2xl">
            <h1 className="text-6xl md:text-7xl font-black text-slate-900 mb-8 tracking-tighter leading-tight">בדיקת מלאי</h1>
            <p className="text-slate-600 font-extrabold text-2xl md:text-3xl tracking-wide leading-relaxed">
              סרקי את הברקוד שעל התווית <br/>
              כדי לראות זמינות ומידות בחנות
            </p>
          </div>
          <Scanner onScan={handleScan} placeholder="סרקי ברקוד..." />
          <div className="mt-24 grid grid-cols-2 gap-20 opacity-20 grayscale">
            <div className="flex flex-col items-center gap-4"><ShoppingBag size={80}/><span className="text-lg font-black uppercase tracking-widest">זמין בחנות</span></div>
            <div className="flex flex-col items-center gap-4"><Palette size={80}/><span className="text-lg font-black uppercase tracking-widest">צבעים נוספים</span></div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full animate-in slide-in-from-bottom-12 duration-700 bg-white">
          {error ? (
            <div className="flex flex-col items-center justify-center flex-1 p-12 text-center max-w-2xl mx-auto">
              <div className="w-40 h-40 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-12 shadow-inner border-4 border-rose-100">
                <AlertCircle size={80} />
              </div>
              <h3 className="text-5xl font-black text-slate-900 mb-6">לא מצאנו את הפריט</h3>
              <p className="text-slate-500 font-bold text-2xl mb-16 leading-relaxed">{error}</p>
              <button 
                onClick={reset}
                className="w-full py-10 bg-slate-900 text-white font-black text-3xl rounded-[2.5rem] shadow-2xl active:scale-95 transition-all uppercase tracking-widest"
              >
                סריקה חוזרת
              </button>
            </div>
          ) : scannedProduct && (
            <div className="flex flex-col h-full overflow-y-auto">
              <div className="p-10 pb-8 max-w-6xl mx-auto w-full">
                <button onClick={reset} className="flex items-center gap-4 text-[#6b0f24] font-black text-2xl mb-14 active:scale-95 transition-all hover:bg-slate-50 p-4 rounded-3xl w-fit">
                  <ChevronLeft size={32} /> חזרה לבדיקה חדשה
                </button>
                
                <div className="flex flex-col lg:flex-row justify-between items-start gap-12 mb-12">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-4 mb-4">
                       <span className="text-lg font-black text-[#6b0f24] bg-[#f7edf0] px-6 py-2.5 rounded-2xl uppercase tracking-widest border-2 border-[#6b0f24]/20">דגם {scannedProduct.itemCode}</span>
                       {scannedProduct.stock > 0 && (
                         <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-5 py-2 rounded-2xl border-2 border-emerald-100">
                           <CheckCircle2 size={20} />
                           <span className="text-sm font-black uppercase">קיים במלאי</span>
                         </div>
                       )}
                    </div>
                    <h2 className="text-6xl md:text-8xl font-black text-slate-900 leading-none tracking-tighter">{scannedProduct.description}</h2>
                    <p className="text-3xl md:text-4xl text-slate-500 font-bold">צבע: <span className="text-[#6b0f24] border-b-4 border-[#6b0f24]/20">{scannedProduct.colorName}</span></p>
                  </div>
                  <div className="bg-[#6b0f24] text-white p-12 rounded-[3.5rem] shadow-[0_30px_60px_rgba(107,15,36,0.3)] min-w-[240px] text-center border-4 border-white/10">
                    <p className="text-xl font-bold opacity-70 mb-2 tracking-widest">מחיר</p>
                    <p className="text-7xl font-black">₪{scannedProduct.price}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-[#fdfcfb] rounded-t-[5rem] p-12 shadow-[0_-30px_80px_rgba(0,0,0,0.08)] border-t-2 border-slate-100 max-w-6xl mx-auto w-full mt-6">
                <div className="flex items-center justify-between mb-12">
                  <p className="text-2xl font-black uppercase text-slate-400 flex items-center gap-4 tracking-widest">
                    <Sparkles size={28} className="text-[#6b0f24]" />
                    מידות זמינות בחנות
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                  {sizesInCurrentColor.map((p, i) => (
                    <div key={i} className={`p-10 rounded-[3.5rem] border-4 transition-all flex flex-col items-center justify-center text-center ${
                      p.stock > 0 
                      ? 'bg-white border-[#6b0f24]/10 shadow-xl' 
                      : 'bg-slate-50 border-slate-100 opacity-30 grayscale'
                    }`}>
                      <div className="flex flex-col items-center gap-2 mb-6">
                        <span className="text-2xl font-bold text-slate-400 uppercase tracking-widest">מידה</span>
                        <span className="text-8xl font-black text-slate-900 leading-none">{p.size}</span>
                      </div>
                      
                      <div className={`w-full py-4 px-6 rounded-3xl font-black text-2xl transition-all ${
                        p.stock > 0 
                        ? 'bg-emerald-500 text-white shadow-lg' 
                        : 'bg-slate-200 text-slate-500'
                      }`}>
                        {p.stock > 0 ? `במלאי: ${p.stock}` : 'אזל במלאי'}
                      </div>
                    </div>
                  ))}
                </div>

                {otherColors.length > 0 && (
                  <div className="bg-white border-4 border-[#f7edf0] p-12 rounded-[4rem] flex flex-col md:flex-row gap-10 mb-16 items-center shadow-sm">
                    <div className="bg-[#6b0f24] p-6 rounded-3xl text-white shadow-xl shrink-0">
                      <Palette size={50} />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-[#6b0f24] uppercase mb-3 tracking-widest flex items-center gap-3">קיים גם בצבעים נוספים:</h4>
                      <p className="text-3xl md:text-4xl font-black text-slate-800 leading-snug">
                        {otherColors.join(' • ')}
                      </p>
                    </div>
                  </div>
                )}

                <button 
                  onClick={reset}
                  className="w-full py-12 bg-slate-900 text-white font-black text-4xl rounded-[3rem] flex items-center justify-center gap-8 shadow-2xl active:scale-[0.98] hover:bg-black transition-all uppercase tracking-[0.2em] mb-8"
                >
                  סריקה חדשה
                  <ArrowRight size={44} strokeWidth={3} />
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
