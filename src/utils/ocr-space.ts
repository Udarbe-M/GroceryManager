import type { SupportedCurrencyCode } from '@/utils/currency';
import { extractPriceCandidates } from '@/utils/price-parser';

export type OCRSpaceResult = {
  text: string;
  bestPrice?: number;
  detectedCurrencyCode?: SupportedCurrencyCode;
  matchedLine?: string;
  candidates: number[];
};

type OCRSpaceResponse = {
  OCRExitCode?: number;
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[] | null;
  ErrorDetails?: string | null;
  ParsedResults?: {
    ParsedText?: string;
    ErrorMessage?: string | string[];
  }[];
};

function getErrorMessage(payload: OCRSpaceResponse) {
  if (Array.isArray(payload.ErrorMessage)) {
    return payload.ErrorMessage.join(', ');
  }

  if (typeof payload.ErrorMessage === 'string' && payload.ErrorMessage.length > 0) {
    return payload.ErrorMessage;
  }

  if (payload.ErrorDetails) {
    return payload.ErrorDetails;
  }

  return 'Cloud OCR failed to process the image.';
}

export async function scanPriceWithOCRSpace(
  uri: string,
  apiKey: string,
): Promise<OCRSpaceResult> {
  const formData = new FormData();
  formData.append('language', 'eng');
  formData.append('OCREngine', '2');
  formData.append('isOverlayRequired', 'false');
  formData.append('scale', 'true');
  formData.append('detectOrientation', 'true');
  formData.append('file', {
    uri,
    name: 'shelf-price.jpg',
    type: 'image/jpeg',
  } as never);

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: {
      apikey: apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Cloud OCR request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as OCRSpaceResponse;

  if (payload.IsErroredOnProcessing) {
    throw new Error(getErrorMessage(payload));
  }

  const text = payload.ParsedResults?.map((result) => result.ParsedText ?? '').join('\n') ?? '';

  if (!text.trim()) {
    return {
      text: '',
      candidates: [],
    };
  }

  const { bestCandidate, candidates, cleanedText, detectedCurrencyCode } = extractPriceCandidates(
    text,
  );

  return {
    text: cleanedText,
    bestPrice: bestCandidate?.value,
    detectedCurrencyCode: bestCandidate?.currencyCode ?? detectedCurrencyCode,
    matchedLine: bestCandidate?.line,
    candidates: candidates.map((candidate) => candidate.value),
  };
}
