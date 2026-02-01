
import React, { useState } from 'react';
import { Product } from '../types';
import Scanner from './Scanner';
import { p2pSyncService } from '../services/p2pSyncService';
import { PlusCircle, MinusCircle, List, Trash2, ArrowUpRight, ArrowDownRight, UploadCloud, Download, Search, Package, Info, AlertCircle, CheckCircle, Smartphone, Link as LinkIcon, Copy } from 'lucide-react';

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
  const [statusMsg, setStatusMsg] = useState<{text: string, type: 'success' | 'error'} | null>(null);
  const [joinCode, setJoinCode] = useState('');

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 3500);
  };

  const handleScan = (barcode: string) => {
    onUpdateInventory((prevInventory) => {
      const existingIndex = prevInventory.findIndex(p => p.barcode === barcode);
      if (existingIndex === -1) {
        showStatus(`ברקוד ${barcode} לא נמצא במלאי`, 'error');
        return prevInventory;
      }
      const updated = [...prevInventory];
      const p = { ...updated[existingIndex] };
      const delta = mode === 'load' ? 1 : -1;
      p.stock = Math.max(0, (p.stock || 0) + delta);
      updated[existingIndex] = p;
      setLogs(prev => [{ barcode, type: mode, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 5)]);
      showStatus(`${mode === 'load' ? 'הוספנו 1' : 'הפחתנו 1'} עבור ${barcode}`);
      return updated;
    });
  };

  const handleJoinDevice = () => {
    if (!joinCode || joinCode === storeId) {
      showStatus('קוד לא תקין', 'error');
      return;
    }
    showStatus('מנסה להתחבר...', 'success');
    p2pSyncService.connectToPeer(
      joinCode, 
      (data) => onUpdateInventory(data),
      (connected) => {
        if (connected) showStatus('מכשירים חוברו וסונכרנו בהצלחה!');
        else showStatus('החיבור נכשל - בדוק את הקוד', 'error');
      },
      () => inventory
    );
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      let text = new TextDecoder('utf-8').decode(buffer);
      if (text.includes('\uFFFD') || (!/[\u0590-\u05FF]/.test(text) && text.length > 50)) {
        text = new TextDecoder('windows-1255').decode(buffer);
      }
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) { showStatus("קובץ לא תקין", 'error'); return; }
      const delimiter = lines[0].includes(';') ? ';' : ',';
      
      onUpdateInventory((prev) => {
        const nextInventory = [...prev];
        lines.slice(1).forEach((line) => {
          const parts = line.split(delimiter).map(p => p.replace(/^"|"$/g, '').trim());
          if (parts.length >= 7) {
            const barcode = parts[0];
            const existingIdx = nextInventory.findIndex(item => item.barcode === barcode);
            const productData: Product = {
              barcode, itemCode: parts[1], description: parts[2], price: parseFloat(parts[3].replace(/[^\d.]/g, '')) || 0,
              colorCode: parts[4], colorName: parts[5], size: parts[6], stock: existingIdx !== -1 ? nextInventory[existingIdx].stock : 0
            };
            if (existingIdx !== -1) nextInventory[existingIdx] = productData;
            else nextInventory.push(productData);
          }
        });
        showStatus(`המלאי נטען וסונכרן בהצלחה`);
        return nextInventory;
      });
    } catch (err) { showStatus("שגיאה בטעינת הקובץ", 'error'); }
    e.target.value = '';
  };

  const exportToCsv = () => {
    if (inventory.length === 0) { showStatus("אין נתונים לייצוא", 'error'); return; }
    const headers = ["Barcode", "ItemCode", "Description", "Price", "ColorCode", "ColorName", "Size", "Stock"];
    const rows = inventory.map(item => [item.barcode, item.itemCode, item.description, item.price, item.colorCode, item.colorName, item.size, item.stock]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `מלאי_דיסקריט_${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  return (
    <div className="flex flex-col h-full bg-[#fdfcfb]">
      <div className="flex border-b-2 border-slate-200 bg-white sticky top-0 z-40">
        {(['scan', 'list', 'settings'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-8 text-lg font-black uppercase tracking-widest flex items-center justify-center gap-4 transition-all ${activeTab === tab ? 'text-[#6b0f24] border-b-8 border-[#6b0f24] bg-slate-50' : 'text-slate-400'}`}>
            {tab === 'scan' && <Search size={28} />}
            {tab === 'list' && <List size={28} />}
            {tab === 'settings' && <Smartphone size={28} />}
            {tab === 'scan' ? 'עדכון מלאי' : tab === 'list' ? 'רשימה' : 'חיבור'}
          </button>
        ))}
      </div>

      <div className="p-10 flex-1 overflow-y-auto pb-40">
        {activeTab === 'scan' && (
          <div className="space-y-12 animate-in fade-in duration-300 max-w-3xl mx-auto">
            <div className="grid grid-cols-2 gap-6 bg-white p-3 rounded-[2.5rem] shadow-xl border-2 border-slate-100">
              <button onClick={() => setMode('load')} className={`flex items-center justify-center gap-4 py-8 rounded-3xl font-black text-2xl transition-all ${mode === 'load' ? 'bg-[#6b0f24] text-white shadow-2xl scale-105' : 'text-slate-500 hover:bg-slate-50'}`}><PlusCircle size={32} /> קליטה</button>
              <button onClick={() => setMode('sell')} className={`flex items-center justify-center gap-4 py-8 rounded-3xl font-black text-2xl transition-all ${mode === 'sell' ? 'bg-slate-900 text-white shadow-2xl scale-105' : 'text-slate-500 hover:bg-slate-50'}`}><MinusCircle size={32} /> מכירה</button>
            </div>
            
            <Scanner onScan={handleScan} placeholder="סרקי ברקוד לעדכון..." autoFocusEnabled={false} />
            
            <div className="bg-white rounded-[3rem] p-10 border-2 border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">פעולות אחרונות</h3>
                <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-orange-400 animate-pulse" /><span className="text-xs font-black text-orange-600 uppercase">סנכרון פעיל</span></div>
              </div>
              <div className="space-y-4">
                {logs.length > 0 ? logs.map((log, i) => (
                  <div key={i} className="flex justify-between items-center p-6 bg-slate-50 rounded-3xl border-2 border-slate-100">
                     <div className="flex items-center gap-6">
                       <div className={`p-3 rounded-2xl ${log.type === 'load' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                         {log.type === 'load' ? <ArrowUpRight size={28}/> : <ArrowDownRight size={28}/>}
                       </div>
                       <span className="text-3xl font-black font-mono text-slate-800 tracking-wider">{log.barcode}</span>
                     </div>
                     <span className="text-sm font-bold text-slate-400">{log.time}</span>
                  </div>
                )) : <p className="text-center py-16 text-slate-300 text-2xl font-bold italic">ממתין לסריקה...</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'list' && (
          <div className="space-y-10 animate-in fade-in duration-300 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <label className="flex flex-col items-center justify-center gap-4 py-14 bg-white border-4 border-slate-100 rounded-[3rem] shadow-lg cursor-pointer active:scale-95 transition-all group hover:border-[#6b0f24]/30">
                  <UploadCloud className="text-[#6b0f24] group-hover:scale-110 transition-transform" size={60} />
                  <span className="text-lg font-black text-slate-700 uppercase tracking-widest">טעינת קובץ מלאי</span>
                  <input type="file" className="hidden" accept=".csv" onChange={handleCsvUpload} />
               </label>
               <button onClick={exportToCsv} className="flex flex-col items-center justify-center gap-4 py-14 bg-white border-4 border-slate-100 rounded-[3rem] shadow-lg active:scale-95 transition-all group hover:border-emerald-200">
                  <Download className="text-emerald-600 group-hover:scale-110 transition-transform" size={60} />
                  <span className="text-lg font-black text-slate-700 uppercase tracking-widest">הורדת קובץ מלאי</span>
               </button>
            </div>
            <div className="flex items-center justify-between px-6">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">ניהול פריטים ({inventory.length})</h2>
              <button onClick={() => { if(confirm('למחוק הכל?')) onUpdateInventory([]); }} className="text-sm font-black text-rose-400 hover:text-rose-600 uppercase tracking-widest flex items-center gap-3"><Trash2 size={20} /> איפוס מלאי</button>
            </div>
            <div className="space-y-6">
              {inventory.length === 0 ? (
                <div className="py-32 text-center bg-white rounded-[4rem] border-4 border-dashed border-slate-100">
                  <Package size={80} className="mx-auto text-slate-100 mb-8" />
                  <p className="text-slate-400 text-2xl font-bold">אין נתונים להצגה</p>
                </div>
              ) : inventory.map((item) => (
                <div key={item.barcode} className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm flex items-center justify-between group hover:border-[#6b0f24]/20 transition-all">
                  <div className="flex-1">
                    <p className="font-black text-slate-900 text-3xl mb-2">{item.description}</p>
                    <div className="flex flex-wrap items-center gap-5">
                      <span className="bg-slate-100 text-slate-600 text-xs font-black px-4 py-1.5 rounded-xl uppercase border-2 border-slate-200">דגם {item.itemCode}</span>
                      <span className="text-lg text-slate-500 font-bold">{item.colorName} • מידה {item.size} • {item.barcode}</span>
                    </div>
                  </div>
                  <div className={`min-w-[100px] text-center px-6 py-6 rounded-3xl font-black text-4xl transition-all shadow-inner border-4 ${item.stock > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
                    {item.stock}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-10 animate-in fade-in duration-300 max-w-3xl mx-auto">
            <div className="bg-white p-14 rounded-[4rem] border-4 border-slate-100 text-center shadow-2xl">
              <LinkIcon size={80} className="mx-auto text-[#6b0f24] mb-10" />
              <h3 className="text-4xl font-black text-slate-900 mb-4">חיבור מכשיר נוסף</h3>
              <p className="text-slate-500 text-xl font-bold mb-14 tracking-wide">הזיני את הקוד ממכשיר אחר כדי לסנכרן ביניהם</p>
              
              <div className="bg-slate-50 p-10 rounded-[3rem] border-4 border-slate-200 mb-14 group relative">
                <span className="text-xs font-black text-slate-400 block mb-6 uppercase tracking-widest">הקוד של המכשיר הזה:</span>
                <div className="flex items-center justify-center gap-6">
                   <span className="text-5xl font-black text-[#6b0f24] font-mono tracking-widest uppercase">{storeId}</span>
                   <button onClick={() => { navigator.clipboard.writeText(storeId || ''); showStatus('הקוד הועתק'); }} className="p-4 bg-white rounded-2xl text-slate-400 hover:text-[#6b0f24] transition-all shadow-md"><Copy size={32} /></button>
                </div>
              </div>

              <div className="space-y-6">
                <input 
                  type="text" 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="הזיני קוד של טאבלט אחר..." 
                  className="w-full p-8 bg-slate-50 border-4 border-slate-100 rounded-[2.5rem] text-center font-black text-3xl tracking-widest uppercase focus:border-[#6b0f24] transition-all text-slate-800 shadow-inner"
                />
                <button onClick={handleJoinDevice} className="w-full py-10 bg-slate-900 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl flex items-center justify-center gap-5 active:scale-95 transition-all uppercase tracking-widest">
                  <Smartphone size={36} />
                  חברי מכשירים עכשיו
                </button>
              </div>
            </div>

            <div className="bg-[#6b0f24]/5 border-4 border-[#6b0f24]/10 p-10 rounded-[3.5rem] flex gap-8 items-center">
              <Info className="text-[#6b0f24] shrink-0" size={40} />
              <p className="text-lg font-bold text-[#6b0f24]/80 leading-relaxed">
                שימי לב: החיבור פועל בתוך הרשת המקומית. כל עדכון מלאי שתבצעי כאן יופיע מיידית גם במסך של הלקוחה וגם בטאבלטים אחרים.
              </p>
            </div>
          </div>
        )}
      </div>

      {statusMsg && (
        <div className={`fixed bottom-12 left-10 right-10 z-50 px-12 py-8 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.3)] flex items-center justify-center gap-6 animate-in slide-in-from-bottom-10 duration-300 ${statusMsg.type === 'success' ? 'bg-slate-900 text-white border-4 border-white/10' : 'bg-rose-800 text-white border-4 border-white/10'}`}>
          {statusMsg.type === 'success' ? <CheckCircle size={36} className="text-emerald-400" /> : <AlertCircle size={36} />}
          <span className="font-black text-2xl tracking-wide">{statusMsg.text}</span>
        </div>
      )}
    </div>
  );
};

export default SellerStation;
