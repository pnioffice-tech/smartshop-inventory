
import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Barcode, ScanLine, CheckCircle2 } from 'lucide-react';

interface ScannerProps {
  onScan: (id: string) => void;
  placeholder?: string;
  autoFocusEnabled?: boolean;
}

const Scanner: React.FC<ScannerProps> = ({ onScan, placeholder = "סרקי ברקוד...", autoFocusEnabled = true }) => {
  const [manualId, setManualId] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocusEnabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocusEnabled]);

  const handleContainerClick = () => {
    if (autoFocusEnabled && inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = manualId.trim();
    if (id) {
      onScan(id);
      setLastScanned(id);
      setManualId('');
      setTimeout(() => setLastScanned(null), 800);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-xl mx-auto" onClick={handleContainerClick}>
      <div className="relative w-full aspect-square bg-white rounded-[5rem] overflow-hidden mb-10 border-4 border-slate-100 shadow-[0_40px_80px_rgba(0,0,0,0.1)] flex items-center justify-center cursor-pointer group hover:border-[#6b0f24]/30 transition-all">
        <div className="relative flex items-center justify-center w-full h-full p-20">
          <div className={`absolute inset-0 bg-[#fdfcfb] transition-all duration-300 ${lastScanned ? 'bg-emerald-50' : 'group-hover:bg-[#fcf8f9]'}`} />
          
          <div className="relative flex flex-col items-center gap-8 text-[#6b0f24] transition-all duration-300">
            {lastScanned ? (
              <CheckCircle2 size={180} className="text-emerald-500 animate-in zoom-in" />
            ) : (
              <div className="flex flex-col items-center opacity-90">
                <ScanLine size={180} strokeWidth={1.5} className="text-[#6b0f24]" />
                <div className="flex gap-8 mt-10">
                  <Barcode size={48} strokeWidth={2} className="opacity-30" />
                  <QrCode size={48} strokeWidth={2} className="opacity-30" />
                </div>
              </div>
            )}
          </div>

          <div className="absolute inset-x-16 top-1/2 -translate-y-1/2 h-2 bg-[#6b0f24] shadow-[0_0_40px_rgba(107,15,36,0.8)] animate-[scan-v_4s_infinite_ease-in-out] rounded-full" />
        </div>
      </div>

      <div className="w-full px-4">
        <form onSubmit={handleManualSubmit} className="relative">
          <input
            ref={inputRef}
            type="text"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder={placeholder}
            className="w-full px-10 py-8 bg-white border-4 border-slate-200 rounded-[2.5rem] text-5xl font-black text-center shadow-2xl focus:border-[#6b0f24] transition-all placeholder:text-slate-300 text-slate-800"
            autoComplete="off"
          />
          <div className="mt-8 text-center">
             <span className="text-lg font-black text-slate-400 uppercase tracking-[0.4em]">
               {autoFocusEnabled ? 'מערכת מוכנה לסריקה' : 'לחצי כאן להקלדה ידנית'}
             </span>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes scan-v {
          0%, 100% { transform: translateY(-180px); opacity: 0; }
          20%, 80% { opacity: 1; }
          50% { transform: translateY(180px); }
        }
      `}</style>
    </div>
  );
};

export default Scanner;
