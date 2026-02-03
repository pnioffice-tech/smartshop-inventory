
import React, { useState } from 'react';
import { Product } from '../types';
import Scanner from './Scanner';
import { audioService } from '../services/audioService';
import { p2pSyncService } from '../services/p2pSyncService';
import { PlusCircle, MinusCircle, List, Trash2, ArrowUpRight, ArrowDownRight, UploadCloud, Download, Search, Smartphone, Link as LinkIcon, Copy, Loader2, CheckCircle } from 'lucide-react';

interface SellerStationProps {
  inventory: Product[];
  onUpdateInventory: (updated: Product[] | ((prev: Product[]) => Product[])) => void;
  storeId: string | null;
  onSetStoreId: (id: string | null) => void;
}

const SellerStation: React.FC<SellerStationProps> = ({ inventory, onUpdateInventory, storeId }) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'list' | 'settings'>('scan');
  const [mode, setMode] = useState<'load' | 'sell'>('load');
  const [logs, setLogs] = useState<{barcode: string, type: string, time: string}[]>([]);
  const [statusMsg, setStatusMsg] = useState<{text: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const showStatus = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setStatusMsg({ text, type });
    if (type !== 'info') {
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  const handleScan = (barcode: string) => {
    onUpdateInventory((prevInventory) => {
      const existingIndex = prevInventory.findIndex(p => p.barcode === barcode);
      if (existingIndex === -1) {
        audioService.playError();
        showStatus(`ברקוד ${barcode} לא נמצא`, 'error');
        return prevInventory;
      }
      audioService.playSuccess();
      const updated = [...prevInventory];
      const p = { ...updated[existingIndex] };
      const delta = mode === 'load' ? 1 : -1;
      p.stock = Math.max(0, (p.stock || 0) + delta);
      updated[existingIndex] = p;
      setLogs(prev => [{ barcode, type: mode, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 3)]);
      showStatus(`${mode === 'load' ? 'נוסף' : 'הופחת'} מלאי`);
      return updated;
    });
  };

  const handleJoinDevice = () => {
    const code = joinCode.trim();
    if (!code || code === storeId) return;
    setIsConnecting(true);
    p2pSyncService.connectToPeer(code, (data) => onUpdateInventory(data), (connected) => {
      setIsConnecting(false);
      if (connected) showStatus('מכשירים חוברו!');
      else showStatus('חיבור נכשל', 'error');
    }, () => inventory);
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      let text = new TextDecoder('utf-8').decode(buffer);
      if (text.includes('\uFFFD')) text = new TextDecoder('windows-1255').decode(buffer);
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) return;
      const delimiter = lines[0].includes(';') ? ';' : ',';
      
      onUpdateInventory((prev) => {
        const nextInventory = [...prev];
        lines.slice(1).forEach((line) => {
          const parts = line.split(delimiter).map(p => p.replace(/^"|"$/g, '').trim());
          if (parts.length >= 8) {
            const barcode = parts[0];
            const stockValue = parseInt(parts[7].replace(/[^\d-]/g, '')) || 0;
            const existingIdx = nextInventory.findIndex(item => item.barcode === barcode);
            const product: Product = {
              barcode, itemCode: parts[1], description: parts[2], price: parseFloat(parts[3]) || 0,
              colorCode: parts[4], colorName: parts[5], size: parts[6], stock: stockValue
            };
            if (existingIdx !== -1) nextInventory[existingIdx] = product;
            else nextInventory.push(product);
          }
        });
        showStatus(`המלאי עודכן מעמודה H`);
        return nextInventory;
      });
    } catch (err) { showStatus("שגיאה בקובץ", 'error'); }
    e.target.value = '';
  };

  const exportToCsv = () => {
    const headers = ["Barcode", "ItemCode", "Description", "Price", "ColorCode", "ColorName", "Size", "Stock"];
    const rows = inventory.map(item => [item.barcode, item.itemCode, item.description, item.price, item.colorCode, item.colorName, item.size, item.stock]);
    const csv = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory_h_column.csv`;
    link.click();
  };

  return (
    <div className="h-full flex flex-col bg-[#fdfcfb] overflow-hidden">
      <div className="flex-none flex bg-white border-b border-slate-100 px-6">
        {(['scan', 'list', 'settings'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-10 py-4 text-base font-black uppercase tracking-widest flex items-center gap-3 transition-all ${activeTab === tab ? 'text-[#6b0f24] border-b-4 border-[#6b0f24]' : 'text-slate-300'}`}>
            {tab === 'scan' ? <Search size={24} /> : tab === 'list' ? <List size={24} /> : <Smartphone size={24} />}
            {tab === 'scan' ? 'עדכון' : tab === 'list' ? 'מלאי' : 'סנכרון'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden p-6">
        {activeTab === 'scan' && (
          <div className="h-full max-w-2xl mx-auto flex flex-col gap-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-2 gap-6 bg-white p-2 rounded-[2rem] shadow-lg border-2 border-slate-50">
              <button onClick={() => setMode('load')} className={`py-6 rounded-2xl font-black text-2xl flex items-center justify-center gap-4 transition-all ${mode === 'load' ? 'bg-[#6b0f24] text-white shadow-xl scale-105' : 'text-slate-400'}`}><PlusCircle /> קליטה</button>
              <button onClick={() => setMode('sell')} className={`py-6 rounded-2xl font-black text-2xl flex items-center justify-center gap-4 transition-all ${mode === 'sell' ? 'bg-slate-900 text-white shadow-xl scale-105' : 'text-slate-400'}`}><MinusCircle /> מכירה</button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <Scanner onScan={handleScan} placeholder="סרקי לעדכון..." autoFocusEnabled={false} />
            </div>
            <div className="bg-white rounded-[2rem] p-4 border-2 border-slate-50 shadow-sm">
              <p className="text-[10px] font-black text-slate-300 uppercase mb-3 tracking-widest">פעולות אחרונות</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {logs.map((log, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                     <div className="flex items-center gap-3">
                       {log.type === 'load' ? <ArrowUpRight className="text-emerald-500" size={24}/> : <ArrowDownRight className="text-rose-500" size={24}/>}
                       <span className="text-xl font-black font-mono text-slate-800">{log.barcode}</span>
                     </div>
                     <span className="text-[10px] font-bold text-slate-400">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'list' && (
          <div className="h-full max-w-5xl mx-auto flex flex-col gap-6 animate-in fade-in duration-300 overflow-hidden">
            <div className="grid grid-cols-2 gap-6 flex-none">
               <label className="flex flex-col items-center justify-center py-6 bg-white border-2 border-slate-50 rounded-[2rem] shadow-md cursor-pointer hover:border-[#6b0f24]/20 transition-all active:scale-95">
                  <UploadCloud className="text-[#6b0f24] mb-2" size={40} />
                  <span className="text-sm font-black text-slate-700 uppercase">ייבוא קובץ (עמודה H)</span>
                  <input type="file" className="hidden" accept=".csv" onChange={handleCsvUpload} />
               </label>
               <button onClick={exportToCsv} className="flex flex-col items-center justify-center py-6 bg-white border-2 border-slate-50 rounded-[2rem] shadow-md hover:border-emerald-200 transition-all active:scale-95">
                  <Download className="text-emerald-600 mb-2" size={40} />
                  <span className="text-sm font-black text-slate-700 uppercase">ייצוא קובץ</span>
               </button>
            </div>
            <div className="flex-1 overflow-y-auto px-2 space-y-3 custom-scroll pb-6">
              {inventory.map((item) => (
                <div key={item.barcode} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-[#6b0f24]/20 transition-all">
                  <div>
                    <p className="font-black text-slate-900 text-xl leading-tight">{item.description}</p>
                    <p className="text-sm text-slate-400 font-bold">{item.colorName} • {item.size} • {item.barcode}</p>
                  </div>
                  <div className={`w-14 h-14 flex items-center justify-center rounded-2xl font-black text-2xl border-2 ${item.stock > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
                    {item.stock}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="h-full max-w-md mx-auto flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-50 text-center shadow-2xl w-full">
              <LinkIcon size={60} className="mx-auto text-[#6b0f24] mb-6" />
              <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">סנכרון טאבלטים</h3>
              <div className="bg-slate-50 p-8 rounded-[2rem] border-2 border-slate-100 mb-8">
                <p className="text-xs font-black text-slate-400 uppercase mb-2">הקוד שלך</p>
                <div className="flex items-center justify-center gap-4">
                   <span className="text-5xl font-black text-[#6b0f24] font-mono uppercase tracking-widest">{storeId}</span>
                   <button onClick={() => { navigator.clipboard.writeText(storeId || ''); showStatus('הועתק'); }} className="p-2 text-slate-300 hover:text-[#6b0f24]"><Copy size={32} /></button>
                </div>
              </div>
              <div className="space-y-4">
                <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="הזיני קוד ממכשיר אחר..." className="w-full p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl text-center font-black text-2xl uppercase focus:border-[#6b0f24] transition-all" />
                <button onClick={handleJoinDevice} disabled={isConnecting} className={`w-full py-6 rounded-2xl font-black text-xl shadow-xl flex items-center justify-center gap-4 transition-all ${isConnecting ? 'bg-slate-200' : 'bg-slate-900 text-white active:scale-95'}`}>
                  {isConnecting ? <Loader2 className="animate-spin" /> : <Smartphone />} {isConnecting ? 'מתחבר...' : 'חברי מכשיר'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {statusMsg && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[250] px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-4 ${
          statusMsg.type === 'error' ? 'bg-rose-800' : 'bg-slate-900'
        } text-white border-2 border-white/10`}>
          {statusMsg.type === 'success' && <CheckCircle size={24} className="text-emerald-400" />}
          <span className="font-black text-xl tracking-tight">{statusMsg.text}</span>
        </div>
      )}
    </div>
  );
};

export default SellerStation;
