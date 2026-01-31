
export interface Product {
  barcode: string;      // A
  itemCode: string;     // B
  description: string;  // C
  price: number;        // D
  colorCode: string;    // E
  colorName: string;    // F
  size: string;         // G
  stock: number;
}

export type AppView = 'customer' | 'seller';
