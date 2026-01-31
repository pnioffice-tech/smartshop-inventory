
import { supabase } from './supabaseClient';
import { Product } from '../types';

const checkConfig = () => {
  if (!supabase) {
    throw new Error('שירות הענן לא הוגדר. אנא בדוק את הגדרות הסביבה (Supabase URL/Key).');
  }
};

export const cloudService = {
  createStore: async (inventory: Product[]): Promise<string> => {
    checkConfig();
    const storeId = `discreet-${Math.random().toString(36).substring(2, 7)}`;
    if (inventory.length > 0) {
      await cloudService.updateStore(storeId, inventory);
    }
    return storeId;
  },

  updateStore: async (storeId: string, inventory: Product[]): Promise<void> => {
    checkConfig();
    const dataToUpsert = inventory.map(item => ({
      store_id: storeId,
      barcode: item.barcode,
      item_code: item.itemCode,
      description: item.description,
      price: item.price,
      color_code: item.colorCode,
      color_name: item.colorName,
      size: item.size,
      stock: item.stock,
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('inventory')
      .upsert(dataToUpsert, { onConflict: 'store_id, barcode' });

    if (error) {
      console.error('Supabase Upsert Error:', error);
      throw new Error('שגיאה בסנכרון הנתונים');
    }
  },

  fetchStore: async (storeId: string): Promise<Product[]> => {
    checkConfig();
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('store_id', storeId);

    if (error) {
      console.error('Supabase Fetch Error:', error);
      throw new Error('חנות לא נמצאה או בעיית תקשורת');
    }

    return (data || []).map(item => ({
      barcode: item.barcode,
      itemCode: item.item_code,
      description: item.description,
      price: item.price,
      colorCode: item.color_code,
      colorName: item.color_name,
      size: item.size,
      stock: item.stock
    }));
  },

  subscribeToChanges: (storeId: string, onUpdate: () => void) => {
    if (!supabase) return { unsubscribe: () => {} };
    
    return supabase
      .channel(`public:inventory:store_id=eq.${storeId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'inventory',
        filter: `store_id=eq.${storeId}`
      }, onUpdate)
      .subscribe();
  }
};
