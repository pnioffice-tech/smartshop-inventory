
import React, { useState } from 'react';
import { Product } from '../types';
import Scanner from './Scanner';
import { cloudService } from '../services/cloudService';
// Fix: Added missing 'Package' icon to the imports from lucide-react.
import { PlusCircle, MinusCircle, List, Trash2, ArrowUpRight, ArrowDownRight, UploadCloud, Download, Database, CheckCircle, AlertCircle, Search, Cloud, Share2, Copy, RefreshCw, LogIn, Info, Globe, Package } from 'lucide-react';

interface SellerStationProps {
  inventory: Product[];
  onUpdateInventory: (updated: Product[] | ((prev: Product[]) => Product[])) => void;
  storeId: string | null;
  onSetStoreId: (id: string | null) => void;
}

const SellerStation: React.FC<SellerStationProps> = ({ inventory, onUpdateInventory, storeId, onSetStoreId }) => {
  const [activeTab, setActiveTab] = useState<'scan' | 'list' | 'cloud'>('scan');
  const [mode, setMode] = useState<'load' | 'sell'>('load');
  const [logs, setLogs] = useState<{barcode: string, type: string, time: string}[]>([]);
  const [statusMsg, setStatusMsg] = useState<{text: string, type: 'success' | 'error'} | null>(null);
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [inputStoreId, setInputStoreId] = useState('');

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleScan = (barcode: string) => {
    onUpdateInventory((prevInventory) => {
      const existingIndex = prevInventory.findIndex(p => p.barcode === barcode);
      if (existingIndex === -1) {
        showStatus(`ברקוד ${barcode} לא נמצא`, 'error');
        return prevInventory;
      }
      const updated = [...prevInventory];
      const p = { ...updated[existingIndex] };
      const delta = mode === 'load' ? 1 : -1;
      p.stock = Math.max(0, (p.stock || 0) + delta);
      updated[existingIndex] = p;
      setLogs(prev => [{ barcode, type: mode, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 3)]);
      showStatus(`${mode === 'load' ? 'עודכן מלאי' : 'הופחת מלאי'} עבור ${barcode}`);
      return updated;
    });
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
        showStatus(`נתוני המלאי עודכנו בהצלחה`);
        return nextInventory;
      });
    } catch (err) { showStatus("שגיאה בקריאת הקובץ", 'error'); }
    e.target.value = '';
  };

  const exportToCsv = () => {
    if (inventory.length === 0) { showStatus("אין נתונים", 'error'); return; }
    const headers = ["Barcode", "ItemCode", "Description", "Price", "ColorCode", "ColorName", "Size", "Stock"];
    const rows = inventory.map(item => [item.barcode, item.itemCode, item.description, item.price, item.colorCode, item.colorName, item.size, item.stock]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `discreet_stock.csv`;
    link.click();
  };

  const handleCreateCloudStore = async () => {
    setIsCloudLoading(true);
    try {
      const newId = await cloudService.createStore(inventory);
      onSetStoreId(newId);
      showStatus('חנות ענן נוצרה בהצלחה!');
      setActiveTab('scan');
    } catch (e: any) { showStatus(e.message, 'error'); }
    finally { setIsCloudLoading(false); }
  };

  const handleConnectStore = async () => {
    if (!inputStoreId) return;
    setIsCloudLoading(true);
    try {
      const data = await cloudService.fetchStore(inputStoreId);
      onUpdateInventory(data);
      onSetStoreId(inputStoreId);
      showStatus('מחובר לענן Discreet!');
      setActiveTab('scan');
    } catch (e: any) { showStatus(e.message, 'error'); }
    finally { setIsCloudLoading(false); }
  };

  return (
    <div className="flex flex-col h-full bg-[#fdfcfb] relative">
      <div className="flex border-b border-slate-100 bg-white">
        {(['scan', 'list', 'cloud'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.25em] flex items-center justify-center gap-2 transition-all ${activeTab === tab ? 'text-[#6b0f24] border-b-2 border-[#6b0f24]' : 'text-slate-300'}`}>
            {tab === 'scan' && <Search size={14} />}
            {tab === 'list' && <List size={14} />}
            {tab === 'cloud' && <Cloud size={14} />}
            {tab === 'scan' ? 'סריקה' : tab === 'list' ? 'רשימה' : 'ענן'}
          </button>
        ))}
      </div>

      <div className="p-6 flex-1 overflow-y-auto pb-24">
        {activeTab === 'scan' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-2 gap-3 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
              <button onClick={() => setMode('load')} className={`flex items-center justify-center gap-2 py-4 rounded-xl font-black text-xs tracking-widest transition-all ${mode === 'load' ? 'bg-[#6b0f24] text-white shadow-lg' : 'text-slate-400'}`}><PlusCircle size={16} /> קליטה</button>
              <button onClick={() => setMode('sell')} className={`flex items-center justify-center gap-2 py-4 rounded-xl font-black text-xs tracking-widest transition-all ${mode === 'sell' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}><MinusCircle size={16} /> מכירה</button>
            </div>
            
            <Scanner onScan={handleScan} placeholder="הזיני ברקוד ידנית או סרקי..." autoFocusEnabled={false} />
            
            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">פעולות אחרונות</h3>
                {storeId && <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[8px] font-black text-emerald-600 uppercase">מסונכרן</span></div>}
              </div>
              <div className="space-y-2.5">
                {logs.length > 0 ? logs.map((log, i) => (
                  <div key={i} className="flex justify-between items-center p-3.5 bg-slate-50 rounded-xl">
                     <div className="flex items-center gap-3">
                       <div className={`p-1 rounded ${log.type === 'load' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                         {log.type === 'load' ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                       </div>
                       <span className="text-xs font-black font-mono text-slate-700 tracking-tighter">{log.barcode}</span>
                     </div>
                     <span className="text-[10px] font-bold text-slate-300">{log.time}</span>
                  </div>
                )) : <p className="text-center py-6 text-slate-200 text-xs font-bold italic">מוכנה לסריקה...</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'list' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-2 gap-4">
               <label className="flex flex-col items-center justify-center gap-2 py-6 bg-white border border-slate-100 rounded-3xl shadow-sm cursor-pointer active:scale-95 transition-all group">
                  <UploadCloud className="text-[#6b0f24] group-hover:scale-110 transition-transform" size={24} />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ייבוא CSV</span>
                  <input type="file" className="hidden" accept=".csv" onChange={handleCsvUpload} />
               </label>
               <button onClick={exportToCsv} className="flex flex-col items-center justify-center gap-2 py-6 bg-white border border-slate-100 rounded-3xl shadow-sm active:scale-95 transition-all group">
                  <Download className="text-emerald-600 group-hover:scale-110 transition-transform" size={24} />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ייצוא מלאי</span>
               </button>
            </div>
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tighter">ניהול מלאי</h2>
              <button onClick={() => { if(confirm('למחוק את כל הנתונים?')) onUpdateInventory([]); }} className="text-[10px] font-black text-rose-300 hover:text-rose-500 uppercase tracking-widest transition-colors"><Trash2 size={12} className="inline mr-1" /> Reset</button>
            </div>
            <div className="space-y-3">
              {inventory.length === 0 ? (
                <div className="py-20 text-center">
                  <Package size={40} className="mx-auto text-slate-100 mb-4" />
                  <p className="text-slate-300 text-xs font-bold">אין פריטים במלאי</p>
                </div>
              ) : inventory.map((item) => (
                <div key={item.barcode} className="bg-white p-4 rounded-2xl border border-slate-50 shadow-sm flex items-center justify-between group">
                  <div className="flex-1">
                    <p className="font-black text-slate-900 text-sm mb-1">{item.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-50 text-slate-400 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">{item.itemCode}</span>
                      <span className="text-[10px] text-slate-300 font-bold">{item.colorName} • {item.size}</span>
                    </div>
                  </div>
                  <div className={`min-w-[44px] text-center px-2 py-2.5 rounded-xl font-black text-sm transition-all ${item.stock > 0 ? 'bg-[#f7edf0] text-[#6b0f24]' : 'bg-slate-50 text-slate-300'}`}>
                    {item.stock}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'cloud' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-3xl flex gap-4">
              <Globe className="text-emerald-600 shrink-0" size={20} />
              <div className="flex flex-col gap-1">
                <span className="font-black text-[10px] text-emerald-800 uppercase tracking-widest">סינכרון אוטומטי פעיל</span>
                <p className="text-[11px] font-bold text-emerald-700/80 leading-relaxed">
                  כל שינוי במלאי מעדכן מיידית את כל המכשירים המחוברים לאותו קוד חנות. אין צורך בלחיצה ידנית לשמירה.
                </p>
              </div>
            </div>

            {!storeId ? (
              <div className="space-y-6">
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm text-center">
                  <Cloud size={48} className="mx-auto text-[#f7edf0] mb-5" />
                  <h3 className="text-xl font-black text-slate-900 mb-2">סינכרון ענן Discreet</h3>
                  <p className="text-slate-400 text-xs font-bold mb-8">חברי מכשירים נוספים ונהלי מלאי בזמן אמת</p>
                  <button onClick={handleCreateCloudStore} disabled={isCloudLoading} className="w-full py-5 bg-[#6b0f24] text-white rounded-[2rem] font-black shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all uppercase tracking-widest">{isCloudLoading ? <RefreshCw size={20} className="animate-spin" /> : <Share2 size={20} />}יצירת חנות ענן</button>
                </div>
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                  <input type="text" value={inputStoreId} onChange={(e) => setInputStoreId(e.target.value)} placeholder="הזיני קוד חנות קיים..." className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl text-center font-black mb-5 tracking-widest uppercase focus:border-[#6b0f24] transition-all" />
                  <button onClick={handleConnectStore} disabled={isCloudLoading || !inputStoreId} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 uppercase tracking-widest"><LogIn size={20} /> התחברות לקוד</button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white p-10 rounded-[3rem] border border-emerald-50 shadow-sm text-center">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle size={32} /></div>
                  <h3 className="text-lg font-black text-slate-900 mb-1">מחובר לענן</h3>
                  <p className="text-slate-400 text-xs font-bold mb-6">מכשירים אחרים יכולים להתחבר בעזרת הקוד:</p>
                  <div className="flex items-center justify-center gap-3 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <span className="text-2xl font-black text-[#6b0f24] font-mono tracking-[0.2em]">{storeId}</span>
                    <button onClick={() => { navigator.clipboard.writeText(storeId); showStatus('הקוד הועתק'); }} className="p-2 text-slate-300 hover:text-[#6b0f24] transition-colors"><Copy size={18} /></button>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">מצב סנכרון: חי</span>
                  </div>
                  <button onClick={() => onSetStoreId(storeId)} className="text-slate-300 hover:text-[#6b0f24] transition-colors"><RefreshCw size={16} /></button>
                </div>
                <button onClick={() => { if(confirm('להתנתק מחנות הענן? הנתונים יישארו שמורים מקומית.')) onSetStoreId(null); }} className="w-full py-5 text-slate-300 font-black uppercase tracking-widest hover:text-rose-500 transition-colors">ניתוק חנות ענן</button>
              </div>
            )}
          </div>
        )}
      </div>

      {statusMsg && (
        <div className={`fixed bottom-8 left-6 right-6 z-50 px-8 py-5 rounded-[2rem] shadow-2xl flex items-center justify-center gap-4 animate-in slide-in-from-bottom-6 duration-300 ${statusMsg.type === 'success' ? 'bg-slate-900 text-white' : 'bg-rose-600 text-white'}`}>
          {statusMsg.type === 'success' ? <CheckCircle size={20} className="text-emerald-400" /> : <AlertCircle size={20} />}
          <span className="font-black text-sm tracking-wide">{statusMsg.text}</span>
        </div>
      )}
    </div>
  );
};

export default SellerStation;
