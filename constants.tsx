
import { Product } from './types';

export const INITIAL_INVENTORY: Product[] = [
  {
    barcode: "100101",
    itemCode: "SHIRT-99",
    description: "חולצת כפתורים פשתן",
    price: 120,
    colorCode: "10",
    colorName: "לבן",
    size: "S",
    stock: 5
  },
  {
    barcode: "100102",
    itemCode: "SHIRT-99",
    description: "חולצת כפתורים פשתן",
    price: 120,
    colorCode: "10",
    colorName: "לבן",
    size: "M",
    stock: 2
  },
  {
    barcode: "100103",
    itemCode: "SHIRT-99",
    description: "חולצת כפתורים פשתן",
    price: 120,
    colorCode: "20",
    colorName: "כחול",
    size: "L",
    stock: 1
  }
];
