
import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import Scanner from './Scanner';
import { Package, ArrowRight, Palette, ChevronLeft, Boxes, AlertCircle, ShoppingBag } from 'lucide-react';

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
      timer = window.setTimeout(reset, 4000);
    } else if (scannedProduct) {
      timer = window.setTimeout(reset, 15000); 
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
    <div className="flex flex-col h-full">
      {isScanning ? (
        <div className="p-8 flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in duration-700">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">גלי את הקולקציה</h1>
            <p className="text-slate-400 font-bold text-sm tracking-wide">סרקי את הברקוד לבדיקת זמינות ומידות</p>
          </div>
          <Scanner onScan={handleScan} />
          <div className="mt-16 grid grid-cols-2 gap-12 opacity-10 grayscale">
            <div className="flex flex-col items-center gap-2"><ShoppingBag size={40}/><span className="text-[10px] font-black uppercase tracking-widest">In Store</span></div>
            <div className="flex flex-col items-center gap-2"><Palette size={40}/><span className="text-[10px] font-black uppercase tracking-widest">Colors</span></div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full animate-in slide-in-from-bottom-12 duration-700 bg-white">
          {error ? (
            <div className="flex flex-col items-center justify-center flex-1 p-10 text-center">
              <div className="w-24 h-24 bg-[#f7edf0] text-[#6b0f24] rounded-full flex items-center justify-center mb-8">
                <AlertCircle size={48} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-3">אופס!</h3>
              <p className="text-slate-500 font-bold text-lg mb-12">{error}</p>
              <button 
                onClick={reset}
                className="w-full py-6 bg-[#6b0f24] text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest"
              >
                נסי שוב
              </button>
            </div>
          ) : scannedProduct && (
            <div className="flex flex-col h-full">
              <div className="p-8 pb-4">
                <button onClick={reset} className="flex items-center gap-1 text-[#6b0f24] font-black text-xs mb-8 active:scale-95 uppercase tracking-widest">
                  <ChevronLeft size={16} /> חזרה לסריקה
                </button>
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-black text-[#6b0f24] bg-[#f7edf0] px-3 py-1 rounded-full uppercase mb-4 inline-block tracking-widest">דגם: {scannedProduct.itemCode}</span>
                    <h2 className="text-4xl font-black text-slate-900 leading-tight mb-2">{scannedProduct.description}</h2>
                    <p className="text-lg text-slate-400 font-bold">צבע: <span className="text-slate-900">{scannedProduct.colorName}</span></p>
                  </div>
                  <div className="text-left">
                    <p className="text-3xl font-black text-[#6b0f24]">₪{scannedProduct.price}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-[#fdfcfb] rounded-t-[3rem] p-8 shadow-[0_-20px_50px_rgba(107,15,36,0.05)] border-t border-slate-100">
                <p className="text-[11px] font-black uppercase text-slate-400 mb-6 flex items-center gap-2 tracking-[0.2em]">
                   Availability in {scannedProduct.colorName}
                </p>
                <div className="grid grid-cols-2 gap-4 mb-10">
                  {sizesInCurrentColor.map((p, i) => (
                    <div key={i} className={`p-6 rounded-[2rem] border transition-all flex flex-col items-center justify-center ${
                      p.stock > 0 
                      ? 'bg-white border-emerald-100 shadow-sm' 
                      : 'bg-slate-50 border-slate-100 opacity-30 grayscale'
                    }`}>
                      <span className="text-3xl font-black text-slate-900 mb-1">{p.size}</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${p.stock > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {p.stock > 0 ? `Available (${p.stock})` : 'Sold Out'}
                      </span>
                    </div>
                  ))}
                </div>

                {otherColors.length > 0 && (
                  <div className="bg-[#f7edf0] border border-[#f0dee3] p-6 rounded-3xl flex gap-5 mb-10">
                    <div className="text-[#6b0f24] mt-1">
                      <Palette size={24} />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black text-[#6b0f24] uppercase mb-1 tracking-widest">קיים גם בצבעים:</h4>
                      <p className="text-base font-bold text-slate-700 leading-tight">
                        {otherColors.join(', ')}
                      </p>
                    </div>
                  </div>
                )}

                <button 
                  onClick={reset}
                  className="w-full py-7 bg-slate-900 text-white font-black text-xl rounded-3xl flex items-center justify-center gap-4 shadow-2xl active:scale-[0.98] transition-all mt-auto uppercase tracking-[0.2em]"
                >
                  New Scan
                  <ArrowRight size={20} />
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
