
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
          <div className="text-center mb-16 max-w-3xl">
            <h1 className="text-7xl md:text-8xl font-black text-slate-900 mb-10 tracking-tighter leading-tight">בדיקת מלאי</h1>
            <p className="text-slate-600 font-extrabold text-3xl md:text-4xl tracking-wide leading-relaxed">
              סרקי את הברקוד שעל התווית <br/>
              כדי לראות מידות שקיימות בחנות
            </p>
          </div>
          <Scanner onScan={handleScan} placeholder="סרקי ברקוד..." />
          <div className="mt-32 grid grid-cols-2 gap-24 opacity-20 grayscale">
            <div className="flex flex-col items-center gap-6"><ShoppingBag size={100}/><span className="text-2xl font-black uppercase tracking-widest">זמין כאן</span></div>
            <div className="flex flex-col items-center gap-6"><Palette size={100}/><span className="text-2xl font-black uppercase tracking-widest">צבעים נוספים</span></div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full animate-in slide-in-from-bottom-12 duration-700 bg-white">
          {error ? (
            <div className="flex flex-col items-center justify-center flex-1 p-16 text-center max-w-3xl mx-auto">
              <div className="w-48 h-48 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-16 shadow-inner border-4 border-rose-100">
                <AlertCircle size={100} />
              </div>
              <h3 className="text-6xl font-black text-slate-900 mb-8">לא מצאנו את הפריט</h3>
              <p className="text-slate-500 font-bold text-3xl mb-20 leading-relaxed">{error}</p>
              <button 
                onClick={reset}
                className="w-full py-12 bg-slate-900 text-white font-black text-4xl rounded-[3rem] shadow-2xl active:scale-95 transition-all uppercase tracking-widest"
              >
                סריקה חוזרת
              </button>
            </div>
          ) : scannedProduct && (
            <div className="flex flex-col h-full overflow-y-auto">
              <div className="p-10 pb-8 max-w-7xl mx-auto w-full">
                <button onClick={reset} className="flex items-center gap-6 text-[#6b0f24] font-black text-3xl mb-16 active:scale-95 transition-all hover:bg-slate-50 p-6 rounded-[2.5rem] w-fit border-2 border-[#6b0f24]/5 shadow-sm">
                  <ChevronLeft size={44} /> חזרה לבדיקה
                </button>
                
                <div className="flex flex-col lg:flex-row justify-between items-start gap-16 mb-16">
                  <div className="flex-1 space-y-6">
                    <div className="flex items-center gap-6 mb-4">
                       <span className="text-2xl font-black text-[#6b0f24] bg-[#f7edf0] px-8 py-3 rounded-[1.5rem] uppercase tracking-widest border-4 border-[#6b0f24]/10 shadow-sm">דגם {scannedProduct.itemCode}</span>
                       {scannedProduct.stock > 0 && (
                         <div className="flex items-center gap-3 text-emerald-700 bg-emerald-50 px-8 py-3 rounded-[1.5rem] border-4 border-emerald-100">
                           <CheckCircle2 size={28} />
                           <span className="text-xl font-black uppercase">קיים בחנות</span>
                         </div>
                       )}
                    </div>
                    <h2 className="text-7xl md:text-9xl font-black text-slate-900 leading-[0.9] tracking-tighter">{scannedProduct.description}</h2>
                    <p className="text-4xl md:text-5xl text-slate-500 font-black">צבע: <span className="text-[#6b0f24] border-b-8 border-[#6b0f24]/10">{scannedProduct.colorName}</span></p>
                  </div>
                  <div className="bg-[#6b0f24] text-white p-14 rounded-[4rem] shadow-[0_40px_100px_rgba(107,15,36,0.35)] min-w-[300px] text-center border-8 border-white/5">
                    <p className="text-2xl font-bold opacity-70 mb-4 tracking-widest uppercase">מחיר</p>
                    <p className="text-8xl md:text-9xl font-black">₪{scannedProduct.price}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-[#fdfcfb] rounded-t-[6rem] p-12 md:p-16 shadow-[0_-40px_100px_rgba(0,0,0,0.1)] border-t-4 border-slate-100 max-w-7xl mx-auto w-full mt-8">
                <div className="flex items-center justify-between mb-16">
                  <p className="text-3xl font-black uppercase text-slate-400 flex items-center gap-6 tracking-[0.2em]">
                    <Sparkles size={36} className="text-[#6b0f24]" />
                    מידות שקיימות עכשיו בחנות
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 mb-20">
                  {sizesInCurrentColor.map((p, i) => (
                    <div key={i} className={`p-12 rounded-[4.5rem] border-4 transition-all flex flex-col items-center justify-center text-center ${
                      p.stock > 0 
                      ? 'bg-white border-[#6b0f24]/10 shadow-2xl scale-105 z-10' 
                      : 'bg-slate-50 border-slate-100 opacity-20 grayscale'
                    }`}>
                      <div className="flex flex-col items-center gap-4 mb-8">
                        <span className="text-4xl font-black text-slate-400 uppercase tracking-widest border-b-4 border-slate-100 pb-2">מידה</span>
                        <span className="text-9xl md:text-[11rem] font-black text-slate-900 leading-none">{p.size}</span>
                      </div>
                      
                      <div className={`w-full py-6 px-8 rounded-[2.5rem] font-black text-4xl transition-all shadow-xl ${
                        p.stock > 0 
                        ? 'bg-emerald-600 text-white border-4 border-emerald-400' 
                        : 'bg-slate-200 text-slate-500'
                      }`}>
                        {p.stock > 0 ? `יש ${p.stock}` : 'אזל'}
                      </div>
                    </div>
                  ))}
                </div>

                {otherColors.length > 0 && (
                  <div className="bg-white border-8 border-[#f7edf0] p-16 rounded-[5rem] flex flex-col lg:flex-row gap-12 mb-20 items-center shadow-xl">
                    <div className="bg-[#6b0f24] p-8 rounded-[2.5rem] text-white shadow-2xl shrink-0">
                      <Palette size={70} />
                    </div>
                    <div className="text-center lg:text-right">
                      <h4 className="text-2xl font-black text-[#6b0f24] uppercase mb-4 tracking-widest flex items-center justify-center lg:justify-start gap-4">
                        <CheckCircle2 size={32} /> קיים גם בצבעים:
                      </h4>
                      <p className="text-4xl md:text-5xl font-black text-slate-800 leading-tight">
                        {otherColors.join(' • ')}
                      </p>
                    </div>
                  </div>
                )}

                <button 
                  onClick={reset}
                  className="w-full py-14 bg-slate-900 text-white font-black text-5xl rounded-[4rem] flex items-center justify-center gap-10 shadow-[0_50px_100px_rgba(0,0,0,0.3)] active:scale-[0.97] hover:bg-black transition-all uppercase tracking-[0.25em] mb-12 border-8 border-white/10"
                >
                  בדיקת פריט חדש
                  <ArrowRight size={56} strokeWidth={4} />
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
