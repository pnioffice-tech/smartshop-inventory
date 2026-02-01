
import React, { useState } from 'react';
import { Product } from '../types';
import Scanner from './Scanner';
import { p2pSyncService } from '../services/p2pSyncService';
import { PlusCircle, MinusCircle, List, Trash2, ArrowUpRight, ArrowDownRight, UploadCloud, Download, Search, Package, Info, AlertCircle, CheckCircle, Smartphone, Link as LinkIcon, Copy, Loader2 } from 'lucide-react';

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
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const handleScan = (barcode: string) => {
    onUpdateInventory((prevInventory) => {
      const existingIndex = prevInventory.findIndex(p => p.barcode === barcode);
      if (existingIndex === -1) {
        showStatus(`הברקוד ${barcode} לא נמצא`, 'error');
        return prevInventory;
      }
      const updated = [...prevInventory];
      const p = { ...updated[existingIndex] };
      const delta = mode === 'load' ? 1 : -1;
      p.stock = Math.max(0, (p.stock || 0) + delta);
      updated[existingIndex] = p;
      setLogs(prev => [{ barcode, type: mode, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 5)]);
      showStatus(`${mode === 'load' ? 'נוסף 1' : 'הופחת 1'} לברקוד ${barcode}`);
      return updated;
    });
  };

  const handleJoinDevice = () => {
    const code = joinCode.trim();
    if (!code || code === storeId) {
      showStatus('הזיני קוד תקין של מכשיר אחר', 'error');
      return;
    }
    
    setIsConnecting(true);
    showStatus('מתחבר למכשיר...', 'info');
    
    p2pSyncService.connectToPeer(
      code, 
      (data) => onUpdateInventory(data),
      (connected) => {
        setIsConnecting(false);
        if (connected) {
          showStatus('מכשירים חוברו וסונכרנו!');
          setJoinCode('');
        } else {
          showStatus('לא הצלחנו להתחבר. בדקי שהקוד נכון והמכשיר השני דולק.', 'error');
        }
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
      if (lines.length < 2) { showStatus("הקובץ ריק או לא תקין", 'error'); return; }
      
      const delimiter = lines[0].includes(';') ? ';' : ',';
      
      onUpdateInventory((prev) => {
        const nextInventory = [...prev];
        let addedCount = 0;
        let updatedCount = 0;

        lines.slice(1).forEach((line) => {
          const parts = line.split(delimiter).map(p => p.replace(/^"|"$/g, '').trim());
          
          // Check for at least 8 columns (A-H)
          if (parts.length >= 8) {
            const barcode = parts[0];
            const itemCode = parts[1];
            const description = parts[2];
            const price = parseFloat(parts[3].replace(/[^\d.]/g, '')) || 0;
            const colorCode = parts[4];
            const colorName = parts[5];
            const size = parts[6];
            // Column H is index 7
            const stock = parseInt(parts[7].replace(/[^\d-]/g, '')) || 0;

            const existingIdx = nextInventory.findIndex(item => item.barcode === barcode);
            
            const productData: Product = {
              barcode,
              itemCode,
              description,
              price,
              colorCode,
              colorName,
              size,
              stock
            };

            if (existingIdx !== -1) {
              nextInventory[existingIdx] = productData;
              updatedCount++;
            } else {
              nextInventory.push(productData);
              addedCount++;
            }
          }
        });
        
        showStatus(`ייבוא הושלם: ${addedCount} חדשים, ${updatedCount} עודכנו`);
        return nextInventory;
      });
    } catch (err) { 
      console.error(err);
      showStatus("שגיאה בטעינת הקובץ", 'error'); 
    }
    e.target.value = '';
  };

  const exportToCsv = () => {
    if (inventory.length === 0) { showStatus("המלאי ריק", 'error'); return; }
    const headers = ["Barcode", "ItemCode", "Description", "Price", "ColorCode", "ColorName", "Size", "Stock"];
    const rows = inventory.map(item => [
      item.barcode, 
      item.itemCode, 
      item.description, 
      item.price, 
      item.colorCode, 
      item.colorName, 
      item.size, 
      item.stock
    ]);
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
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-8 text-xl font-black uppercase tracking-widest flex items-center justify-center gap-4 transition-all ${activeTab === tab ? 'text-[#6b0f24] border-b-8 border-[#6b0f24] bg-slate-50' : 'text-slate-400'}`}>
            {tab === 'scan' && <Search size={32} />}
            {tab === 'list' && <List size={32} />}
            {tab === 'settings' && <Smartphone size={32} />}
            {tab === 'scan' ? 'סריקה' : tab === 'list' ? 'רשימה' : 'חיבור'}
          </button>
        ))}
      </div>

      <div className="p-10 flex-1 overflow-y-auto pb-40">
        {activeTab === 'scan' && (
          <div className="space-y-12 animate-in fade-in duration-300 max-w-3xl mx-auto">
            <div className="grid grid-cols-2 gap-8 bg-white p-4 rounded-[3rem] shadow-xl border-2 border-slate-100">
              <button onClick={() => setMode('load')} className={`flex items-center justify-center gap-6 py-10 rounded-[2.5rem] font-black text-3xl transition-all ${mode === 'load' ? 'bg-[#6b0f24] text-white shadow-2xl scale-105' : 'text-slate-500 hover:bg-slate-50'}`}><PlusCircle size={40} /> קליטה</button>
              <button onClick={() => setMode('sell')} className={`flex items-center justify-center gap-6 py-10 rounded-[2.5rem] font-black text-3xl transition-all ${mode === 'sell' ? 'bg-slate-900 text-white shadow-2xl scale-105' : 'text-slate-500 hover:bg-slate-50'}`}><MinusCircle size={40} /> מכירה</button>
            </div>
            
            <Scanner onScan={handleScan} placeholder="סריקת ברקוד לעדכון..." autoFocusEnabled={false} />
            
            <div className="bg-white rounded-[4rem] p-12 border-2 border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">פעולות אחרונות</h3>
                <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-orange-400 animate-pulse" /><span className="text-sm font-black text-orange-600 uppercase">סנכרון פעיל</span></div>
              </div>
              <div className="space-y-6">
                {logs.length > 0 ? logs.map((log, i) => (
                  <div key={i} className="flex justify-between items-center p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100">
                     <div className="flex items-center gap-8">
                       <div className={`p-4 rounded-2xl ${log.type === 'load' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                         {log.type === 'load' ? <ArrowUpRight size={36}/> : <ArrowDownRight size={36}/>}
                       </div>
                       <span className="text-4xl font-black font-mono text-slate-800 tracking-wider">{log.barcode}</span>
                     </div>
                     <span className="text-lg font-bold text-slate-400">{log.time}</span>
                  </div>
                )) : <p className="text-center py-20 text-slate-300 text-3xl font-bold italic">ממתין לסריקה ראשונה...</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'list' && (
          <div className="space-y-12 animate-in fade-in duration-300 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               <label className="flex flex-col items-center justify-center gap-6 py-16 bg-white border-4 border-slate-100 rounded-[4rem] shadow-lg cursor-pointer active:scale-95 transition-all group hover:border-[#6b0f24]/30">
                  <UploadCloud className="text-[#6b0f24] group-hover:scale-110 transition-transform" size={80} />
                  <span className="text-2xl font-black text-slate-700 uppercase tracking-widest">טעינת מלאי (CSV)</span>
                  <input type="file" className="hidden" accept=".csv" onChange={handleCsvUpload} />
               </label>
               <button onClick={exportToCsv} className="flex flex-col items-center justify-center gap-6 py-16 bg-white border-4 border-slate-100 rounded-[4rem] shadow-lg active:scale-95 transition-all group hover:border-emerald-200">
                  <Download className="text-emerald-600 group-hover:scale-110 transition-transform" size={80} />
                  <span className="text-2xl font-black text-slate-700 uppercase tracking-widest">הורדת קובץ מלאי</span>
               </button>
            </div>
            <div className="flex items-center justify-between px-8">
              <h2 className="text-5xl font-black text-slate-900 tracking-tight">ניהול פריטים ({inventory.length})</h2>
              <button onClick={() => { if(confirm('למחוק הכל?')) onUpdateInventory([]); }} className="text-lg font-black text-rose-400 hover:text-rose-600 uppercase tracking-widest flex items-center gap-4"><Trash2 size={24} /> איפוס כל המלאי</button>
            </div>
            <div className="space-y-8">
              {inventory.length === 0 ? (
                <div className="py-40 text-center bg-white rounded-[5rem] border-4 border-dashed border-slate-100">
                  <Package size={120} className="mx-auto text-slate-100 mb-10" />
                  <p className="text-slate-400 text-3xl font-bold">אין נתונים להצגה</p>
                </div>
              ) : inventory.map((item) => (
                <div key={item.barcode} className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-100 shadow-sm flex items-center justify-between group hover:border-[#6b0f24]/20 transition-all">
                  <div className="flex-1">
                    <p className="font-black text-slate-900 text-4xl mb-3">{item.description}</p>
                    <div className="flex flex-wrap items-center gap-6">
                      <span className="bg-slate-100 text-slate-600 text-sm font-black px-6 py-2.5 rounded-2xl uppercase border-2 border-slate-200">דגם {item.itemCode}</span>
                      <span className="text-2xl text-slate-500 font-bold">{item.colorName} • מידה {item.size} • {item.barcode}</span>
                    </div>
                  </div>
                  <div className={`min-w-[120px] text-center px-8 py-8 rounded-[2.5rem] font-black text-5xl transition-all shadow-inner border-4 ${item.stock > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
                    {item.stock}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-12 animate-in fade-in duration-300 max-w-4xl mx-auto">
            <div className="bg-white p-16 rounded-[5rem] border-4 border-slate-100 text-center shadow-2xl">
              <LinkIcon size={100} className="mx-auto text-[#6b0f24] mb-12" />
              <h3 className="text-5xl font-black text-slate-900 mb-6">חיבור מכשירים</h3>
              <p className="text-slate-500 text-2xl font-bold mb-16 tracking-wide">הזיני את הקוד שמופיע בטאבלט השני כדי לסנכרן ביניהם</p>
              
              <div className="bg-slate-50 p-12 rounded-[4rem] border-4 border-slate-200 mb-16 group relative">
                <span className="text-sm font-black text-slate-400 block mb-8 uppercase tracking-widest">הקוד של המכשיר הזה:</span>
                <div className="flex items-center justify-center gap-8">
                   <span className="text-6xl font-black text-[#6b0f24] font-mono tracking-[0.2em] uppercase">{storeId}</span>
                   <button onClick={() => { navigator.clipboard.writeText(storeId || ''); showStatus('הקוד הועתק ללוח'); }} className="p-5 bg-white rounded-3xl text-slate-400 hover:text-[#6b0f24] transition-all shadow-md"><Copy size={40} /></button>
                </div>
              </div>

              <div className="space-y-8">
                <input 
                  type="text" 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="הזיני קוד ממכשיר אחר..." 
                  className="w-full p-10 bg-slate-50 border-4 border-slate-100 rounded-[3rem] text-center font-black text-4xl tracking-[0.1em] uppercase focus:border-[#6b0f24] transition-all text-slate-800 shadow-inner"
                />
                <button 
                  onClick={handleJoinDevice} 
                  disabled={isConnecting}
                  className={`w-full py-12 rounded-[3rem] font-black text-3xl shadow-2xl flex items-center justify-center gap-6 active:scale-95 transition-all uppercase tracking-widest ${isConnecting ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-black'}`}
                >
                  {isConnecting ? <Loader2 className="animate-spin" size={44} /> : <Smartphone size={44} />}
                  {isConnecting ? 'מתחבר...' : 'חברי מכשירים'}
                </button>
              </div>
            </div>

            <div className="bg-[#6b0f24]/5 border-4 border-[#6b0f24]/10 p-12 rounded-[4rem] flex gap-10 items-center">
              <Info className="text-[#6b0f24] shrink-0" size={56} />
              <p className="text-xl font-bold text-[#6b0f24]/80 leading-relaxed">
                סנכרון חכם: כל פריט שיימכר או ייקלט כאן יתעדכן מיידית בכל שאר המסכים בחנות.
              </p>
            </div>
          </div>
        )}
      </div>

      {statusMsg && (
        <div className={`fixed bottom-12 left-10 right-10 z-[110] px-14 py-10 rounded-[4rem] shadow-[0_60px_150px_rgba(0,0,0,0.4)] flex items-center justify-center gap-8 animate-in slide-in-from-bottom-12 duration-300 ${
          statusMsg.type === 'success' ? 'bg-slate-900 text-white' : 
          statusMsg.type === 'error' ? 'bg-rose-800 text-white' : 
          'bg-[#6b0f24] text-white'
        } border-4 border-white/10`}>
          {statusMsg.type === 'success' && <CheckCircle size={44} className="text-emerald-400" />}
          {statusMsg.type === 'error' && <AlertCircle size={44} />}
          {statusMsg.type === 'info' && <Loader2 size={44} className="animate-spin" />}
          <span className="font-black text-3xl tracking-wide">{statusMsg.text}</span>
        </div>
      )}
    </div>
  );
};

export default SellerStation;
