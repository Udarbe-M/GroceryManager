import { detectCurrencyCode, formatCurrencyValue, type SupportedCurrencyCode } from '@/utils/currency';

export type PriceCandidate = {
  raw: string;
  line: string;
  value: number;
  score: number;
  currencyCode?: SupportedCurrencyCode;
};

const CURRENCY_PATTERN =
  /(?:\$|USD|PHP|₱|EUR|€|GBP|£|AUD|CAD|SGD|HKD|RM|MYR|JPY|¥|Rs\.?|INR)\s*(\d{1,4}(?:[.,]\d{2})?)/gi;
const DECIMAL_PATTERN = /\b(\d{1,4}[.,]\d{2})\b/g;
const WHOLE_PATTERN = /\b(\d{1,4})\b/g;

function normalizeAmount(input: string) {
  const normalized = input.trim();
  const decimalCommaValue =
    normalized.includes(',') && !normalized.includes('.') && /,\d{2}\b/.test(normalized)
      ? normalized.replace(',', '.')
      : normalized.replace(/,/g, '');
  const value = Number.parseFloat(decimalCommaValue);
  return Number.isFinite(value) ? value : null;
}

function scoreCandidate(raw: string, line: string, value: number) {
  let score = 0;
  const loweredLine = line.toLowerCase();

  if (/[₱$€£¥]/.test(raw) || /(usd|php|eur|gbp|aud|cad|sgd|hkd|myr|inr|jpy)/i.test(raw)) {
    score += 6;
  }

  if (/[.,]\d{2}\b/.test(raw)) {
    score += 5;
  }

  if (/(price|sale|member|promo|only|each|ea|total)/.test(loweredLine)) {
    score += 3;
  }

  if (value >= 0.5 && value <= 500) {
    score += 3;
  } else if (value > 5000 || value <= 0) {
    score -= 5;
  }

  if (/(kg|g|oz|lb|qty|x\d)/.test(loweredLine)) {
    score -= 1;
  }

  return score;
}

function pushMatches(matches: PriceCandidate[], line: string, pattern: RegExp) {
  let result: RegExpExecArray | null = pattern.exec(line);

  while (result) {
    const raw = result[0]?.trim() ?? '';
    const numericText = result[1] ?? result[0];
    const value = normalizeAmount(numericText);

    if (value !== null) {
      matches.push({
        raw,
        line: line.trim(),
        value,
        score: scoreCandidate(raw, line, value),
        currencyCode: detectCurrencyCode(raw) ?? detectCurrencyCode(line),
      });
    }

    result = pattern.exec(line);
  }
}

export function extractPriceCandidates(text: string) {
  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const matches: PriceCandidate[] = [];

  for (const line of lines) {
    pushMatches(matches, line, new RegExp(CURRENCY_PATTERN));
    pushMatches(matches, line, new RegExp(DECIMAL_PATTERN));
  }

  if (matches.length === 0) {
    for (const line of lines) {
      pushMatches(matches, line, new RegExp(WHOLE_PATTERN));
    }
  }

  const uniqueMatches = matches.filter(
    (candidate, index, collection) =>
      collection.findIndex(
        (entry) => entry.value === candidate.value && entry.line === candidate.line,
      ) === index,
  );

  uniqueMatches.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    if (right.value !== left.value) {
      return right.value - left.value;
    }

    return right.raw.length - left.raw.length;
  });

  return {
    bestCandidate: uniqueMatches[0],
    candidates: uniqueMatches.slice(0, 5),
    cleanedText: lines.join('\n'),
    detectedCurrencyCode:
      uniqueMatches.find((candidate) => candidate.currencyCode)?.currencyCode ??
      detectCurrencyCode(lines.join('\n')),
  };
}

export function formatCurrency(value: number, currencyCode: SupportedCurrencyCode) {
  return formatCurrencyValue(value, currencyCode);
}
