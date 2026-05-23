import type { SupportedCurrencyCode } from '@/utils/currency';
import { scanPriceWithOCRSpace } from '@/utils/ocr-space';

export type OCRScanResult = {
  supported: boolean;
  message?: string;
  text: string;
  bestPrice?: number;
  detectedCurrencyCode?: SupportedCurrencyCode;
  matchedLine?: string;
  candidates: number[];
};

export type OCRMode = 'auto' | 'cloud' | 'native';

type ScanPriceOptions = {
  cloudApiKey?: string;
  mode?: OCRMode;
};

export async function scanPriceFromImage(
  uri: string,
  options: ScanPriceOptions = {},
): Promise<OCRScanResult> {
  const apiKey = options.cloudApiKey?.trim();

  if (!apiKey) {
    return {
      supported: false,
      message:
        'Cloud OCR is selected, but no OCR API key is configured. Add one in the OCR settings first.',
      text: '',
      candidates: [],
    };
  }

  const result = await scanPriceWithOCRSpace(uri, apiKey);

  return {
    supported: true,
    message:
      apiKey === 'helloworld'
        ? 'Scanned with the OCR.space demo key. Add your own key in settings for better reliability.'
        : 'Scanned with cloud OCR.',
    text: result.text,
    bestPrice: result.bestPrice,
    detectedCurrencyCode: result.detectedCurrencyCode,
    matchedLine: result.matchedLine,
    candidates: result.candidates,
  };
}
