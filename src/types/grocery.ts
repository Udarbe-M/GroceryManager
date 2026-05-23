import type { SupportedCurrencyCode } from '@/utils/currency';

export type GroceryItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  currencyCode: SupportedCurrencyCode;
  detectedCurrencyCode?: SupportedCurrencyCode;
  checked: boolean;
  imageUri?: string;
  recognizedText?: string;
  matchedLine?: string;
};

export type DraftItem = {
  name: string;
  quantity: string;
  price: string;
  detectedCurrencyCode?: SupportedCurrencyCode;
  imageUri?: string;
  recognizedText?: string;
  matchedLine?: string;
};
