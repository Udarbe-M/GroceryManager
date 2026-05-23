import Constants from 'expo-constants';

import type { SupportedCurrencyCode } from '@/utils/currency';
import { scanPriceWithOCRSpace } from '@/utils/ocr-space';
import { extractPriceCandidates } from '@/utils/price-parser';

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

function shouldUseCloudOCR(mode: OCRMode) {
  if (mode === 'cloud') {
    return true;
  }

  if (mode === 'native') {
    return false;
  }

  return Constants.appOwnership === 'expo';
}

export async function scanPriceFromImage(
  uri: string,
  options: ScanPriceOptions = {},
): Promise<OCRScanResult> {
  const mode = options.mode ?? 'auto';

  if (shouldUseCloudOCR(mode)) {
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

  // Load the native OCR module only when we actually need it.
  const module = await import('@infinitered/react-native-mlkit-text-recognition');
  const result = await module.recognizeText(uri);
  const { bestCandidate, candidates, cleanedText, detectedCurrencyCode } = extractPriceCandidates(
    result.text,
  );

  return {
    supported: true,
    message: 'Scanned with on-device ML Kit OCR.',
    text: cleanedText,
    bestPrice: bestCandidate?.value,
    detectedCurrencyCode: bestCandidate?.currencyCode ?? detectedCurrencyCode,
    matchedLine: bestCandidate?.line,
    candidates: candidates.map((candidate) => candidate.value),
  };
}
