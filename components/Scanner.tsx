
import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Barcode, ScanLine, CheckCircle2 } from 'lucide-react';

interface ScannerProps {
  onScan: (id: string) => void;
  placeholder?: string;
  autoFocusEnabled?: boolean;
}

const Scanner: React.FC<ScannerProps> = ({ onScan, placeholder = "סרוק ברקוד...", autoFocusEnabled = true }) => {
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
    <div className="flex flex-col items-center w-full max-w-sm mx-auto" onClick={handleContainerClick}>
      <div className="relative w-full aspect-square bg-white rounded-[3rem] overflow-hidden mb-6 border border-slate-100 shadow-2xl flex items-center justify-center cursor-pointer">
        <div className="relative flex items-center justify-center w-full h-full p-12">
          <div className={`absolute inset-0 bg-[#fdfcfb] transition-all duration-300 ${lastScanned ? 'bg-emerald-50' : ''}`} />
          
          <div className="relative flex flex-col items-center gap-4 text-[#6b0f24] transition-all duration-300">
            {lastScanned ? (
              <CheckCircle2 size={80} className="text-emerald-500 animate-in zoom-in" />
            ) : (
              <div className="flex flex-col items-center opacity-80">
                <ScanLine size={100} strokeWidth={1} className="text-[#6b0f24]" />
                <div className="flex gap-3 mt-4">
                  <Barcode size={24} strokeWidth={1} className="opacity-30" />
                  <QrCode size={24} strokeWidth={1} className="opacity-30" />
                </div>
              </div>
            )}
          </div>

          <div className="absolute inset-x-12 top-1/2 -translate-y-1/2 h-0.5 bg-[#6b0f24] shadow-[0_0_20px_rgba(107,15,36,0.6)] animate-[scan-v_4s_infinite_ease-in-out]" />
        </div>
      </div>

      <div className="w-full px-2">
        <form onSubmit={handleManualSubmit} className="relative">
          <input
            ref={inputRef}
            type="text"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder={placeholder}
            className="w-full px-4 py-5 bg-white border border-slate-200 rounded-2xl text-xl font-black text-center shadow-lg focus:border-[#6b0f24] transition-all placeholder:text-slate-300"
            autoComplete="off"
          />
          <div className="mt-4 text-center">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">
               {autoFocusEnabled ? 'Ready for Scan' : 'Touch to Type'}
             </span>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes scan-v {
          0%, 100% { transform: translateY(-120px); opacity: 0; }
          20%, 80% { opacity: 1; }
          50% { transform: translateY(120px); }
        }
      `}</style>
    </div>
  );
};

export default Scanner;
