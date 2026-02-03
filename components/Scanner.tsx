
import React, { useState, useEffect, useRef } from 'react';
import { ScanLine, CheckCircle2 } from 'lucide-react';

interface ScannerProps {
  onScan: (id: string) => void;
  placeholder?: string;
  autoFocusEnabled?: boolean;
}

const Scanner: React.FC<ScannerProps> = ({ onScan, placeholder = "סרקי ברקוד...", autoFocusEnabled = true }) => {
  const [manualId, setManualId] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Improved Focus Management: 
  // Instead of an aggressive interval, we refocus when the user clicks empty space 
  // or after a small delay if no other input is active.
  useEffect(() => {
    if (!autoFocusEnabled) return;

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (!isInput && inputRef.current) {
        inputRef.current.focus();
      }
    };

    const refocusIfIdle = () => {
      const activeEl = document.activeElement;
      const isUserInOtherInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl !== inputRef.current;
      
      if (!isUserInOtherInput && inputRef.current) {
        inputRef.current.focus();
      }
    };

    window.addEventListener('click', handleGlobalClick);
    const interval = setInterval(refocusIfIdle, 3000); // Less aggressive refocus

    return () => {
      window.removeEventListener('click', handleGlobalClick);
      clearInterval(interval);
    };
  }, [autoFocusEnabled]);

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
    <div className="flex flex-col items-center w-full max-w-xl mx-auto">
      {/* Balanced Scan Icon Container */}
      <div className="relative w-48 h-48 bg-white rounded-[3rem] overflow-hidden mb-6 border-4 border-[#6b0f24]/10 shadow-xl flex items-center justify-center group transition-all">
        <div className="relative flex items-center justify-center w-full h-full p-10">
          <div className={`absolute inset-0 bg-[#fdfcfb] transition-all duration-300 ${lastScanned ? 'bg-emerald-50' : ''}`} />
          
          <div className="relative flex flex-col items-center gap-4 text-[#6b0f24]">
            {lastScanned ? (
              <CheckCircle2 size={100} className="text-emerald-500 animate-in zoom-in" />
            ) : (
              <div className="flex flex-col items-center opacity-80 group-hover:scale-105 transition-transform">
                <ScanLine size={120} strokeWidth={1.5} className="text-[#6b0f24]" />
              </div>
            )}
          </div>

          <div className="absolute inset-x-10 top-1/2 -translate-y-1/2 h-1.5 bg-[#6b0f24] shadow-[0_0_20px_rgba(107,15,36,0.6)] animate-[scan-v_3s_infinite_ease-in-out] rounded-full z-10" />
        </div>
      </div>

      <div className="w-full">
        <form onSubmit={handleManualSubmit} className="relative">
          <input
            ref={inputRef}
            type="text"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder={placeholder}
            className="w-full px-8 py-6 bg-white border-4 border-slate-100 rounded-[2.5rem] text-4xl font-black text-center shadow-lg focus:border-[#6b0f24] transition-all placeholder:text-slate-200 text-slate-800"
            autoComplete="off"
          />
        </form>
      </div>

      <style>{`
        @keyframes scan-v {
          0%, 100% { transform: translateY(-70px); opacity: 0; }
          20%, 80% { opacity: 1; }
          50% { transform: translateY(70px); }
        }
      `}</style>
    </div>
  );
};

export default Scanner;
