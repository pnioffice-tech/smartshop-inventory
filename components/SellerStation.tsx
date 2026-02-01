
import React, { useState } from 'react';
import { Product } from '../types';
import Scanner from './Scanner';
import { p2pSyncService } from '../services/p2pSyncService';
import { PlusCircle, MinusCircle, List, Trash2, ArrowUpRight, ArrowDownRight, UploadCloud, Download, Search, Zap, Package, Info, AlertCircle, CheckCircle, Smartphone, Link as LinkIcon, Copy } from 'lucide-react';

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
    setTimeout(() => setStatusMsg(null), 3000);
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
      showStatus(`${mode === 'load' ? 'נוסף פריט' : 'הופחת פריט'} עבור ${barcode}`);
      return updated;
    });
  };

  const handleJoinDevice = () => {
    if (!joinCode) return;
    p2pSyncService.connectToPeer(
      joinCode, 
      (data) => onUpdateInventory(data),
      (connected) => {
        if (connected) showStatus('מכשירים חוברו וסונכרנו בהצלחה!');
      }
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
      if (lines.length < 2) { showStatus("קובץ CSV לא תקין", 'error'); return; }
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
        showStatus(`קובץ המלאי נטען וסונכרן לכל המכשירים`);
        return nextInventory;
      });
    } catch (err) { showStatus("שגיאה בתהליך טעינת הקובץ", 'error'); }
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
      <div className="flex border-b border-slate-200 bg-white sticky top-0 z-40">
        {(['scan', 'list', 'settings'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-6 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${activeTab === tab ? 'text-[#6b0f24] border-b-4 border-[#6b0f24] bg-slate-50' : 'text-slate-400'}`}>
            {tab === 'scan' && <Search size={20} />}
            {tab === 'list' && <List size={20} />}
            {tab === 'settings' && <Smartphone size={20} />}
            {tab === 'scan' ? 'סריקה ועדכון' : tab === 'list' ? 'ניהול מלאי' : 'חיבור מכשירים'}
          </button>
        ))}
      </div>

      <div className="p-8 flex-1 overflow-y-auto pb-32">
        {activeTab === 'scan' && (
          <div className="space-y-10 animate-in fade-in duration-300 max-w-2xl mx-auto">
            <div className="grid grid-cols-2 gap-4 bg-white p-2 rounded-3xl shadow-lg border border-slate-100">
              <button onClick={() => setMode('load')} className={`flex items-center justify-center gap-3 py-6 rounded-2xl font-black text-lg tracking-wider transition-all ${mode === 'load' ? 'bg-[#6b0f24] text-white shadow-xl' : 'text-slate-500 hover:bg-slate-50'}`}><PlusCircle size={24} /> קליטה</button>
              <button onClick={() => setMode('sell')} className={`flex items-center justify-center gap-3 py-6 rounded-2xl font-black text-lg tracking-wider transition-all ${mode === 'sell' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-50'}`}><MinusCircle size={24} /> מכירה</button>
            </div>
            
            <Scanner onScan={handleScan} placeholder="סרקי ברקוד לעדכון..." autoFocusEnabled={false} />
            
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">פעולות אחרונות שבוצעו</h3>
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" /><span className="text-[10px] font-black text-orange-600 uppercase">סנכרון מקומי פעיל</span></div>
              </div>
              <div className="space-y-3">
                {logs.length > 0 ? logs.map((log, i) => (
                  <div key={i} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border border-slate-100">
                     <div className="flex items-center gap-4">
                       <div className={`p-2 rounded-xl ${log.type === 'load' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                         {log.type === 'load' ? <ArrowUpRight size={20}/> : <ArrowDownRight size={20}/>}
                       </div>
                       <span className="text-xl font-black font-mono text-slate-800 tracking-wider">{log.barcode}</span>
                     </div>
                     <span className="text-xs font-bold text-slate-400">{log.time}</span>
                  </div>
                )) : <p className="text-center py-10 text-slate-300 text-lg font-bold italic">ממתין לסריקת ברקוד...</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'list' && (
          <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <label className="flex flex-col items-center justify-center gap-3 py-10 bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-md cursor-pointer active:scale-95 transition-all group">
                  <UploadCloud className="text-[#6b0f24] group-hover:scale-110 transition-transform" size={40} />
                  <span className="text-sm font-black text-slate-700 uppercase tracking-widest">טעינת מלאי (CSV)</span>
                  <input type="file" className="hidden" accept=".csv" onChange={handleCsvUpload} />
               </label>
               <button onClick={exportToCsv} className="flex flex-col items-center justify-center gap-3 py-10 bg-white border-2 border-slate-100 rounded-[2.5rem] shadow-md active:scale-95 transition-all group">
                  <Download className="text-emerald-600 group-hover:scale-110 transition-transform" size={40} />
                  <span className="text-sm font-black text-slate-700 uppercase tracking-widest">ייצוא מלאי נוכחי</span>
               </button>
            </div>
            <div className="flex items-center justify-between px-4">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">רשימת פריטים</h2>
              <button onClick={() => { if(confirm('האם את בטוחה שברצונך למחוק את כל נתוני המלאי? הפעולה לא ניתנת לביטול.')) onUpdateInventory([]); }} className="text-xs font-black text-rose-400 hover:text-rose-600 uppercase tracking-widest transition-colors flex items-center gap-2"><Trash2 size={16} /> איפוס הכל</button>
            </div>
            <div className="space-y-4">
              {inventory.length === 0 ? (
                <div className="py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                  <Package size={64} className="mx-auto text-slate-100 mb-6" />
                  <p className="text-slate-400 text-lg font-bold">אין פריטים רשומים במערכת</p>
                </div>
              ) : inventory.map((item) => (
                <div key={item.barcode} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-[#6b0f24]/20 transition-all">
                  <div className="flex-1">
                    <p className="font-black text-slate-900 text-xl mb-1">{item.description}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-3 py-1 rounded-lg uppercase border border-slate-200">{item.itemCode}</span>
                      <span className="text-sm text-slate-500 font-bold">{item.colorName} • מידה {item.size} • ברקוד: {item.barcode}</span>
                    </div>
                  </div>
                  <div className={`min-w-[64px] text-center px-4 py-4 rounded-2xl font-black text-2xl transition-all shadow-inner ${item.stock > 0 ? 'bg-[#f7edf0] text-[#6b0f24]' : 'bg-slate-100 text-slate-300'}`}>
                    {item.stock}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8 animate-in fade-in duration-300 max-w-2xl mx-auto">
            <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 text-center shadow-lg">
              <LinkIcon size={64} className="mx-auto text-[#6b0f24] mb-8" />
              <h3 className="text-3xl font-black text-slate-900 mb-3">חיבור מכשיר נוסף</h3>
              <p className="text-slate-500 text-lg font-bold mb-10 tracking-wide">סנכרני טאבלטים ומסכים ברשת המקומית ללא אינטרנט</p>
              
              <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-200 mb-10 group relative">
                <span className="text-xs font-black text-slate-400 block mb-4 uppercase tracking-widest">מזהה מכשיר נוכחי:</span>
                <div className="flex items-center justify-center gap-5">
                   <span className="text-4xl font-black text-[#6b0f24] font-mono tracking-widest uppercase">{storeId}</span>
                   <button onClick={() => { navigator.clipboard.writeText(storeId || ''); showStatus('קוד הועתק ללוח'); }} className="p-3 bg-white rounded-2xl text-slate-400 hover:text-[#6b0f24] transition-all shadow-sm"><Copy size={24} /></button>
                </div>
              </div>

              <div className="space-y-5">
                <input 
                  type="text" 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="הזיני קוד ממכשיר אחר..." 
                  className="w-full p-6 bg-slate-50 border-3 border-slate-100 rounded-[2rem] text-center font-black text-2xl tracking-widest uppercase focus:border-[#6b0f24] transition-all text-slate-800"
                />
                <button onClick={handleJoinDevice} className="w-full py-8 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all uppercase tracking-widest">
                  <Smartphone size={28} />
                  חיבור מכשירים
                </button>
              </div>
            </div>

            <div className="bg-[#6b0f24]/5 border-2 border-[#6b0f24]/10 p-8 rounded-[2.5rem] flex gap-6 items-center">
              <Info className="text-[#6b0f24] shrink-0" size={32} />
              <p className="text-sm font-bold text-[#6b0f24]/80 leading-relaxed">
                טכנולוגיית סנכרון ישיר: כל עדכון מלאי שתבצעי כאן יופיע מיידית בכל המכשירים המחוברים, ללא צורך בענן.
              </p>
            </div>
          </div>
        )}
      </div>

      {statusMsg && (
        <div className={`fixed bottom-10 left-8 right-8 z-50 px-10 py-6 rounded-[2.5rem] shadow-2xl flex items-center justify-center gap-5 animate-in slide-in-from-bottom-8 duration-300 ${statusMsg.type === 'success' ? 'bg-slate-900 text-white' : 'bg-rose-700 text-white'}`}>
          {statusMsg.type === 'success' ? <CheckCircle size={28} className="text-emerald-400" /> : <AlertCircle size={28} />}
          <span className="font-black text-xl tracking-wide">{statusMsg.text}</span>
        </div>
      )}
    </div>
  );
};

export default SellerStation;
