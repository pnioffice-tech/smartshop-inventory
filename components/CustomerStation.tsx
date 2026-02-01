
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
      // Error screen stays for 5 seconds
      timer = window.setTimeout(reset, 5000);
    } else if (scannedProduct) {
      // Return to scanning screen after exactly 8 seconds as requested
      timer = window.setTimeout(reset, 8000); 
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
      setError(`הפריט ${barcode} לא נמצא במלאי`);
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
    <div className="flex flex-col h-full bg-[#faf9f6] overflow-hidden">
      {isScanning ? (
        <div className="p-10 flex flex-col items-center justify-center h-full animate-in fade-in duration-700">
          <div className="text-center mb-10 max-w-4xl">
            <h1 className="text-8xl md:text-9xl font-black text-slate-900 mb-6 tracking-tighter leading-tight">בדיקת מלאי</h1>
            <p className="text-slate-600 font-extrabold text-4xl md:text-5xl tracking-wide leading-relaxed">
              הצמידו את הברקוד לסורק <br/>
              כדי לראות מידות זמינות בחנות
            </p>
          </div>
          <Scanner onScan={handleScan} placeholder="סרקו ברקוד..." />
          <div className="mt-20 grid grid-cols-2 gap-24 opacity-20 grayscale">
            <div className="flex flex-col items-center gap-4"><ShoppingBag size={100}/><span className="text-2xl font-black uppercase tracking-widest">מלאי עדכני</span></div>
            <div className="flex flex-col items-center gap-4"><Palette size={100}/><span className="text-2xl font-black uppercase tracking-widest">צבעים נוספים</span></div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full animate-in slide-in-from-bottom-12 duration-700 bg-white overflow-hidden">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full p-16 text-center max-w-4xl mx-auto">
              <div className="w-60 h-60 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-12 shadow-inner border-8 border-rose-100">
                <AlertCircle size={140} />
              </div>
              <h3 className="text-7xl font-black text-slate-900 mb-10">לא נמצא פריט</h3>
              <p className="text-slate-500 font-bold text-4xl leading-relaxed">{error}</p>
            </div>
          ) : scannedProduct && (
            <div className="flex flex-row h-full w-full overflow-hidden">
              {/* Left Side: Product Info (40% width) */}
              <div className="w-[40%] h-full p-12 flex flex-col justify-between border-l-4 border-slate-100 bg-white">
                <div className="space-y-8">
                  <div className="flex items-center gap-6">
                    <span className="text-3xl font-black text-[#6b0f24] bg-[#f7edf0] px-8 py-4 rounded-[2rem] uppercase tracking-widest border-4 border-[#6b0f24]/10 shadow-sm">
                      דגם {scannedProduct.itemCode}
                    </span>
                  </div>
                  
                  <h2 className="text-7xl md:text-8xl xl:text-9xl font-black text-slate-900 leading-[0.9] tracking-tighter">
                    {scannedProduct.description}
                  </h2>
                  
                  <div className="space-y-4">
                    <p className="text-4xl md:text-5xl text-slate-400 font-bold uppercase tracking-widest">צבע</p>
                    <p className="text-6xl md:text-7xl text-[#6b0f24] font-black">{scannedProduct.colorName}</p>
                  </div>
                </div>

                <div className="bg-[#6b0f24] text-white p-12 rounded-[4rem] shadow-[0_40px_100px_rgba(107,15,36,0.3)] text-center border-[10px] border-white/5">
                  <p className="text-2xl font-black opacity-60 mb-4 tracking-widest uppercase">מחיר</p>
                  <p className="text-8xl md:text-[10rem] font-black leading-none">₪{scannedProduct.price}</p>
                </div>
              </div>

              {/* Right Side: Inventory Grid (60% width) */}
              <div className="w-[60%] h-full bg-[#fdfcfb] p-12 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-10 shrink-0">
                  <div className="flex items-center gap-6">
                    <Sparkles size={48} className="text-[#6b0f24]" />
                    <p className="text-4xl font-black uppercase text-slate-400 tracking-[0.2em]">מידות זמינות בחנות</p>
                  </div>
                  <div className="text-xl font-black text-slate-400 bg-slate-100 px-6 py-2 rounded-full animate-pulse">
                    חוזר לסריקה בעוד מספר שניות...
                  </div>
                </div>

                {/* Fixed Grid - Designed to fit without scroll */}
                <div className="flex-1 grid grid-cols-2 gap-8 content-start overflow-hidden">
                  {sizesInCurrentColor.map((p, i) => (
                    <div key={i} className={`p-8 rounded-[4rem] border-8 transition-all flex items-center justify-between px-12 ${
                      p.stock > 0 
                      ? 'bg-white border-[#6b0f24]/10 shadow-2xl' 
                      : 'bg-slate-50 border-slate-100 opacity-20 grayscale'
                    }`}>
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-3xl font-black text-slate-400 uppercase tracking-widest">מידה</span>
                        <span className="text-9xl font-black text-slate-900 leading-none">{p.size}</span>
                      </div>
                      
                      <div className={`py-6 px-10 rounded-[2.5rem] font-black text-5xl transition-all shadow-xl border-4 ${
                        p.stock > 0 
                        ? 'bg-emerald-600 text-white border-emerald-400' 
                        : 'bg-slate-200 text-slate-500'
                      }`}>
                        {p.stock > 0 ? `יש ${p.stock}` : 'אזל'}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Other Colors - Bottom Fixed */}
                {otherColors.length > 0 && (
                  <div className="mt-10 bg-white border-8 border-[#f7edf0] p-8 rounded-[4rem] flex items-center gap-10 shadow-xl shrink-0">
                    <div className="bg-[#6b0f24] p-6 rounded-[2rem] text-white shadow-2xl">
                      <Palette size={50} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xl font-black text-[#6b0f24] uppercase tracking-widest flex items-center gap-3">
                        קיים גם בצבעים:
                      </h4>
                      <p className="text-4xl font-black text-slate-800 leading-tight">
                        {otherColors.join(' • ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerStation;
